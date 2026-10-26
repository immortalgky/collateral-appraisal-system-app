import { useCallback, useEffect, useRef, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ZodIssue, ZodTypeAny } from 'zod';
import { buildConditionalRefinement } from '../schemaBuilder';
import type { FormField } from '../types';
import { humanizeFieldLabel } from '../utils';
import { collectFieldLabels, collectSchemaIssues } from './collectIssues';
import type { MissingFieldsItem, MissingFieldsSummary } from './types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

/** Section id of the fields that sit outside every titled section. */
export const OTHER_SECTION_ID = 'missing-other';

const DEBOUNCE_MS = 300;

const isIndex = (part: string) => /^\d+$/.test(part);
const stripIndexes = (path: string) =>
  path
    .split('.')
    .filter(part => !isIndex(part))
    .join('.');

/** The field wrapper that owns `node`: the nearest `[data-field]` above it. */
const ownedBy = (node: Element, field: Element) => node.closest('[data-field]') === field;

const clean = (text: string | null | undefined) => (text ?? '').replace(/\s+/g, ' ').trim();

// What makes a cell's text a row name: not a cell that holds a control (its text is a placeholder).
const CONTROL = 'input,select,textarea,[aria-haspopup]';

/** The first line of a header or row cell: a header often stacks a name over a sub-line. */
const firstLine = (cell: Element) =>
  clean((cell.children.length > 1 ? cell.children[0] : cell).textContent);

/** The header cells above column `col` of a table, outermost first, each once (rowSpan/colSpan aware). */
function columnHeads(table: HTMLTableElement, col: number): Element[] {
  const rows = table.tHead
    ? Array.from(table.rows).filter(row => table.tHead?.contains(row)) // happy-dom has no tHead.rows
    : Array.from(table.rows).filter(row => Array.from(row.cells).every(c => c.tagName === 'TH'));
  const grid: Element[][] = rows.map(() => []);
  rows.forEach((row, r) => {
    let c = 0;
    for (const cell of Array.from(row.cells)) {
      while (grid[r][c]) c++;
      for (let dr = 0; dr < cell.rowSpan; dr++) {
        for (let dc = 0; dc < cell.colSpan; dc++) if (grid[r + dr]) grid[r + dr][c + dc] = cell;
      }
      c += cell.colSpan;
    }
  });
  const seen = new Set<Element>();
  return grid.map(row => row[col]).filter(cell => cell && !seen.has(cell) && seen.add(cell));
}

/**
 * A pricing-grid control draws no label of its own, so it is named by where it sits: the visible
 * first cell of its row plus the column header(s) above it ("ทำเล · ตลาด A · คะแนน"), or for a
 * `kv` / rail row (`data-label-row`) the row's label. Null when the page gives nothing to go on.
 */
function gridLabelOf(el: Element): string | null {
  const cell = el.closest('td,th');
  const table = cell?.closest('table');
  if (cell && table) {
    const row = cell.parentElement as HTMLTableRowElement;
    let col = 0;
    for (const c of Array.from(row.cells)) {
      if (c === cell) break;
      col += c.colSpan;
    }
    const head = row.cells[0];
    const rowName = head && head !== cell && !head.querySelector(CONTROL) ? firstLine(head) : '';
    const heads = columnHeads(table as HTMLTableElement, col).map(firstLine);
    return [rowName, ...heads].filter(Boolean).join(' · ') || null;
  }
  const labelled = el.closest('[data-label-row]')?.firstElementChild;
  return clean(labelled?.textContent).replace(/\s*\*$/, '') || null;
}

/**
 * The translated label a field draws for itself. In order: `data-field-label`, `aria-label`, its
 * `<label>` (or for a group of controls the element that names the group), then, for a bare grid
 * control, where it sits (`gridLabelOf`). Read from the DOM because that is the text the user sees
 * (the field configs carry the English one); the required `*` is not part of it.
 */
function labelOf(field: Element): string | null {
  const given = clean(field.getAttribute('data-field-label') ?? field.getAttribute('aria-label'));
  if (given) return given;
  let named: Element | null | undefined = Array.from(field.querySelectorAll('label')).find(l =>
    ownedBy(l, field),
  );
  if (!named) {
    const group = Array.from(field.querySelectorAll('[role="group"][aria-labelledby]')).find(g =>
      ownedBy(g, field),
    );
    const id = group?.getAttribute('aria-labelledby');
    named = id ? document.getElementById(id) : null;
  }
  const text = named?.textContent?.replace(/\s*\*\s*$/, '').trim();
  if (text) return text;
  const isGridControl =
    field.hasAttribute('data-grid-cell') || field.matches('input,select,textarea');
  return isGridControl ? gridLabelOf(field) : null;
}

/** Lookups against what the page shows right now. Lazy: a form with no issues touches nothing. */
function createDomLookup() {
  let allNodes: Element[] | undefined;
  let positions: Map<Element, number> | undefined;
  let allSections: Element[] | undefined;
  // Field wrappers and sub-headings together, in page order: where a field sits, and what heading
  // sits above it, both come from this one list.
  // Named controls too: a pricing input without a `data-field` is found by its `name`.
  const nodes = () =>
    (allNodes ??= Array.from(
      document.querySelectorAll('[data-field], h4[data-subheading], input[name], textarea[name]'),
    ));
  const position = (el: Element) => {
    if (!positions) positions = new Map(nodes().map((node, i) => [node, i]));
    return positions.get(el);
  };
  const fields = () =>
    nodes().filter((node): node is HTMLElement => node.hasAttribute('data-field'));
  const sections = () => (allSections ??= Array.from(document.querySelectorAll('section[id]')));

  const exact = (path: string) =>
    document.querySelector<HTMLElement>(`[data-field="${CSS.escape(path)}"]`) ??
    // a control that stands for several paths: `data-field-aliases="a b"`
    document.querySelector<HTMLElement>(`[data-field-aliases~="${CSS.escape(path)}"]`) ??
    document.querySelector<HTMLElement>(
      `input[name="${CSS.escape(path)}"], textarea[name="${CSS.escape(path)}"]`,
    );
  // An array-level issue (`titles`) has no wrapper of its own on some tables: its first row will do
  // for finding the section it sits in, though not for its label.
  const placedAt = (path: string) =>
    exact(path) ?? document.querySelector<HTMLElement>(`[data-field^="${CSS.escape(path)}."]`);

  return {
    /** The field's wrapper (or its first row, for an array-level path), if the page renders it. */
    elementAt: placedAt,
    /** Page order of a wrapper; undefined for none. Items sort by it. */
    position,
    /**
     * Text of the nearest `FormSubheading` above the field inside the same section, if any. It is
     * what tells apart two fields of the same name, e.g. the deed address and the DOPA address.
     */
    subheadingAbove(el: Element) {
      const section = el.closest('section[id]');
      const at = position(el);
      if (!section || at === undefined) return null;
      const all = nodes();
      for (let i = at - 1; i >= 0; i--) {
        const node = all[i];
        if (node.hasAttribute('data-subheading') && node.closest('section[id]') === section) {
          return node.textContent?.trim() || null;
        }
      }
      return null;
    },
    /** Label of the field at exactly this path. */
    labelAt(path: string) {
      const el = exact(path);
      return el ? labelOf(el) : null;
    },
    /** Label of any row of the field, for a table cell that carries none of its own. */
    labelOfRows(generic: string) {
      for (const el of fields()) {
        if (stripIndexes(el.dataset.field ?? '') !== generic) continue;
        const label = labelOf(el);
        if (label) return label;
      }
      return null;
    },
    /**
     * Does every row of the field draw a label of its own, each one different? Then the label
     * already says which row (a template's factors, one field per row); "row n" would only be noise.
     */
    rowsLabelledApart(generic: string) {
      const pathOf = (el: Element) =>
        el.getAttribute('data-field') ?? el.getAttribute('name') ?? '';
      const labels = nodes()
        .filter(el => stripIndexes(pathOf(el)) === generic)
        .map(labelOf);
      return labels.length > 0 && labels.every(Boolean) && new Set(labels).size === labels.length;
    },
    /** The nearest titled `<section id>` around the field (FormSection names itself by aria-labelledby). */
    sectionAt(path: string) {
      const el = placedAt(path);
      let section = el?.closest('section[id]') ?? null;
      while (section) {
        const titleId = section.getAttribute('aria-labelledby');
        const title = titleId ? document.getElementById(titleId)?.textContent?.trim() : null;
        if (title) return { id: section.id, title, order: sections().indexOf(section) };
        section = section.parentElement?.closest('section[id]') ?? null;
      }
      return null;
    },
  };
}

interface Entry {
  key: string;
  /** The label before any "row n" or disambiguation. */
  base: string;
  /** 1-based row of an array field, if the path has one. */
  row: number | undefined;
  el: HTMLElement | null;
  configLabel: string | undefined;
}

interface Group {
  id: string;
  title: string;
  order: number;
  entries: Entry[];
}

/**
 * Turns the zod issues of a form into the popover's sections. One item per path. The label is the
 * one the page draws (DOM), else the field config's, else the humanised key; a row of an array
 * reads "{label} #n". The section is the titled `FormSection` the field sits in, in page order;
 * a field outside every one goes under "other". Items inside a section follow the page, not the
 * schema. Two items of one section with the same label get the sub-heading above each (else the
 * config label) appended. Reads the DOM, so run it after the page rendered.
 */
export function buildFormMissingSummary(
  issues: ZodIssue[],
  {
    t,
    configLabels,
    renderedOnly = false,
  }: { t: Translate; configLabels?: Map<string, string>; renderedOnly?: boolean },
): MissingFieldsSummary {
  const dom = createDomLookup();
  const seen = new Set<string>();
  const groups = new Map<string, Group>();
  let total = 0;

  for (const issue of issues) {
    const parts = issue.path.map(String);
    if (parts.length === 0) continue;
    const key = parts.join('.');
    if (seen.has(key)) continue;
    seen.add(key);
    // A field the page does not draw (the other half of an either/or pair, a value a picker sets)
    // is nothing the user can fill in: leave it out rather than list it under "other".
    if (renderedOnly && !dom.elementAt(key)) continue;

    const generic = stripIndexes(key);
    const named = parts.filter(part => !isIndex(part));
    const base =
      dom.labelAt(key) ??
      dom.labelOfRows(generic) ??
      configLabels?.get(generic) ??
      humanizeFieldLabel(named[named.length - 1] ?? key);
    const rowPart = parts.find(isIndex);
    const row =
      rowPart === undefined || dom.rowsLabelledApart(generic) ? undefined : Number(rowPart) + 1;

    const section = dom.sectionAt(key);
    const id = section?.id ?? OTHER_SECTION_ID;
    let group = groups.get(id);
    if (!group) {
      group = {
        id,
        title: section?.title ?? t('missing.otherSection'),
        order: section?.order ?? Infinity,
        entries: [],
      };
      groups.set(id, group);
    }
    group.entries.push({
      key,
      base,
      row,
      el: dom.elementAt(key),
      configLabel: configLabels?.get(generic),
    });
    total += 1;
  }

  const rowLabel = (entry: Entry, base: string) =>
    entry.row === undefined ? base : t('missing.rowField', { label: base, n: entry.row });

  return {
    total,
    sections: [...groups.values()]
      .sort((a, b) => a.order - b.order)
      .map(({ id, title, entries }) => {
        // Page order, not the schema's. A field the page does not render goes last, in its order.
        const ordered = entries
          .map((entry, i) => ({ entry, i, at: entry.el ? dom.position(entry.el) : undefined }))
          .sort((a, b) =>
            a.at === undefined || b.at === undefined
              ? Number(a.at === undefined) - Number(b.at === undefined) || a.i - b.i
              : a.at - b.at,
          )
          .map(({ entry }) => entry);

        // Two fields that read the same: say which is which. The sub-heading above each is the
        // best tell; failing that the config label; failing that they stay as they are.
        const bases = new Map(ordered.map(entry => [entry, entry.base]));
        const byLabel = new Map<string, Entry[]>();
        for (const entry of ordered) {
          const label = rowLabel(entry, entry.base);
          byLabel.set(label, [...(byLabel.get(label) ?? []), entry]);
        }
        for (const same of byLabel.values()) {
          if (same.length < 2) continue;
          const withHeading = same.map(entry => {
            const heading = entry.el ? dom.subheadingAbove(entry.el) : null;
            return heading ? `${entry.base} (${heading})` : entry.base;
          });
          const withConfig = same.map(entry => entry.configLabel ?? entry.base);
          const distinct = (labels: string[]) => new Set(labels).size === labels.length;
          const chosen = distinct(withHeading)
            ? withHeading
            : distinct(withConfig)
              ? withConfig
              : null;
          if (chosen) same.forEach((entry, i) => bases.set(entry, chosen[i]));
        }

        const items: MissingFieldsItem[] = ordered.map(entry => ({
          key: entry.key,
          label: rowLabel(entry, bases.get(entry) ?? entry.base),
          path: entry.key,
        }));
        return { id, title, items };
      }),
  };
}

// The conditional rules and config labels of a `fields` array. Memoised on the array itself, so a
// module-level `all*Fields` is built once and an inline array only costs a rebuild.
const derivedFromFields = new WeakMap<
  FormField[],
  { rules: ReturnType<typeof buildConditionalRefinement>; labels: Map<string, string> }
>();

function derive(fields: FormField[]) {
  let derived = derivedFromFields.get(fields);
  if (!derived) {
    derived = { rules: buildConditionalRefinement(fields), labels: collectFieldLabels(fields) };
    derivedFromFields.set(fields, derived);
  }
  return derived;
}

/**
 * What is still missing in the form, live: re-checks the form against `schema` after every ~300 ms
 * pause in editing, without re-rendering the page (the callback form of `watch`). Must sit inside
 * the form's provider. Give it `fields` (the configs the schema was built from) and the conditional
 * "required when X" rules are counted early too, which zod would otherwise hide until the plain
 * required fields are filled.
 *
 * ponytail: re-parses the whole form after each pause. Fine for a property form; if it ever shows
 * up in a profile, parse per section or move it into a worker.
 */
export function useFormMissingFields({
  schema,
  fields,
  renderedOnly,
}: {
  schema: ZodTypeAny;
  fields?: FormField[];
  /** List only the fields the page draws (see `buildFormMissingSummary`). */
  renderedOnly?: boolean;
}) {
  const { t } = useTranslation('common');
  const { watch, getValues } = useFormContext();

  // A page may rebuild its schema or fields every render: read the latest without re-subscribing.
  const latest = useRef({ schema, fields, renderedOnly });
  useEffect(() => {
    latest.current = { schema, fields, renderedOnly };
  });

  const [summary, setSummary] = useState<MissingFieldsSummary | null>(null);

  const refresh = useCallback(() => {
    const { schema: current, fields: currentFields, renderedOnly: only } = latest.current;
    const derived = currentFields ? derive(currentFields) : undefined;
    const issues = collectSchemaIssues(current, getValues(), [derived?.rules]);
    setSummary(
      buildFormMissingSummary(issues, {
        // some keys are built from the issue path, which the typed t cannot check
        t: t as unknown as Translate,
        configLabels: derived?.labels,
        renderedOnly: only,
      }),
    );
  }, [getValues, t]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const subscription = watch(() => {
      clearTimeout(timer);
      timer = setTimeout(refresh, DEBOUNCE_MS);
    });
    refresh();
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [watch, refresh]);

  return { summary, refresh };
}

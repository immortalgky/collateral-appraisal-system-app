import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { ZodIssue, ZodTypeAny } from 'zod';
import { buildConditionalRefinement } from '@/shared/components/form/schemaBuilder';
import {
  collectFieldLabels,
  collectSchemaIssues,
  type MissingFieldsSummary,
  type RefineRule,
} from '@/shared/components/form/missing';
import { refineRetailSellingPrice } from '../schemas/form';
import {
  allRequestFields,
  makeAddressFields,
  makeAppointmentAndFeeFields,
  makeContactFields,
  makeCustomersFieldConfig,
  makePropertiesFieldConfig,
  makeRequestFields,
  prefixFields,
} from '../configs/fields';

/** The page cards the missing fields are grouped under (also the nav entries). */
export type MissingSection = 's1' | 's2' | 's5' | 'titles' | 'docs';

export const MISSING_SECTIONS: MissingSection[] = ['s1', 's2', 's5', 'titles', 'docs'];

/** DOM id of each card, where the nav scrolls to and a missing item falls back to. */
export const SECTION_ANCHOR: Record<MissingSection, string> = {
  s1: 's1',
  s2: 's2',
  s5: 's5',
  titles: 'title-document-info',
  docs: 'attach-document',
};

export interface MissingItem {
  key: string;
  label: string;
  /** How many empty fields this item stands for (a title row sums its own). */
  count: number;
  /** Form path to scroll to, or null to land on the card itself. */
  path: string | null;
}

export interface FormCounts {
  customers: number;
  properties: number;
  titles: number;
  files: number;
  requiredDocs: number;
  requiredDocsDone: number;
}

export interface MissingSummary {
  items: Record<MissingSection, MissingItem[]>;
  total: number;
  counts: FormCounts;
}

interface DocRow {
  fileName?: string | null;
  isRequired?: boolean;
}

interface FormValuesLike {
  [key: string]: unknown;
  customers?: unknown[];
  properties?: unknown[];
  documents?: DocRow[];
  titles?: { documents?: DocRow[] }[];
}

const isIndex = (part: string) => /^\d+$/.test(part);

/** Which card a zod issue path belongs to. */
export function sectionOf(path: (string | number)[]): MissingSection {
  const [root, second, third] = path.map(String);
  switch (root) {
    case 'properties':
      return 's2';
    case 'titles':
      return 'titles';
    case 'documents':
      return 'docs';
    case 'detail':
      if (second === 'address') return 's2';
      if (second === 'contact') return third === 'dealerCode' ? 's2' : 's5';
      if (second === 'appointment' || second === 'fee') return 's5';
      return 's1';
    default:
      // requestor, customers, purpose, priority, channel, detail.loanDetail ... : the request card
      return 's1';
  }
}

/** Files attached to the request and to its titles (rows that hold a file, not checklist slots). */
export function countFiles(values: FormValuesLike): number {
  const own = (values.documents ?? []).filter(d => d?.fileName).length;
  const perTitle = (values.titles ?? []).reduce(
    (sum, title) => sum + (title?.documents ?? []).filter(d => d?.fileName).length,
    0,
  );
  return own + perTitle;
}

const missingRequired = (docs: DocRow[] | undefined) =>
  (docs ?? []).filter(d => d?.isRequired && !d.fileName).length;

/**
 * Fields the maker never fills on their own. Each is set from another visible field, so a missing
 * one is reported as that field: district and province come from the sub-district pick.
 */
const ALIASES: Record<string, string> = {
  'detail.address.district': 'detail.address.subDistrict',
  'detail.address.province': 'detail.address.subDistrict',
  'detail.address.postcode': 'detail.address.subDistrict',
  'detail.address.subDistrictName': 'detail.address.subDistrict',
  'detail.address.districtName': 'detail.address.subDistrict',
  'detail.address.provinceName': 'detail.address.subDistrict',
  'properties.buildingTypeOther': 'properties.buildingType',
};

const aliasParts = (parts: string[]): string[] => {
  const alias = ALIASES[parts.filter(p => !isIndex(p)).join('.')];
  if (!alias) return parts;
  const row = parts.find(isIndex);
  const out = alias.split('.');
  if (row !== undefined) out.splice(1, 0, row);
  return out;
};

interface Resolver {
  t: (key: string, options?: Record<string, unknown>) => string;
  /** Label of a field path with the row indexes taken out (customers.name), if the configs know it. */
  fieldLabel: (path: string) => string | undefined;
}

/**
 * Turns the zod issues of the whole form (plus the required-document slots, which zod does not
 * check) into the per-card lists the nav and the missing popover show. Pure, so it is testable
 * without a form.
 */
export function buildMissingSummary(
  values: FormValuesLike,
  issues: ZodIssue[],
  { t, fieldLabel }: Resolver,
): MissingSummary {
  const items: Record<MissingSection, MissingItem[]> = {
    s1: [],
    s2: [],
    s5: [],
    titles: [],
    docs: [],
  };
  const seen = new Set<string>();
  const perTitle = new Map<number, number>();

  for (const issue of issues) {
    const parts = aliasParts(issue.path.map(String));
    const key = parts.join('.');

    if (parts[0] === 'titles') {
      if (parts.length === 1) {
        if (!seen.has(key))
          items.titles.push({ key, label: t('page.missing.titlesEmpty'), count: 1, path: key });
        seen.add(key);
      } else {
        const row = Number(parts[1]);
        perTitle.set(row, (perTitle.get(row) ?? 0) + 1);
      }
      continue;
    }

    if (seen.has(key)) continue;

    let label: string;
    if (parts[0] === 'requestor') {
      label = t('page.missing.requestor');
    } else if (parts.length === 1 && (parts[0] === 'customers' || parts[0] === 'properties')) {
      label = t(`page.missing.${parts[0]}Empty`);
    } else {
      const generic = parts.filter(p => !isIndex(p)).join('.');
      const base = fieldLabel(generic);
      // No label means no field on screen to point at: never show a raw path.
      if (!base) {
        if (import.meta.env.DEV)
          console.warn('Missing-fields: no label for', generic, '- left out');
        continue;
      }
      const row = parts.find(isIndex);
      label =
        row === undefined ? base : t('page.missing.rowField', { label: base, n: Number(row) + 1 });
    }
    seen.add(key);
    // Requestor is picked in the page header, so its path is the header's data-field.
    items[sectionOf(parts)].push({
      key,
      label,
      count: 1,
      path: parts[0] === 'requestor' ? 'requestor.employeeId' : key,
    });
  }

  [...perTitle.entries()]
    .sort(([a], [b]) => a - b)
    .forEach(([row, count]) =>
      items.titles.push({
        key: `titles.${row}`,
        label: t('page.missing.titleRow', { n: row + 1, count }),
        count,
        path: `titles.${row}`,
      }),
    );

  const requestDocs = values.documents ?? [];
  const missingDocs = missingRequired(requestDocs);
  if (missingDocs > 0)
    items.docs.push({
      key: 'sec:docs',
      label: t('page.missing.docs', { count: missingDocs }),
      count: missingDocs,
      path: null,
    });
  const missingTitleDocs = (values.titles ?? []).reduce(
    (sum, title) => sum + missingRequired(title?.documents),
    0,
  );
  if (missingTitleDocs > 0)
    items.titles.push({
      key: 'sec:titleDocs',
      label: t('page.missing.titleDocs', { count: missingTitleDocs }),
      count: missingTitleDocs,
      path: null,
    });

  const requiredDocs = requestDocs.filter(d => d?.isRequired).length;
  const total = Object.values(items)
    .flat()
    .reduce((sum, item) => sum + item.count, 0);

  return {
    items,
    total,
    counts: {
      customers: values.customers?.length ?? 0,
      properties: values.properties?.length ?? 0,
      titles: values.titles?.length ?? 0,
      files: countFiles(values),
      requiredDocs,
      requiredDocsDone: requiredDocs - missingDocs,
    },
  };
}

export const sectionTotal = (summary: MissingSummary, section: MissingSection) =>
  summary.items[section].reduce((sum, item) => sum + item.count, 0);

/** Label of every request field by form path (row indexes left out), from the translated configs. */
export function buildFieldLabeler(t: Parameters<typeof makeRequestFields>[0]) {
  const labels = new Map<string, string>();
  collectFieldLabels(makeRequestFields(t), labels);
  collectFieldLabels(prefixFields(makeAddressFields(t), 'detail.address'), labels);
  collectFieldLabels(prefixFields(makeContactFields(t), 'detail.contact'), labels);
  collectFieldLabels(makeAppointmentAndFeeFields(t), labels);
  collectFieldLabels([makeCustomersFieldConfig(t), makePropertiesFieldConfig(t)], labels);
  return (path: string) => labels.get(path);
}

// The rules the schema applies in a superRefine, which zod skips while any base issue exists, so
// they are run on their own to count what the schema would report once the base issues are fixed:
// the conditional required rules (requiredWhen, showWhen ...) of the fields it is built from, and
// the retail selling price check.
const requestRules: (RefineRule | null)[] = [
  buildConditionalRefinement(allRequestFields),
  (values, ctx) =>
    refineRetailSellingPrice(values as Parameters<typeof refineRetailSellingPrice>[0], ctx, ''),
];

/** Every issue the form has: the schema's, plus the rules in its superRefines that it would hide. */
export function collectIssues(schema: ZodTypeAny, values: unknown): ZodIssue[] {
  return collectSchemaIssues(schema, values, requestRules);
}

/**
 * The summary in the shared chip's shape: one section per card that has something missing, its
 * DOM id as the fallback landing for an item with no field to point at. Items keep their own
 * `count` (a title row sums its empty fields).
 */
export function toChipSummary(
  summary: MissingSummary,
  sectionTitle: (section: MissingSection) => string,
): MissingFieldsSummary {
  return {
    total: summary.total,
    sections: MISSING_SECTIONS.filter(s => summary.items[s].length > 0).map(s => ({
      id: SECTION_ANCHOR[s],
      title: sectionTitle(s),
      items: summary.items[s],
    })),
  };
}

const DEBOUNCE_MS = 300;

/**
 * What is still missing in the request form, grouped by page card.
 *
 * ponytail: re-parses the whole form against the page schema after every ~300 ms pause in typing.
 * Fine for this form's size; if it ever shows up in a profile, validate per card (parse only the
 * sub-schema of the card that changed) or move the parse into a worker.
 */
export function useRequestMissingFields(methods: UseFormReturn<FieldValues>, schema: ZodTypeAny) {
  const { t } = useTranslation('request');

  const fieldLabel = useMemo(() => buildFieldLabeler(t), [t]);

  // The page rebuilds its schema every render; read the latest one without re-subscribing.
  const schemaRef = useRef(schema);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  const [summary, setSummary] = useState<MissingSummary | null>(null);

  const { watch, getValues } = methods;

  const refresh = useCallback(() => {
    const values = getValues();
    setSummary(
      buildMissingSummary(values, collectIssues(schemaRef.current, values), {
        // some keys are built from the issue path, which the typed t cannot check
        t: t as unknown as Resolver['t'],
        fieldLabel,
      }),
    );
  }, [getValues, t, fieldLabel]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The callback form of watch() subscribes without re-rendering the page.
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

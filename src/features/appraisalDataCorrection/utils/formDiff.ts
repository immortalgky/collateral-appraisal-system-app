import { humanize, labelForTable, labelOrHumanized } from '../configs/fieldLabels';

/**
 * What the confirm dialog lists: the form as loaded against the form as it stands now.
 *
 * The correction is sent as the whole page payload, so nothing here can be read off a "dirty"
 * flag the way a partial update could — the two value trees are compared directly. Plain fields
 * read from → to. A table (an array of rows) is matched row by row and reported as rows added,
 * rows removed, and the cells that changed in the rows that stayed.
 *
 * This is the reader's preview. The audit row is written by the backend from the saved record.
 */

type Obj = Record<string, unknown>;

export interface DiffEntry {
  /** Unique within one diff. */
  key: string;
  /** The table a row entry belongs to ("Land titles"); '' for a plain field. */
  group: string;
  label: string;
  kind: 'changed' | 'added' | 'removed';
  /** `changed`: the old value. `removed`: the row's summary. */
  from?: unknown;
  /** `changed`: the new value. `added`: the row's summary. */
  to?: unknown;
}

const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

const isBlank = (v: unknown) => v === null || v === undefined || v === '';

/** Dotted path without a leading dot for top-level keys. */
const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

/** Identity and derived members: never something the admin typed, so never a difference. */
const SKIPPED_KEYS = new Set(['id', 'reason', 'scheduleEntries']);

/**
 * The location selectors keep a geocode beside the name they show. The codes are what gets sent,
 * but they say nothing to the person confirming, so the dialog shows the name and hides the
 * mirror field itself.
 */
const NAME_OF: Record<string, string> = {
  subDistrict: 'subDistrictName',
  district: 'districtName',
  province: 'provinceName',
  dopaSubDistrict: 'dopaSubDistrictName',
  dopaDistrict: 'dopaDistrictName',
  dopaProvince: 'dopaProvinceName',
};
const NAME_MIRRORS = new Set(Object.values(NAME_OF));

/**
 * Two scalars are the same when they read the same: empty is empty whatever spelling it takes
 * (null, undefined, ''), and a switch that was never answered reads as No, so "— → No" is not
 * listed as something the admin did. A number equals its numeric string, since inputs hand back
 * strings for what the record held as numbers. Two strings are compared as strings — a title
 * number of "007" is not "7".
 */
const sameScalar = (a: unknown, b: unknown): boolean => {
  const isEmpty = (v: unknown) => isBlank(v) || v === false;
  if (isEmpty(a) || isEmpty(b)) return isEmpty(a) && isEmpty(b);
  if (typeof a === 'number' && typeof b === 'string') return a === Number(b);
  if (typeof a === 'string' && typeof b === 'number') return Number(a) === b;
  return a === b;
};

/** A list of plain values (a multi-select) rather than a table of rows. */
const isValueList = (list: unknown[]) => list.every(v => !isObject(v) && !Array.isArray(v));

const asList = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

/** How a value reads in the dialog; the one place it is decided. */
export function formatDiffValue(v: unknown): string {
  if (isBlank(v)) return '—';
  if (typeof v === 'boolean') return v ? 'Yes' : 'No';
  if (Array.isArray(v)) return v.length > 0 ? v.map(formatDiffValue).join(', ') : '—';
  return String(v);
}

interface Context {
  /** Table the fields being compared sit in; '' at the top of the form. */
  group: string;
  /** Labels leading the field's own, outermost first (the row, a nested block). */
  labels: string[];
  /** Position in the form, for keys. */
  path: string;
}

/** The row's own id, when it has one: how rows loaded from the record are told apart. */
const idOf = (row: unknown): string | undefined =>
  isObject(row) && !isBlank(row.id) ? String(row.id) : undefined;

/**
 * What identifies a row that has no id: one added in this session, or a title from an older
 * record. LandTitleTable now keeps the stored id when a title is edited; the number still names it.
 */
const IDENTITY_OF: Record<string, (row: Obj) => string | undefined> = {
  titles: row => (isBlank(row.titleNumber) ? undefined : String(row.titleNumber)),
};

interface RowPair {
  before?: unknown;
  after?: unknown;
  /** 0-based position in whichever list the row came from (the new one when it has both). */
  position: number;
}

/**
 * Pairs the rows of two versions of a table.
 *
 * 1. By id, where both have one.
 * 2. A row with no id by the table's identity key, if it has one (titles: the number).
 * 3. Rows that never had ids (rental entries, say) by position.
 *
 * A row on the new side with nothing to pair to is added; a row on the old side nothing claimed is
 * removed. Positional pairing is the ceiling: a row inserted mid-table in a table without ids reads
 * as edits to the rows after it.
 */
function pairRows(table: string, before: unknown[], after: unknown[]): RowPair[] {
  const claimed = new Set<number>();
  const matched: (number | undefined)[] = after.map(() => undefined);
  const claim = (afterIndex: number, beforeIndex: number) => {
    matched[afterIndex] = beforeIndex;
    claimed.add(beforeIndex);
  };

  after.forEach((row, j) => {
    const id = idOf(row);
    if (id === undefined) return;
    const i = before.findIndex((old, k) => !claimed.has(k) && idOf(old) === id);
    if (i >= 0) claim(j, i);
  });

  const identityOf = IDENTITY_OF[table];
  after.forEach((row, j) => {
    if (!identityOf || !isObject(row) || matched[j] !== undefined) return;
    if (idOf(row) !== undefined) return;
    const identity = identityOf(row);
    if (identity === undefined) return;
    const i = before.findIndex(
      (old, k) => !claimed.has(k) && isObject(old) && identityOf(old) === identity,
    );
    if (i >= 0) claim(j, i);
  });

  after.forEach((row, j) => {
    if (matched[j] !== undefined || idOf(row) !== undefined) return;
    if (j < before.length && !claimed.has(j) && idOf(before[j]) === undefined) claim(j, j);
  });

  const pairs: RowPair[] = after.map((row, j) => ({
    before: matched[j] === undefined ? undefined : before[matched[j] as number],
    after: row,
    position: j,
  }));
  before.forEach((row, i) => {
    if (!claimed.has(i)) pairs.push({ before: row, position: i });
  });
  return pairs;
}

/**
 * Whether the rows kept from before are now in a different relative order, or a new row was put
 * ahead of a kept one. Rows only added at the end or removed do not change the order.
 */
function orderChanged(before: unknown[], pairs: RowPair[]): boolean {
  let previous = -1;
  let sawNew = false;
  for (const pair of pairs) {
    if (pair.after === undefined) continue;
    if (pair.before === undefined) {
      sawNew = true;
      continue;
    }
    const index = before.indexOf(pair.before);
    if (sawNew || index < previous) return true;
    previous = index;
  }
  return false;
}

/**
 * Both sides of a title-order entry, by number. On the old side a number held by more than one
 * title gets " (2)", " (3)"… on its later occurrences. On the new side a title whose number did not
 * change keeps its old label, so swapping two titles that share a number still reads as a change; a
 * renumbered or new title shows its new number, with the next suffix not already used on that side.
 * The audit (SnapshotDiff.TitleOrder) labels the same way.
 */
function orderLabels(before: unknown[], pairs: RowPair[]): { from: string[]; to: string[] } {
  const numberOf = (row: unknown) =>
    isObject(row) && !isBlank(row.titleNumber) ? String(row.titleNumber) : '—';
  const withSuffix = (no: string, n: number) => (n === 1 ? no : `${no} (${n})`);

  const seen = new Map<string, number>();
  const labelOf = new Map<unknown, string>();
  const from = before.map(row => {
    const no = numberOf(row);
    const n = (seen.get(no) ?? 0) + 1;
    seen.set(no, n);
    const text = withSuffix(no, n);
    labelOf.set(row, text);
    return text;
  });

  const kept = pairs.filter(pair => pair.after !== undefined);
  const carried = (pair: RowPair) =>
    pair.before !== undefined && numberOf(pair.before) === numberOf(pair.after)
      ? labelOf.get(pair.before)
      : undefined;
  const used = new Set(kept.map(carried).filter(Boolean));
  const to = kept.map(pair => {
    const label = carried(pair);
    if (label !== undefined) return label;
    const no = numberOf(pair.after);
    let n = 1;
    while (used.has(withSuffix(no, n))) n += 1;
    const text = withSuffix(no, n);
    used.add(text);
    return text;
  });
  return { from, to };
}

/** "#1234" for a title (its number), "#3" for the third row of anything else. */
function rowName(table: string, row: unknown, position: number): string {
  if (table === 'titles' && isObject(row) && !isBlank(row.titleNumber)) {
    return `#${String(row.titleNumber)}`;
  }
  return `#${position + 1}`;
}

/** The row in a line, for a row added or removed as a whole: its first few filled-in cells. */
function summarize(row: unknown): string {
  if (!isObject(row)) return formatDiffValue(row);
  const cells = Object.entries(row)
    .filter(([k, v]) => !SKIPPED_KEYS.has(k) && !isObject(v) && !Array.isArray(v) && !isBlank(v))
    .slice(0, 4)
    .map(([k, v]) => `${labelOrHumanized(k)} ${formatDiffValue(v)}`);
  return cells.length > 0 ? cells.join(' · ') : '—';
}

function diffArray(
  key: string,
  before: unknown[],
  after: unknown[],
  ctx: Context,
  out: DiffEntry[],
) {
  if (isValueList(before) && isValueList(after)) {
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      out.push({
        key: join(ctx.path, key),
        group: ctx.group,
        label: [...ctx.labels, labelOrHumanized(key)].join(' · '),
        kind: 'changed',
        from: before,
        to: after,
      });
    }
    return;
  }

  const table = labelForTable(key);
  const nested = ctx.group !== '';
  const group = nested ? ctx.group : table;
  const pairs = pairRows(key, before, after);

  // Title order is saved (the first title is what LOS and AS400 take), so a move is a change of
  // its own: one entry for the whole list rather than every row reading as edited.
  // Not when both sides read the same (a title replaced by a new one with the same number, in place):
  // the added and removed rows already say what happened.
  const order = key === 'titles' && orderChanged(before, pairs) ? orderLabels(before, pairs) : null;
  if (order && order.from.join('\u0000') !== order.to.join('\u0000')) {
    out.push({
      key: `${join(ctx.path, key)}:order`,
      group,
      label: [...ctx.labels, labelOrHumanized('titleOrder')].join(' · '),
      kind: 'changed',
      ...order,
    });
  }

  for (const pair of pairs) {
    const row = pair.before ?? pair.after;
    const name = rowName(key, row, pair.position);
    // Under a table title the row is just "#3"; inside another table's row it says which table.
    const labels = [...ctx.labels, nested ? `${table} ${name}` : name];
    const path = `${join(ctx.path, key)}[${pair.position}]`;

    if (pair.before !== undefined && pair.after !== undefined) {
      if (isObject(pair.before) && isObject(pair.after)) {
        diffObject(pair.before, pair.after, { group, labels, path }, out);
      }
    } else {
      const added = pair.before === undefined;
      out.push({
        key: `${path}:${added ? 'added' : 'removed'}`,
        group,
        label: labels.join(' · '),
        kind: added ? 'added' : 'removed',
        ...(added ? { to: summarize(pair.after) } : { from: summarize(pair.before) }),
      });
    }
  }
}

function diffObject(before: Obj, after: Obj, ctx: Context, out: DiffEntry[]) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);

  for (const key of keys) {
    if (SKIPPED_KEYS.has(key) || NAME_MIRRORS.has(key) || key.startsWith('_')) continue;
    const a = before[key];
    const b = after[key];

    if (Array.isArray(a) || Array.isArray(b)) {
      diffArray(key, asList(a), asList(b), ctx, out);
    } else if (isObject(a) || isObject(b)) {
      diffObject(
        isObject(a) ? a : {},
        isObject(b) ? b : {},
        { ...ctx, labels: [...ctx.labels, humanize(key)], path: join(ctx.path, key) },
        out,
      );
    } else if (!sameScalar(a, b)) {
      const nameKey = NAME_OF[key];
      const showName = nameKey !== undefined && (nameKey in before || nameKey in after);
      out.push({
        key: join(ctx.path, key),
        group: ctx.group,
        label: [...ctx.labels, labelOrHumanized(key)].join(' · '),
        kind: 'changed',
        from: (showName && !isBlank(before[nameKey]) ? before[nameKey] : a) ?? null,
        to: (showName && !isBlank(after[nameKey]) ? after[nameKey] : b) ?? null,
      });
    }
  }
}

/** Every difference between two versions of a property's form values, `reason` excluded. */
export function diffFormValues(before: Obj, after: Obj): DiffEntry[] {
  const out: DiffEntry[] = [];
  diffObject(before, after, { group: '', labels: [], path: '' }, out);
  return out;
}

/** The plain fields first, then one block per table in the order its first difference appears. */
export function groupDiff(entries: DiffEntry[]): { group: string; entries: DiffEntry[] }[] {
  const groups = new Map<string, DiffEntry[]>();
  for (const entry of entries) {
    groups.set(entry.group, [...(groups.get(entry.group) ?? []), entry]);
  }
  const fields = groups.get('');
  const tables = [...groups]
    .filter(([group]) => group !== '')
    .map(([group, list]) => ({ group, entries: list }));
  return fields ? [{ group: '', entries: fields }, ...tables] : tables;
}

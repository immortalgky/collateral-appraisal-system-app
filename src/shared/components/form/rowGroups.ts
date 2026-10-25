/**
 * `start`/`member`: a run of text-like fields that keeps its row. `start-only`: the first field of a
 * run with a toggle or chip group in it, which does not keep its spans (it would overflow a quarter
 * cell) but still starts a row in Compact.
 */
export type RowGroupRole = 'start' | 'member' | 'start-only' | undefined;

const WIDE_TYPES = new Set(['boolean-toggle', 'string-toggle', 'radio-group', 'checkbox-group']);

/** A radio / checkbox group drawn as chips that takes a whole Standard row (a `card` radio group, or one with `keepSpan`, does not). */
export const isChipGroup = (f: { type?: string; variant?: string; keepSpan?: boolean }) =>
  !f.keepSpan &&
  (f.type === 'checkbox-group' || (f.type === 'radio-group' && f.variant !== 'card'));

/** The plain `col-span-N` of a wrapper; undefined when it has none or varies it per breakpoint. */
function plainSpan(wrapperClassName = ''): number | undefined {
  if (/(?:^|\s)\S+:col-(?:span|start|end)-/.test(wrapperClassName)) return undefined;
  if (/(?:^|\s)col-(?:start|end)-/.test(wrapperClassName)) return undefined;
  const m = /(?:^|\s)col-span-(\d+)(?=\s|$)/.exec(wrapperClassName);
  return m ? Number(m[1]) : undefined;
}

/**
 * Finds the runs of neighbouring fields whose spans add up to exactly one 12-column row (address
 * ตำบล / อำเภอ / จังหวัด is 6 + 3 + 3, latitude / longitude is 6 + 6). A run is meant to be read as
 * one row, so its first field starts a row (`start`: otherwise a leftover gap in the row above
 * pulls the first field up and strands the last one) and its members keep their spans while the
 * form is only moderately narrow (DESIGN.md 17.4). Fields are taken in order.
 *
 * `chipsFullRow` (Standard): a chip group takes the whole row whatever its config says, so it ends
 * the run before it and starts a new one after it.
 */
export function rowGroupRoles(
  fields: { type?: string; variant?: string; keepSpan?: boolean; wrapperClassName?: string }[],
  chipsFullRow = false,
): RowGroupRole[] {
  const roles: RowGroupRole[] = new Array(fields.length).fill(undefined);
  let run: number[] = [];
  let sum = 0;
  const spans = fields.map(f =>
    chipsFullRow && isChipGroup(f) ? 12 : plainSpan(f.wrapperClassName),
  );
  spans.forEach((span, i) => {
    if (span == null || span >= 12) {
      run = [];
      sum = 0;
      return;
    }
    run.push(i);
    sum += span;
    // A field that overflows the row pushes out the ones before it: [4, 6, 6] is a 4 and a pair
    while (sum > 12) sum -= spans[run.shift()!]!;
    if (sum === 12) {
      if (run.length > 1) {
        const wide = run.some(j => WIDE_TYPES.has(fields[j].type ?? ''));
        run.forEach(
          (j, k) =>
            (roles[j] = k === 0 ? (wide ? 'start-only' : 'start') : wide ? undefined : 'member'),
        );
      }
      run = [];
      sum = 0;
    }
  });
  return roles;
}

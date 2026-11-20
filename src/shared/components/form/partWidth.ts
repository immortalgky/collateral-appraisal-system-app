/**
 * A field that fills only part of a full row in Standard (a decree number, a distance): its width as
 * a fraction of the row, and the whole row once the form is narrow (shell below 64rem, 896px), so a
 * smaller form leaves no empty space beside it. This is wider than the section body's own rule for
 * col-span 3 and 4 (56rem): a fraction of a ~860px row is still a short box with a wide gap. The 1055px
 * shell is above it, so it is unchanged. Written out in full so Tailwind sees the classes;
 * `FormFieldShell` drops them in Compact.
 *
 * The widths are one column cell, not a bare fraction: the 12-col section grid has a 1.1429rem (16px)
 * column gap, so a cell spanning 6 columns is 50% - gap/2 and one spanning 3 is 25% - 3/4 gap. A plain
 * `w-1/2` is 8px wider than the 6-col cells above and below it. Keep these in step with `gap-x` in
 * FormSheet's body.
 */
export const PART_WIDTH = {
  /** Half a row: a text field such as a royal decree number. */
  half: 'w-[calc(50%-0.5714rem)] @max-[64rem]/form-shell:w-full',
  /** A quarter of a row (at least 11rem): a number with its unit, such as a distance. */
  quarter: 'w-[calc(25%-0.8571rem)] min-w-[11rem] @max-[64rem]/form-shell:w-full',
} as const;

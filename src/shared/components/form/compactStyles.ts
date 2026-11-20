/**
 * The Compact pair classes (DESIGN.md 17.4): one label cell and one control cell, two pairs to a row
 * on a wide sheet. The Compact section body is a wrapping flex row, so a half that has no partner
 * grows to the whole row. Shared by `FormFieldShell` and the table block (`FormTableBlock`).
 */
export const COMPACT = {
  // 184px label column
  pair: 'col-span-12 grid grid-cols-[13.1429rem_minmax(0,1fr)] border-b border-l border-(--palette-line-soft)',
  // A table that needs more than the control column holds below 66rem of sheet (`FormTableBlock wide`):
  // until then its title is a heading row above the table, not the label column.
  pairWideTable:
    'col-span-12 grid grid-cols-1 @[66rem]/sheet:grid-cols-[13.1429rem_minmax(0,1fr)] border-b border-l border-(--palette-line-soft)',
  labelWideTable:
    'flex gap-1.5 border-b border-(--palette-line-soft) @[66rem]/sheet:border-b-0 @[66rem]/sheet:border-r bg-(--palette-surface-2) px-[0.8571rem] py-[0.3571rem] text-xs font-medium leading-normal text-(--palette-ink-2)',
  // `col-span-*` is for a pair inside a 12-column grid of a form's own (a hand-wrapped block); in the
  // section body, a flex row, only the `basis-*` count.
  half: 'col-span-12 basis-full grow min-w-0 @[60rem]/sheet:col-span-6 @[60rem]/sheet:basis-1/2',
  // Three controls in a half: it is a half only from 72rem of sheet, so they keep about 96px each
  halfWide:
    'col-span-12 basis-full grow min-w-0 @[72rem]/sheet:col-span-6 @[72rem]/sheet:basis-1/2',
  full: 'col-span-12 basis-full min-w-0',
  // The pair that starts a row, in a grid of a form's own (a flex row has no `col-start-1`)
  rowStart: '@[60rem]/sheet:col-start-1',
  // A line break before a row that has to start one in the flex body (which shows it, from 60rem);
  // inside a grid of a form's own it stays hidden and `rowStart` does the work.
  rowBreak: 'hidden h-0',
  label:
    'flex gap-1.5 border-r border-(--palette-line-soft) bg-(--palette-surface-2) px-[0.8571rem] py-[0.3571rem] text-xs font-medium leading-normal text-(--palette-ink-2)',
  labelMid: 'items-center',
  // A tall control (textarea, chip group): the label sits at the first line, not the middle.
  labelTop: 'items-start pt-[0.7143rem]',
  control: 'flex min-w-0 items-center px-[0.5714rem] py-[0.2857rem]',
  // 40px with a 32px control, 33px for a read page's text row (DESIGN.md 17.3)
  controlMin: 'min-h-[2.8571rem]',
  readMin: 'min-h-[2.3571rem]',
};

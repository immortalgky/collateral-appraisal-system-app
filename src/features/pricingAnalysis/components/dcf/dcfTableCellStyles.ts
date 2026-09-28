// Shared cell recipe for the DCF table — mock's `.g` base rule (12px font, 25px
// line-height, `padding: 0 8px`) plus the DCF-specific two-sticky-column override
// (`.g.dcf .stk`/`.stk2`, mock:662-666).
//
// `py-0` is NOT optional: DaisyUI's `.table` class adds ~9.75px of vertical padding to
// any cell that doesn't override it, which is what silently turned a nominal 26px row
// into 46-49px elsewhere in this feature before it was traced (see project memory on the
// pricing-table conversion). Every cell below pairs `py-0` with an explicit height.

// whitespace-nowrap — mock `.g.dcf .stk/.stk2 { white-space: nowrap }`: a long label
// truncates (with a `title`) instead of wrapping its row to 51px.
const BASE_CELL =
  'px-[8px] py-0 h-[26px] text-[12px] leading-[25px] border-b border-gray-300 whitespace-nowrap';

/** Column 1 — the item (`.stk`): category/assumption/row name. Mock width 230px
 * (mock:669). Was widened to 320 for long names, but 320+350 pushed every year column off
 * screen at 1366 with the rail open; long names truncate instead. Present on its own only on rows that also render STK2_CLASS as a separate cell; rows with nothing to
 * put in a second column use STKW_CLASS instead (colSpan={2}), matching the mock's `.stkw`. */
export const STK_CLASS = `${BASE_CELL} w-[230px] min-w-[230px] max-w-[230px] truncate`;

/** Column 2 — the assumption (`.stk2`): method summary, edit/delete actions, or (on
 * total/summary rows) left empty/muted. Mock width 260px (mock:670); long method
 * descriptions truncate. Always paired with STK_CLASS on the same row. */
export const STK2_CLASS = `${BASE_CELL} w-[260px] min-w-[260px] max-w-[260px] truncate`;

/** One cell spanning both sticky columns (colSpan={2}) — section bands, the "+ Add
 * assumption" row, and expanded-assumption detail/breakdown lines have only one label,
 * no separate assumption-column content (mock's `.stkw`, 490 = 230 + 260). */
export const STKW_CLASS = `${BASE_CELL} min-w-[490px] truncate`;

/** A per-year value cell — mock's `.yr { min-width: 108px }` (mock:666). */
export const YEAR_CELL_CLASS = `${BASE_CELL} text-right min-w-[108px]`;

/** Same box model as STK_CLASS/STK2_CLASS but without `truncate` — for a cell whose
 * content is a flex row (e.g. a chevron button + name, or a method chip + edit/delete
 * buttons) rather than a single text node. `truncate`'s `text-overflow: ellipsis` does
 * nothing useful on a flex container; the mock's own `.asum`/`.rowname` truncate
 * *themselves*, not their parent `.stk2`/`.stk` cell — put `truncate` on the inner text
 * span instead and let the icon buttons stay fixed-width and visible. `overflow-hidden`
 * alone still clips the cell at its column width, matching the mock's `.stk`/`.stk2`. */
export const STK_CLASS_FLEX = `${BASE_CELL} w-[230px] min-w-[230px] max-w-[230px] overflow-hidden`;
export const STK2_CLASS_FLEX = `${BASE_CELL} w-[260px] min-w-[260px] max-w-[260px] overflow-hidden`;

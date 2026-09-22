import type { ReactNode } from 'react';

// Shared third-column track. 44px is mock:581's `.kv` rule (`1fr 230px 44px`), used
// as a floor rather than a fixed width: English units ("Baht/Sq.Wa") clipped under a
// fixed 44px because Thai text is narrower, so `minmax(44px, max-content)` keeps
// every row's unit aligned on the same x without losing English rows to clipping
// (user: "พวกหน่วยเอาให้ตรงกันทุกแถว").
const KV_GRID_COLS = 'grid-cols-[1fr_230px_minmax(44px,max-content)]';

/**
 * One row of the mock's `.kv` grid (mock:581-589) — label | value (+ optional hint
 * stacked under it, both right-aligned) | unit. Shared between
 * `WQSAdjustFinalValueSection.tsx` and `WQSValueRangeCard.tsx` so both cards on the
 * สรุปมูลค่า tab render the same grid rather than two copies that can drift.
 *
 * Always three columns, the unit cell included even when empty — user: "พวกหน่วยเอา
 * ให้ตรงกันทุกแถว แบบใน mock" — a flex row with `justify-between` (the shape this
 * replaced) let each row's content push the unit to wherever that row's own width
 * landed.
 */
export function KvRow({
  label,
  value,
  unit,
  hint,
}: {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    // `items-center` is what the user asked for on single-line rows ("ถ้า row สูงแค่
    // แถวเดียวให้คำอยู่ตรงกลาง align item center แต่ถ้าสูงกว่า 1 แถวให้ label ชิดบน") — but on
    // its own it centred the label against the WHOLE row, so a row whose value cell
    // stacked a hint under the value left the label floating in the middle of two or
    // three lines. The fix is structural, not a rule on `hint`: the hint gets its own
    // grid row (`col-start-2`, auto-placed into row 2) instead of being stacked inside
    // the value cell, so label/value/unit alone define grid row 1 and `items-center`
    // now centres the label on the value's own first line. Nothing here reads `hint`
    // to decide alignment, so anything else that makes a row tall — a tall input, a
    // wrapping label — lands correctly too, which a `hint`-based heuristic wouldn't.
    // `last:border-b-0` — the card body used to carry `py-3`, which held this stack
    // clear of the card's own border; with that padding removed (user: "เอา padding
    // ของตารางนี้ออก") the final row's separator landed directly on the card's
    // `border-[#e3e9e8]`, a doubled 1px edge that `rounded-[10px] overflow-hidden`
    // then clipped square across the rounded corners. A `last-child` rule rather than
    // an "is this the last row" flag from the caller: rows here are rendered behind
    // branches (`{cond && kvRow(...)}`), so which row is last changes with the data,
    // and a false branch emits no DOM node at all — CSS reads the rows that actually
    // rendered, which a caller-side index can't do without duplicating every branch.
    // `min-h-[32px]` is mock:589's `line-height: 32px` ported as a floor on the row
    // rather than as a line-height on the cells.
    //
    // What it fixes: nothing gives the LABEL cell a height of its own. It carries
    // horizontal padding only, so it is just its text's line box (~19px at 12.5px).
    // Row height therefore comes from the VALUE cell, which does carry `pt-1`/`pb-1` —
    // so a plain text row lands at ~26px, while the building-cost row, whose value is
    // `null` on the ticked branch, collapses to the label's ~19px and reads visibly
    // SHORTER than its single-line neighbours (user: "แถวรวมค่าอาคารมันความสูงมันน้อยกว่าแถวอื่นๆ
    // ที่เป็นแถวเดียว เช่น หน่วยราคา มูลค่าสุทธิ"). The bug is that height is coupled to whatever
    // the value cell happens to hold; a floor on the row breaks that coupling, so every
    // single-line row is 32px whatever it contains — the property mock:589 gets for
    // free by putting a line-height on every cell. Note the direction: this row was
    // SHORT, not tall. An early measurement of it read 56px and pointed the opposite
    // way; the code above is why the user's eye was right and that number wasn't.
    //
    // Why a row floor rather than that line-height copied literally: the mock's cells
    // are plain `<span>`s, so a line-height IS their height. Ours aren't. The value
    // cell below is `flex flex-col`, and a flex container's height comes from its
    // items, so a line-height there contributes nothing — inert exactly where the 26px
    // inputs live. And the hint is a real second grid row, so 32px there would ADD a
    // full line to every already-tall row. Flooring the row also leaves input+hint rows
    // at ~50px, which is about what the mock's own `.vf` rows (mock:598) come to;
    // flooring the label cell instead would stack 32px above the hint and overshoot.
    //
    // `items-center` keeps doing its job unchanged — it now centres the label against a
    // row that is at least 32px — and the hint keeps its own grid row, so neither
    // earlier fix is undone.
    <div
      className={`grid ${KV_GRID_COLS} min-h-[32px] items-center border-b border-b-[#eef2f2] last:border-b-0`}
    >
      <div className="px-[12px] text-gray-500">{label}</div>
      {/* Bottom padding moves to the hint row when there is one, so the row's total
          vertical rhythm (py-1 outside, gap-0.5 between the stacked lines) is
          unchanged from when value and hint shared one cell. */}
      <div
        className={`px-[12px] pt-1 ${hint ? '' : 'pb-1'} flex flex-col items-end gap-0.5 text-right tabular-nums`}
      >
        {value}
      </div>
      {/* mock:585 — `.kv .u { padding-left: 0 }`, not the uniform px-[12px] the other
          two cells get. Gives the unit 12px more usable width before it needs to grow
          past its 44px floor. */}
      <div className="pl-0 pr-[12px] text-[#8a96a0] text-right whitespace-nowrap">{unit}</div>
      {/* Same cell shape as the value cell above (a `hint` can itself be two stacked
          lines — an edited badge over a formula sub-line), just placed on the grid's
          second row under the value column. */}
      {hint && (
        <div className="col-start-2 px-[12px] pt-0.5 pb-1 flex flex-col items-end gap-0.5 text-right tabular-nums">
          {hint}
        </div>
      )}
    </div>
  );
}

/**
 * A `.kv` row that spans all three columns instead of splitting into label/value/
 * unit — mock:1526's mixed-unit warning (`grid-column: 1/-1`), the only thing in
 * this card that isn't a label/value pair. Left-aligned, not right — it's a
 * sentence, not a number.
 */
export function KvWarningRow({ children }: { children: ReactNode }) {
  return (
    // Same `last:border-b-0` as `KvRow` above, for the same reason — this row carries
    // its own `border-b` and is a sibling in the same stack, so it can be the last one
    // rendered and collide with the card border exactly as a `KvRow` would. It sits
    // near the top of every current layout, so today the rule is inert here; it's
    // present so the two row types can't disagree if the order ever changes.
    <div className={`grid ${KV_GRID_COLS} border-b border-b-[#eef2f2] last:border-b-0`}>
      <div className="col-span-3 px-[12px] py-1.5 text-[11.5px] text-amber-700 bg-amber-50">
        {children}
      </div>
    </div>
  );
}

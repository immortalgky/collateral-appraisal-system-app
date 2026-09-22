/**
 * Table styling for the Hypothesis unit-details tables — the mock's `table.g` (mock v94:143-151,
 * 191): 26px header on #f8fafa, 25px body rows with hairline #eef2f2 right/bottom borders, a bold
 * total row with a stronger top rule, no outer radius. Colours are hex on purpose (Tailwind v4's
 * palette is OKLCH and does not match the mock's values).
 */
import type { ReactNode } from 'react';

export const UT_TABLE = 'w-full border-separate border-spacing-0 text-[12px] tabular-nums';
export const UT_TH =
  'px-[8px] py-0 leading-[26px] font-medium text-[#55636f] bg-[#f8fafa] border-b border-b-[#e3e9e8] border-r border-r-[#eef2f2] whitespace-nowrap sticky top-0 z-[2]';
export const UT_TD =
  'px-[8px] py-0 leading-[25px] bg-white border-b border-b-[#eef2f2] border-r border-r-[#eef2f2] whitespace-nowrap';
export const UT_FIN =
  'px-[8px] py-0 leading-[25px] font-bold bg-[#f8fafa] border-t border-t-[#cbd5d3] border-b border-b-[#eef2f2] border-r border-r-[#eef2f2] whitespace-nowrap';

// mock `.mpill.mA/.mB/.mC` — accent, warn, ok washes, cycled by the model's position.
const PILL_TONES = [
  'bg-[#f0fdfa] text-[#0f766e]',
  'bg-[#fffbeb] text-[#b45309]',
  'bg-[#f0fdf4] text-[#15803d]',
];

/** Coloured model/type chip; `index` is the model's position in its list (stable per model). */
export function ModelPill({ index, children }: { index: number; children: ReactNode }) {
  return (
    <span
      className={`inline-block px-[7px] rounded-[5px] text-[11px] leading-[18px] font-medium ${
        PILL_TONES[((index % PILL_TONES.length) + PILL_TONES.length) % PILL_TONES.length]
      }`}
    >
      {children}
    </span>
  );
}

/** name → position of first appearance, so a model keeps its colour across both tables. */
export function pillIndexer(names: (string | null | undefined)[]) {
  const order = new Map<string, number>();
  for (const n of names) {
    const key = (n ?? '').trim().toLowerCase();
    if (key && !order.has(key)) order.set(key, order.size);
  }
  return (name: string | null | undefined) => order.get((name ?? '').trim().toLowerCase()) ?? 0;
}

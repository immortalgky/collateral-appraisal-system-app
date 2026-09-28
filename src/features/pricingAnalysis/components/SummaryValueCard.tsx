import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { NumberInput } from '@/shared/components/inputs';
import { KvRow } from './KvRow';
import { roundToThousand } from '../domain/calculation';
import { fmt } from '../domain/formatters';

/**
 * The สรุปมูลค่า tab's two-card grid (mock:585 `.summary`) — Leasehold, Profit Rent and
 * DCF HBU each render two cards inside this: side by side, each 440–540px, wrapping to
 * one column only when the pane can't fit two at 440.
 *
 * Not the mock's `minmax(440px, 540px)` verbatim: with a definite max, `auto-fit` counts
 * repeats using the MAX (CSS Grid §7.2.3.2), so two columns needed 540+16+540 = 1096px and
 * a 1042px pane still stacked. `1fr` as the max makes the count use 440 (two columns
 * from ~896px), and `max-w` bounds the grid (2×540 + 16 gap + 32 padding = 1128);
 * SummaryCard's own max-w keeps a lone card at ≤540 too.
 */
export function SummaryGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(440px,1fr))] max-w-[1128px] items-start gap-[16px] py-[14px] px-[16px]">
      {children}
    </div>
  );
}

/**
 * One `.panel` card (mock:2530 `kv()`) — a header band over a stack of `KvRow`s. Shared
 * by both the value card and the notes card so the two read as one visual family, same
 * as `WQSAdjustFinalValueSection.tsx`'s card shell.
 */
export function SummaryCard({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    // max-w — SummaryGrid's max-w caps the grid, not the card; with one track the card
    // would otherwise stretch to the whole pane (808px at 1366). Mock cards are ≤540.
    <div className="min-w-0 max-w-[540px] border border-[#e3e9e8] rounded-[10px] overflow-hidden">
      <h4 className="m-0 px-[12px] py-[8px] text-[12.5px] font-semibold text-gray-800 bg-[#f8fafa] border-b border-[#e3e9e8]">
        {title}
      </h4>
      <div className="flex flex-col text-[12.5px]">{children}</div>
    </div>
  );
}

/**
 * The card's final "มูลค่าตามวิธี" row (mock:2520 `valueRow`) — an editable, thousand-
 * rounded value with a rounding-hint / edited-badge hint underneath, same behaviour as
 * `WQSAdjustFinalValueSection.tsx`'s `editedBadge` but presentational rather than bound to
 * an RHF field path (Leasehold/Profit Rent already read this field via plain
 * `useController`, not the WQS field-path system).
 *
 * `computedValue` is the RAW (pre-rounding) system figure — the hint quotes it, and its
 * `roundToThousand` is what the "edited" comparison uses. The revert button clears the override
 * (null) rather than pinning today's rounded figure, so later recalculations keep flowing through.
 */
export function IndicatedValueRow({
  label,
  computedValue,
  value,
  onChange,
  disabled,
}: {
  label: ReactNode;
  computedValue: number;
  value: number;
  /** null = no override — "follow the computed value". Never 0 for an emptied box: the backend
   *  treats 0 as a real typed-over total and would save the method at 0 baht. */
  onChange: (next: number | null) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const rounded = roundToThousand(computedValue);
  const delta = value - rounded;
  // While the box is being cleared and retyped it must stay empty: the override is already null,
  // so the caller's fallback (the computed figure) would otherwise refill the text mid-typing and
  // swallow the next keystroke. On blur the computed figure shows again.
  const [editingEmpty, setEditingEmpty] = useState(false);

  return (
    <KvRow
      label={label}
      value={
        <NumberInput
          value={editingEmpty ? null : value}
          onChange={e => {
            setEditingEmpty(e.target.value == null);
            onChange(e.target.value ?? null);
          }}
          onBlur={() => setEditingEmpty(false)}
          decimalPlaces={2}
          disabled={disabled}
          className="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold! text-[12.5px]! h-[26px]! py-0! px-[5px]! rounded-[4px]! w-full!"
        />
      }
      unit={t('finalValue.baht')}
      hint={
        delta === 0 ? (
          <span className="text-[10.5px] text-gray-400">
            {t('comparativeAnalysis.roundingHint', { value: fmt(computedValue) })}
          </span>
        ) : (
          <span className="text-[10.5px] text-gray-400 inline-flex items-center gap-1 flex-wrap justify-end">
            <span className="font-semibold text-[#b45309]">{t('comparativeAnalysis.editedLabel')}</span>
            {t('comparativeAnalysis.differsFromComputed', {
              value: `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}`,
            })}
            <span>·</span>
            <button type="button" className="text-primary hover:underline" onClick={() => onChange(null)}>
              {t('comparativeAnalysis.useComputedValue')}
            </button>
          </span>
        )
      }
    />
  );
}

/** Plain read-only figure row — `valueDisplay` in WQSAdjustFinalValueSection.tsx. */
export function DisplayValueRow({ label, value, unit }: { label: ReactNode; value: number; unit?: ReactNode }) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <KvRow
      label={label}
      value={<span className="font-semibold text-gray-800 tabular-nums">{fmt(value)}</span>}
      unit={unit ?? t('finalValue.baht')}
    />
  );
}

/**
 * The right-hand "หมายเหตุและสมมติฐาน" card — always open (mock:2506's textarea has no
 * collapse toggle), unlike the collapsible `RemarkSection.tsx` used by the other methods.
 * Not built on `RemarkSection`: that component owns its own accordion behaviour and
 * hardcoded English copy for every one of its callers, so changing its shape here would
 * change it everywhere else too.
 */
export function SummaryNotesCard({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <SummaryCard title={t('remark.title')}>
      <div className="p-[12px]">
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={t('remark.placeholder')}
          rows={4}
          disabled={disabled}
          className="w-full text-xs text-gray-700 bg-transparent border border-gray-200 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed"
        />
      </div>
    </SummaryCard>
  );
}

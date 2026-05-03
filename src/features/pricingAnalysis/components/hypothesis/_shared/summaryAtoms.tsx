/**
 * Shared atoms for Hypothesis Summary tabs (Land & Building + Condominium).
 *
 * The fixed-width column system (COL) keeps the rate input, derived total,
 * ratio %, and remove cells aligned across all row types regardless of section.
 * Suffix slot uses a negative left margin to sit flush against the rate-unit
 * label; long suffixes wrap to a second line within the slot.
 */
import type { ReactNode } from 'react';
import { Controller } from 'react-hook-form';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { Icon } from '@/shared/components';
import { fmt } from '../../../domain/formatters';
import { FieldTooltip } from './FieldTooltip';

// ─── Shared column widths ─────────────────────────────────────────────────────

// NOTE: `suffix` uses `-ml-16` (-64px) to pull itself into rateUnit's whitespace
// so suffix text sits next to the "%" sign. This is HARD-COUPLED to `rateUnit: w-[80px]`
// (16px ≈ "%" glyph width remains visible). If rateUnit width changes, recompute the
// negative margin to keep alignment.
export const COL = {
  rate: 'w-[140px]',                // rate value (number or input) — right-aligned
  rateUnit: 'w-[80px]',             // "Baht/Unit", "Baht/Sq.Wa", "%"
  suffix: 'w-[140px] -ml-16',       // italic descriptive text; -ml-16 paired with rateUnit=80px
  mid: 'w-[112px]',                 // qty (60) + qtyUnit (44) + gap (8)
  total: 'w-[140px]',               // derived total — right-aligned
  totalUnit: 'w-[40px]',            // "Baht"
  ratio: 'w-[68px]',                // ratio %
  remove: 'w-[20px]',
} as const;

// ─── Section shell ────────────────────────────────────────────────────────────

export function SectionPrimary({
  id,
  title,
  children,
}: {
  /** Optional DOM id used for in-page scroll targets (e.g. from viz click-through). */
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className="rounded-lg border border-gray-200 overflow-hidden shadow-sm scroll-mt-4"
    >
      <div className="bg-gray-100 px-5 py-3 border-b border-gray-200">
        <h4 className="text-sm font-semibold text-gray-700 tracking-wide">{title}</h4>
      </div>
      <div className="divide-y divide-gray-100 bg-white">{children}</div>
    </div>
  );
}

export function SubSectionLabel({ label }: { label: string }) {
  return (
    <div className="px-5 py-2 bg-white">
      <span className="text-[11px] font-medium text-gray-500 uppercase tracking-wide">{label}</span>
    </div>
  );
}

// ─── Generic field row (label on left, freeform content on right) ────────────

export function FieldRow({
  label,
  alignTop,
  tooltip,
  children,
}: {
  label: string;
  alignTop?: boolean;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`grid grid-cols-12 gap-3 px-5 py-3 ${
        alignTop ? 'items-start' : 'items-center'
      }`}
    >
      <div className="col-span-2 text-xs font-medium text-gray-700 flex items-center gap-0.5">
        {label}
        {tooltip && <FieldTooltip text={tooltip} />}
      </div>
      <div className="col-span-10 flex items-center gap-3 flex-wrap">{children}</div>
    </div>
  );
}

export function DerivedValue({
  value,
  unit,
  emphasize,
}: {
  value?: number | null;
  unit?: string;
  emphasize?: boolean;
}) {
  return (
    <div className="ml-auto flex items-center gap-2">
      <span
        className={`min-w-[110px] text-right tabular-nums text-xs ${
          emphasize ? 'font-semibold text-primary' : 'font-medium text-gray-800'
        }`}
      >
        {fmt(value)}
      </span>
      {unit && <span className="text-[11px] text-gray-500 w-[68px]">{unit}</span>}
    </div>
  );
}

export function PercentExpression({
  percent,
  ofLabel,
  highlightPercent,
}: {
  percent?: number | null;
  ofLabel: string;
  highlightPercent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500">Considered at</span>
      <span
        className={`min-w-[80px] text-right tabular-nums text-xs font-medium ${
          highlightPercent ? 'text-rose-600' : 'text-gray-800'
        }`}
      >
        {percent !== null && percent !== undefined ? `${Number(percent).toFixed(2)} %` : '-'}
      </span>
      <span className="text-[11px] text-gray-500">{ofLabel}</span>
    </div>
  );
}

// ─── Project-cost-style row: input → optional qty/suffix → derived total + ratio ──

export function PdcDerivedRow({
  label,
  rateInput,
  rateUnit,
  rateSuffix,
  qtyLabel,
  qtyValue,
  qtyUnit,
  total,
  ratioPercent,
  compact,
  tooltip,
}: {
  label: string;
  rateInput: ReactNode;
  rateUnit: string;
  rateSuffix?: string;
  /** Label rendered before qtyValue in the mid column (e.g. "Area", "Quantity", "Average"). */
  qtyLabel?: string;
  qtyValue?: number | null;
  qtyUnit?: string;
  total?: number | null;
  ratioPercent?: number | null;
  /** Drops the trailing ratio + remove placeholders (no UserAddedRow alignment needed). */
  compact?: boolean;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center px-5 py-2.5 gap-2">
      <div className="flex-1 text-xs font-medium text-gray-700 min-w-0 flex items-center gap-0.5">
        <span>{label}</span>
        {tooltip && <FieldTooltip text={tooltip} />}
      </div>
      <div className={`${COL.rate} flex justify-end shrink-0`}>{rateInput}</div>
      <span className={`${COL.rateUnit} text-[11px] text-gray-500 shrink-0`}>{rateUnit}</span>
      <div className={`${COL.suffix} shrink-0`}>
        {rateSuffix && (
          <span className="text-[11px] text-gray-400 italic leading-tight block">
            {rateSuffix}
          </span>
        )}
      </div>
      <div className={`${COL.mid} flex items-center justify-end gap-2 shrink-0`}>
        {!rateSuffix && qtyValue !== null && qtyValue !== undefined && (
          <>
            {qtyLabel && (
              <span className="text-[11px] text-gray-500">{qtyLabel}</span>
            )}
            <span className="text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(qtyValue)}
            </span>
            <span className="text-[11px] text-gray-500 w-[44px]">{qtyUnit ?? ''}</span>
          </>
        )}
      </div>
      <span className={`${COL.total} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
        {total !== null && total !== undefined ? fmt(total) : ''}
      </span>
      <span className={`${COL.totalUnit} text-[11px] text-gray-500 shrink-0`}>
        {total !== null && total !== undefined ? 'Baht' : ''}
      </span>
      {!compact && (
        <>
          <span className={`${COL.ratio} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
            {ratioPercent !== null && ratioPercent !== undefined ? `${Number(ratioPercent).toFixed(2)} %` : ''}
          </span>
          <span className={`${COL.remove} shrink-0`} />
        </>
      )}
    </div>
  );
}

export function PdcTotalRow({
  label,
  total,
  ratioPercent,
}: {
  label: string;
  total?: number | null;
  ratioPercent?: number | null;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-200/70 border-t border-gray-300 items-center">
      <div className="col-span-4 text-xs font-bold text-gray-900">{label}</div>
      <div className="col-span-8 flex items-center gap-2 ml-auto justify-end">
        <span className="min-w-[140px] text-right tabular-nums text-sm font-bold text-gray-900">
          {fmt(total)}
        </span>
        <span className="text-[11px] text-gray-600 whitespace-nowrap">Baht</span>
        {ratioPercent !== null && ratioPercent !== undefined && (
          <span className="min-w-[80px] text-right tabular-nums text-sm font-bold text-gray-900">
            {`${Number(ratioPercent).toFixed(2)} %`}
          </span>
        )}
      </div>
    </div>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="px-5 py-2 bg-white">
      <button
        type="button"
        onClick={onClick}
        className="w-full px-4 py-2 text-xs font-medium text-primary border border-dashed border-primary/40 rounded-md hover:bg-primary/5 transition-colors"
      >
        + {label}
      </button>
    </div>
  );
}

// ─── User-added row (description + amount + delete) ──────────────────────────

export function UserAddedRow({
  descriptionInput,
  amountInput,
  amountValue,
  ratio,
  onRemove,
}: {
  descriptionInput: ReactNode;
  amountInput: ReactNode;
  /** Live amount value (mirrored on the right as the row total). */
  amountValue?: number | null;
  /** Server-computed (or client-derived) ratio %. */
  ratio?: number | null;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center px-5 py-2.5 gap-2 bg-amber-50/30">
      <div className="flex-1 min-w-0">{descriptionInput}</div>
      <div className={`${COL.rate} flex justify-end shrink-0`}>{amountInput}</div>
      <span className={`${COL.rateUnit} text-[11px] text-gray-500 shrink-0`}>Baht</span>
      <span className={`${COL.suffix} shrink-0`} />
      <span className={`${COL.mid} shrink-0`} />
      <span className={`${COL.total} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
        {fmt(amountValue)}
      </span>
      <span className={`${COL.totalUnit} text-[11px] text-gray-500 shrink-0`}>Baht</span>
      <span className={`${COL.ratio} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
        {ratio !== null && ratio !== undefined ? `${Number(ratio).toFixed(2)} %` : '-'}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove row"
        className={`${COL.remove} h-[20px] inline-flex items-center justify-center text-rose-500 hover:text-rose-700 shrink-0`}
      >
        <Icon name="xmark" style="solid" className="size-3.5" />
      </button>
    </div>
  );
}

// ─── Final-value section atoms ────────────────────────────────────────────────

export function FvDerivedRow({
  label,
  value,
  unit,
  emphasize,
  tooltip,
}: {
  label: string;
  value?: number | null;
  unit?: string;
  emphasize?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`flex items-center px-5 py-2.5 gap-2 ${
        emphasize ? 'bg-primary/5' : ''
      }`}
    >
      <div
        className={`flex-1 text-xs min-w-0 flex items-center gap-0.5 ${
          emphasize ? 'font-semibold text-primary' : 'font-medium text-gray-700'
        }`}
      >
        <span>{label}</span>
        {tooltip && <FieldTooltip text={tooltip} />}
      </div>
      <span
        className={`min-w-[160px] text-right tabular-nums shrink-0 ${
          emphasize ? 'text-sm font-bold text-primary' : 'text-xs font-medium text-gray-800'
        }`}
      >
        {fmt(value)}
      </span>
      {unit && (
        <span
          className={`text-[11px] shrink-0 whitespace-nowrap ${
            emphasize ? 'text-primary/70' : 'text-gray-500'
          }`}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

export function FvInputRow({
  label,
  rateInput,
  rateUnit,
  rateSuffix,
  tooltip,
}: {
  label: string;
  rateInput: ReactNode;
  rateUnit: string;
  rateSuffix?: string;
  tooltip?: string;
}) {
  return (
    <div className="flex items-center px-5 py-2.5 gap-2">
      <div className="flex-1 text-xs font-medium text-gray-700 min-w-0 flex items-center gap-0.5">
        <span>{label}</span>
        {tooltip && <FieldTooltip text={tooltip} />}
      </div>
      <div className="w-[140px] flex justify-end shrink-0">{rateInput}</div>
      <span className="w-[20px] text-[11px] text-gray-500 shrink-0">{rateUnit}</span>
      {rateSuffix && (
        <span className="text-[11px] text-gray-400 italic whitespace-nowrap shrink-0 ml-1">
          {rateSuffix}
        </span>
      )}
    </div>
  );
}

// ─── Number input bound to an RHF Controller ─────────────────────────────────

export function InlineNumberInput({
  control,
  name,
  decimalPlaces = 2,
  fillSlot = false,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  name: string;
  decimalPlaces?: number;
  /** When true, fill the parent column (use inside fixed-width COL.rate slots). */
  fillSlot?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <NumberInput
          value={field.value}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          decimalPlaces={decimalPlaces}
          fullWidth={fillSlot}
          className={fillSlot ? '!text-xs' : '!text-xs !w-[110px]'}
        />
      )}
    />
  );
}

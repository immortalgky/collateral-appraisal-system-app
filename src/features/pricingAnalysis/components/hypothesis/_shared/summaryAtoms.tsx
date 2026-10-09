/**
 * Shared atoms for the Hypothesis Summary tabs (Land & Building + Condominium).
 *
 * The summary is ONE ledger table (mock v94 `ledgerHtml`): Item | Rate / Setting | Quantity |
 * Total | Ratio (L&B only), every row reading "rate × quantity = total", grouped under
 * collapsible section bands. Rows are dense (26px) and every value is px-sized — root font-size
 * is 13px here, so rem utilities would shrink ×0.8125.
 */
import { type ReactNode, createContext, useContext, useState } from 'react';
import { Controller, useController } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { Icon } from '@/shared/components';
import { fmt } from '../../../domain/formatters';
import { FieldTooltip } from './FieldTooltip';

// ─── Calculating context ──────────────────────────────────────────────────────
// Wrap a summary tab in <IsCalculatingProvider value={true}> while a preview request is
// in-flight; derived cells swap their number for an animated placeholder.

const IsCalculatingContext = createContext(false);

export function IsCalculatingProvider({
  value,
  children,
}: {
  value: boolean;
  children: ReactNode;
}) {
  return <IsCalculatingContext.Provider value={value}>{children}</IsCalculatingContext.Provider>;
}

function CalcPlaceholder() {
  return (
    <span className="inline-block h-[12px] w-[64px] rounded bg-gray-200 animate-pulse align-middle" />
  );
}

/** A computed number (2 dp, or whole for counts/months), or a placeholder while previewing. */
export function Num({ value, int }: { value?: number | null; int?: boolean }) {
  const isCalculating = useContext(IsCalculatingContext);
  if (isCalculating) return <CalcPlaceholder />;
  if (value === null || value === undefined) return null;
  return <>{int ? Math.round(value).toLocaleString('en-US') : fmt(value)}</>;
}

export const pct = (x?: number | null) =>
  x === null || x === undefined ? '' : `${Number(x).toFixed(2)} %`;

// ─── Table shell ──────────────────────────────────────────────────────────────

const RatioContext = createContext(false);
const TD = 'px-[8px] py-0 h-[26px] leading-[25px] border-b border-[#eef2f2] align-middle';

/**
 * `table-layout: fixed` + a colgroup: in auto layout a cell's max-width is ignored, and the
 * long English labels push the numeric columns off screen at 1366px.
 */
export function LedgerTable({ ratio = false, children }: { ratio?: boolean; children: ReactNode }) {
  const { t } = useTranslation('pricingAnalysis');
  const th =
    'px-[8px] py-0 h-[27px] font-semibold text-gray-600 bg-gray-50 border-b border-gray-200';
  return (
    <RatioContext.Provider value={ratio}>
      <table className="w-full table-fixed border-collapse text-[12px]">
        <colgroup>
          <col />
          <col className="w-[250px]" />
          <col className="w-[190px]" />
          <col className="w-[150px]" />
          {ratio && <col className="w-[80px]" />}
        </colgroup>
        <thead className="sticky top-0 z-[3]">
          <tr>
            <th className={`${th} text-left`}>{t('hypothesis.ledger.cols.item')}</th>
            <th className={`${th} text-left`}>{t('hypothesis.ledger.cols.rate')}</th>
            <th className={`${th} text-left`}>{t('hypothesis.ledger.cols.qty')}</th>
            <th className={`${th} text-right`}>{t('hypothesis.ledger.cols.total')}</th>
            {ratio && <th className={`${th} text-right`}>{t('hypothesis.ledger.cols.ratio')}</th>}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </RatioContext.Provider>
  );
}

/** A collapsible section band. `id` is the jump-bar target (`hyp-sec-<id>`). */
export function LedgerBand({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  const ratio = useContext(RatioContext);
  const [open, setOpen] = useState(true);
  return (
    <>
      <tr id={`hyp-sec-${id}`} className="scroll-mt-[27px]">
        <td
          colSpan={ratio ? 5 : 4}
          className="px-[8px] py-0 h-[26px] leading-[25px] bg-[#edf1f1] font-semibold text-gray-700 cursor-pointer select-none border-b border-[#e3e9e8]"
          onClick={() => setOpen(o => !o)}
        >
          <span
            className={clsx('inline-block w-[12px] transition-transform', !open && '-rotate-90')}
          >
            ▾
          </span>{' '}
          {title}
        </td>
      </tr>
      {open && children}
    </>
  );
}

/**
 * One ledger row. `tone`: `tot` = a section total (bold on grey), `final` = the method result
 * (green — the only green on the page besides the top-bar price).
 */
export function LedgerRow({
  label,
  tip,
  sub,
  tone,
  rate,
  qty,
  total,
  totalUnit,
  ratio,
  warn,
}: {
  label: ReactNode;
  tip?: string;
  sub?: boolean;
  tone?: 'tot' | 'final' | 'user';
  rate?: ReactNode;
  qty?: ReactNode;
  total?: ReactNode;
  totalUnit?: string;
  ratio?: ReactNode;
  warn?: boolean;
}) {
  const hasRatio = useContext(RatioContext);
  const bg =
    tone === 'tot'
      ? 'bg-gray-50 font-semibold'
      : tone === 'final'
        ? 'bg-[#f0fdfa] font-bold text-[#0f766e]'
        : tone === 'user'
          ? 'bg-amber-50/40'
          : '';
  return (
    <tr className={bg}>
      <td className={clsx(TD, 'truncate', sub ? 'pl-[22px] text-gray-600' : 'text-gray-800')}>
        <span className={clsx('inline-flex items-center gap-[2px]', warn && 'text-rose-600')}>
          {label}
          {tip && <FieldTooltip text={tip} />}
        </span>
      </td>
      <td className={clsx(TD, 'whitespace-nowrap')}>{rate}</td>
      <td className={clsx(TD, 'whitespace-nowrap')}>{qty}</td>
      <td className={clsx(TD, 'text-right tabular-nums whitespace-nowrap')}>
        {total}
        {total !== undefined && totalUnit && (
          <span className="text-[11px] text-gray-400 ml-[4px]">{totalUnit}</span>
        )}
      </td>
      {hasRatio && <td className={clsx(TD, 'text-right tabular-nums text-gray-500')}>{ratio}</td>}
    </tr>
  );
}

// ─── Cell helpers ─────────────────────────────────────────────────────────────

const Unit = ({ children }: { children?: ReactNode }) =>
  children ? <span className="text-[10.5px] text-gray-400 ml-[4px]">{children}</span> : null;
const Note = ({ children }: { children?: ReactNode }) =>
  children ? <span className="text-[10.5px] text-gray-400 ml-[6px]">{children}</span> : null;

/** Rate cell with an editable number: `[input] unit  note`. */
export function RateInput({
  control,
  name,
  unit,
  note,
  decimals = 2,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  name: string;
  unit?: string;
  note?: ReactNode;
  decimals?: number;
}) {
  return (
    <span className="inline-flex items-center">
      <span className="inline-block w-[110px]">
        <InlineNumberInput control={control} name={name} decimalPlaces={decimals} fillSlot />
      </span>
      <Unit>{unit}</Unit>
      <Note>{note}</Note>
    </span>
  );
}

/** Rate cell with a read-only value: `**value** unit  note`. */
export function RateValue({
  value,
  unit,
  note,
  danger,
}: {
  value: ReactNode;
  unit?: string;
  note?: ReactNode;
  danger?: boolean;
}) {
  return (
    <span className="inline-flex items-center">
      <b className={clsx('tabular-nums font-semibold', danger ? 'text-rose-600' : 'text-gray-800')}>
        {value}
      </b>
      <Unit>{unit}</Unit>
      <Note>{note}</Note>
    </span>
  );
}

/** Quantity cell: `× value unit`. */
export function Qty({ value, unit, int }: { value?: number | null; unit?: string; int?: boolean }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="inline-flex items-center tabular-nums">
      <span className="text-gray-400 mr-[4px]">×</span>
      <Num value={value} int={int} />
      <Unit>{unit}</Unit>
    </span>
  );
}

/** Full-width remark textarea row (Land section). */
export function LedgerRemarkRow({ control, name }: { control: unknown; name: string }) {
  const { t } = useTranslation('pricingAnalysis');
  const ratio = useContext(RatioContext);
  return (
    <tr>
      <td colSpan={ratio ? 5 : 4} className="px-[8px] py-[4px] border-b border-[#eef2f2]">
        <Controller
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          control={control as any}
          name={name as never}
          render={({ field }) => (
            <textarea
              {...field}
              value={(field.value as string | null) ?? ''}
              rows={2}
              aria-label="Remark"
              placeholder={t('hypothesis.ledger.remarkPlaceholder')}
              className="w-full text-[12px] border border-gray-200 rounded-[6px] px-[8px] py-[4px] resize-y focus:outline-none focus:ring-1 focus:ring-primary/30 placeholder:text-gray-400"
            />
          )}
        />
      </td>
    </tr>
  );
}

/** Dashed "+ Add …" button row under a section's user-added rows (L&B only). */
export function LedgerAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  const ratio = useContext(RatioContext);
  return (
    <tr>
      <td colSpan={ratio ? 5 : 4} className="px-[8px] py-[3px] border-b border-[#eef2f2]">
        <button
          type="button"
          onClick={onClick}
          className="border border-dashed border-primary text-primary text-[11px] rounded-[6px] px-[8px] leading-[18px] hover:bg-primary/5"
        >
          + {label}
        </button>
      </td>
    </tr>
  );
}

/**
 * A user-added cost row (L&B, HANDOFF item 10): description in the item column, the delete
 * button + "กรอกยอดเอง" in the settings column, the amount in the total column.
 */
export function LedgerUserRow({
  descriptionInput,
  amountInput,
  ratio,
  onRemove,
}: {
  descriptionInput: ReactNode;
  amountInput: ReactNode;
  ratio?: number | null;
  onRemove: () => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <LedgerRow
      tone="user"
      label={<span className="block w-full">{descriptionInput}</span>}
      rate={
        <span className="inline-flex items-center gap-[6px]">
          <button
            type="button"
            onClick={onRemove}
            title={t('hypothesis.ledger.remove')}
            aria-label={t('hypothesis.ledger.remove')}
            className="size-[20px] inline-flex items-center justify-center text-rose-500 hover:text-rose-700"
          >
            <Icon name="trash-can" style="regular" className="size-[12px]" />
          </button>
          <span className="text-[11px] text-gray-400">{t('hypothesis.ledger.enteredAmount')}</span>
        </span>
      }
      total={<span className="inline-block w-[130px]">{amountInput}</span>}
      ratio={pct(ratio)}
    />
  );
}

/**
 * The method result row — ONE field (HANDOFF item 3): pre-filled with the system's ±10,000
 * rounded total, typing over it stores `indicatedValue`, "ใช้ค่าที่คำนวณ" clears it to null so
 * the computed total applies again. Null (not 0) is what "not overridden" means on the wire.
 */
export function LedgerIndicatedValueRow({
  control,
  computed,
  tip,
  disabled,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any;
  computed?: number | null;
  tip?: string;
  disabled?: boolean;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const { field } = useController({ control, name: 'indicatedValue' });
  const override = field.value as number | null | undefined;
  const edited = override !== null && override !== undefined;
  const delta = edited ? override - (computed ?? 0) : 0;
  return (
    <LedgerRow
      tone="final"
      tip={tip}
      label={
        <>
          {t('hypothesis.ledger.indicatedValue')}
          <span className="text-[10.5px] font-normal text-gray-500 ml-[6px]">
            {t('hypothesis.ledger.totalAssetValue')}
          </span>
        </>
      }
      rate={
        <span className="text-[10.5px] font-normal text-gray-500">
          {edited ? (
            <>
              <span className="font-semibold text-[#b45309]">{t('hypothesis.ledger.edited')}</span>{' '}
              {t('hypothesis.ledger.differs', {
                value: `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))}`,
              })}
              {!disabled && (
                <>
                  {' · '}
                  <button
                    type="button"
                    className="text-primary hover:underline"
                    onClick={() => field.onChange(null)}
                  >
                    {t('hypothesis.ledger.useCalculated')}
                  </button>
                </>
              )}
            </>
          ) : (
            t('hypothesis.ledger.roundingHint', { value: fmt(computed ?? 0) })
          )}
        </span>
      }
      total={
        <span className="inline-block w-[140px]">
          <NumberInput
            value={edited ? override : (computed ?? null)}
            onChange={e => field.onChange(e.target.value)}
            decimalPlaces={2}
            disabled={disabled}
            dense
            aria-label={t('hypothesis.ledger.indicatedValue')}
            className="bg-[#f0fdfa]! border-[#99f6e4]! text-[#0f766e]! font-bold!"
          />
        </span>
      }
    />
  );
}

/** Section chips for the tab toolbar — each scrolls its band into view. */
export function LedgerJumpBar({ sections }: { sections: { id: string; short: string }[] }) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <div className="flex gap-[3px] flex-nowrap" aria-label={t('hypothesis.ledger.jumpAria')}>
      {sections.map(s => (
        <button
          key={s.id}
          type="button"
          onClick={() =>
            document.getElementById(`hyp-sec-${s.id}`)?.scrollIntoView({ block: 'start' })
          }
          className="text-[11px] h-[22px] px-[7px] rounded-[6px] border border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary whitespace-nowrap"
        >
          {s.short}
        </button>
      ))}
    </div>
  );
}

/** Ledger on the left, charts in a 330px aside on the right while the chart toggle is on. */
export function LedgerWithChart({ chart, children }: { chart?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={clsx(
        'grid items-start',
        chart ? 'grid-cols-[minmax(0,1fr)_330px]' : 'grid-cols-1',
      )}
    >
      <div className="min-w-0">{children}</div>
      {chart && (
        <aside className="sticky top-0 border-l border-gray-200 px-[14px] pt-[10px] pb-[16px] bg-white flex flex-col gap-[12px]">
          {chart}
        </aside>
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
  /** When true, fill the parent slot instead of the default 110px. */
  fillSlot?: boolean;
}) {
  return (
    <Controller
      control={control}
      name={name as never}
      render={({ field }) => (
        <NumberInput
          value={field.value}
          onChange={e => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          decimalPlaces={decimalPlaces}
          fullWidth={fillSlot}
          // dense: the default NumberInput is ~32px tall and would break the 26px rows.
          dense
          className={fillSlot ? undefined : 'w-[110px]!'}
        />
      )}
    />
  );
}

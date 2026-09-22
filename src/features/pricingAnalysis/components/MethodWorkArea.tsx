import { createContext, useContext, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { LeaseTimelineBar } from './LeaseTimelineBar';

/**
 * mock:1009-1016 — a method's calc-tab body: a fixed 268px input rail on the left
 * (mock:277 `.sideL`), border-right, scrolling independently of the main column
 * (chart + table) beside it. Shared by every method with this shape — Profit Rent and
 * Leasehold today, DCF later (mock:2483's `sideL` switch already has a `case 'DCF'`
 * waiting). The rail's field content is unknown to this component; callers pass it as
 * `rail` so this only owns the 268px/border/scroll mechanics.
 *
 * `flex-1 min-h-0` on this row, and on the main column, is the same bounded-height
 * chain WQSForm's calc tab already relies on (WQSScoringSection.tsx:399) so the table's
 * own ScrollableTableContainer can still open its own `h-full` scroll region — this
 * must be the tab's entire content, not nested inside a taller fragment above it, or
 * the chain breaks and both `overflow-y-auto`s fight the page for the same scrollbar.
 */
// Compact rail: set by MethodWorkArea, read by MethodRailField — so a caller flips one
// prop instead of threading a flag through every field.
const RailCompactCtx = createContext(false);

export function MethodWorkArea({
  showRail,
  rail,
  children,
  compact = false,
}: {
  showRail: boolean;
  rail: ReactNode;
  children: ReactNode;
  /** 224px rail with 64px controls — for rails of short figures (DCF rates/years).
   *  Leasehold/Profit Rent keep the 268px/128px default their money fields need. */
  compact?: boolean;
}) {
  return (
    <div className="flex flex-1 min-h-0">
      {showRail && (
        <aside
          className={clsx(
            'shrink-0 border-r border-gray-200 overflow-y-auto px-3 py-2 pb-4',
            compact ? 'w-[224px]' : 'w-[268px]',
          )}
        >
          <RailCompactCtx.Provider value={compact}>
            <div className="grid gap-0.5 content-start">{rail}</div>
          </RailCompactCtx.Provider>
        </aside>
      )}
      <div className="flex-1 min-w-0 min-h-0 flex flex-col gap-4 overflow-y-auto px-1 py-2">
        {children}
      </div>
    </div>
  );
}

/**
 * mock:3504/3505 — the rail/chart toggle pair in the tab strip's toolbar, after the
 * column-nav chips (`toolsAfterNav`). Same pressed-state recipe as WQSForm's
 * Regression button (WQSForm.tsx:129-141); shared here so it isn't re-typed at each of
 * the four call sites (rail + chart, Profit Rent + Leasehold).
 */
export function MethodToolbarToggle({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={clsx(
        'h-6 px-2.5 text-[11.5px] font-medium rounded-md border transition-colors whitespace-nowrap',
        pressed
          ? 'bg-primary/10 border-primary/40 text-primary'
          : 'border-gray-200 text-gray-600 hover:bg-gray-50',
      )}
    >
      {label}
    </button>
  );
}

/** mock:278 `.sideL h5` — a rail section header. */
export function MethodRailSectionTitle({ children }: { children: ReactNode }) {
  return (
    <h5 className="mt-2.5 mb-0.5 text-[10.5px] text-gray-400 tracking-wide font-semibold first:mt-0">
      {children}
    </h5>
  );
}

/**
 * mock:2472-2473 `leaseHead` — the lease-dates/timeline/rental-info block that opens
 * both PR's and LH's `sideL` case (mock:2486/2497). Built once here rather than once
 * per panel — this is the exact block the team's twin-drift note calls out: it's
 * identical Thai copy under two different i18n namespaces (`profitRent.*` /
 * `leasehold.*`) today for no reason other than never having been shared.
 *
 * Dates render as a 3-column label/value grid (mock:285's `.dates`), not the
 * icon-in-a-card treatment the panels used inline before — that read fine at full page
 * width but doesn't fit three across at 268px, and the mock's own rail version already
 * drops it for exactly this block.
 */
export function MethodRailLeaseHeader({
  appraisalDate,
  leaseStartDate,
  leaseEndDate,
  onViewRentalInfo,
}: {
  appraisalDate?: string;
  leaseStartDate?: string;
  leaseEndDate?: string;
  onViewRentalInfo: () => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <>
      <MethodRailSectionTitle>{t('methodTabs.leaseHeader.sectionTitle')}</MethodRailSectionTitle>
      <div className="grid grid-cols-3 gap-1.5 text-[11.5px] mb-1.5">
        <div>
          <div className="text-[10px] text-[#8a96a0]">{t('methodTabs.leaseHeader.appraisalDate')}</div>
          <div className="font-medium text-gray-700 tabular-nums">
            {appraisalDate ? formatDateBE(appraisalDate) : '-'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#8a96a0]">{t('methodTabs.leaseHeader.leaseStart')}</div>
          <div className="font-medium text-gray-700 tabular-nums">
            {leaseStartDate ? formatDateBE(leaseStartDate) : '-'}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#8a96a0]">{t('methodTabs.leaseHeader.leaseEnd')}</div>
          <div className="font-medium text-gray-700 tabular-nums">
            {leaseEndDate ? formatDateBE(leaseEndDate) : '-'}
          </div>
        </div>
      </div>
      <LeaseTimelineBar
        leaseStartDate={leaseStartDate}
        leaseEndDate={leaseEndDate}
        appraisalDate={appraisalDate}
      />
      <button
        type="button"
        onClick={onViewRentalInfo}
        className="mt-2 mb-1 h-6 px-2.5 self-start text-[11px] font-medium rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 w-fit"
      >
        {t('methodTabs.leaseHeader.viewRentalInfo')}
      </button>
    </>
  );
}

/**
 * mock:279 `.fld` — one label + control row in the rail. `unit`, when given, renders in
 * its own trailing column instead of being handed to the control as a `rightIcon` — that
 * put the unit text INSIDE the input box (mock has it beside the box), and cost every
 * caller a `pr-[Npx]!` reservation on the input's own padding just to keep the digits
 * from running under it, which kept drifting out of sync and clipping. The unit column
 * is `auto`-width rather than a fixed size so "ตร.วา" and "บาท/ตร.วา/เดือน" both fit
 * without the widest one setting the column for every row.
 */
export function MethodRailField({
  label,
  required,
  unit,
  children,
}: {
  label: ReactNode;
  required?: boolean;
  unit?: ReactNode;
  children: ReactNode;
}) {
  const compact = useContext(RailCompactCtx);
  const labelEl = (
    // mock `.fld label` — 12px, ink-2 (text-xs is 9.75px at this repo's 13px root).
    <label className="text-[12px] text-[#55636f]">
      {label}
      {required && <span className="text-red-400"> *</span>}
    </label>
  );
  if (compact) {
    // Compact (DCF): a fixed 24px unit column so every control starts at the same x.
    return (
      <div className="grid grid-cols-[1fr_64px_24px] items-center gap-1.5 min-h-[28px]">
        {labelEl}
        <div className="flex items-center gap-1 justify-end min-w-0">{children}</div>
        {unit && <span className="text-[10px] text-[#8a96a0] whitespace-nowrap">{unit}</span>}
      </div>
    );
  }
  return (
    // mock `.fld` = 1fr | 128px, and the 128px cell is `.fc` = control + unit, the unit
    // always present with min-width 38px (empty or not) — so every control ends at the same
    // x and the units line up. A third `auto` column let each row's unit width move its input.
    <div className="grid grid-cols-[1fr_128px] items-center gap-[6px] min-h-[28px]">
      {labelEl}
      <div className="flex items-center gap-[4px] min-w-0">
        <div className="flex flex-1 items-center justify-end min-w-0 text-[12px] [&_span.tabular-nums]:text-[12px] [&_span.tabular-nums]:font-normal">
          {children}
        </div>
        <span className="min-w-[38px] text-[10px] text-[#8a96a0] whitespace-nowrap">{unit}</span>
      </div>
    </div>
  );
}

/**
 * dd/MM/yyyy in the Buddhist era — the lease header's dates (mock `.dates`: 18/09/2569). The
 * tables beside it already label years in B.E., so a Gregorian header put two eras on one
 * screen. Local, not in formatters.ts: formatDateOnly is Gregorian for every other caller.
 */
function formatDateBE(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear() + 543}`;
}

/** mock growHtml() `.ptab` head — the "ช่วงเวลา" growth rows are three bare number boxes
 *  without it. Same 1fr 1fr 1fr 20px track as the rows it labels. */
export function MethodRailPeriodHeader() {
  const { t } = useTranslation('pricingAnalysis');
  return (
    <div className="grid grid-cols-[1fr_1fr_1fr_20px] gap-1 text-[10.5px] text-gray-400">
      <span>{t('methodTabs.periodCols.from')}</span>
      <span>{t('methodTabs.periodCols.to')}</span>
      <span>{t('methodTabs.periodCols.rate')}</span>
      <span />
    </div>
  );
}

/** mock `.addrow` — the dashed full-width add-row button used everywhere else. */
export function MethodRailAddRow({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-[8px] py-[1px] text-[11px] leading-[18px] text-primary rounded-[6px] border border-dashed border-primary hover:bg-primary/10"
    >
      + {label}
    </button>
  );
}

/** mock `.seg.gseg` — grey track, the pressed option white with accent ink; not a filled
 *  pill. Shared by Profit Rent's and Leasehold's growth-type switch. */
export function MethodRailSeg<T extends string>({
  options,
  value,
  onChange,
  disabled,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="inline-flex self-start gap-[2px] p-[2px] mt-[2px] mb-[6px] rounded-[8px] bg-[#edf1f1]" role="group">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          disabled={disabled}
          onClick={() => onChange(o.value)}
          className={clsx(
            'px-[10px] py-[2px] rounded-[6px] text-[11.5px] whitespace-nowrap',
            o.value === value
              ? 'bg-white text-[#0f766e] font-medium shadow-[0_1px_2px_rgba(16,24,32,0.05),0_1px_3px_rgba(16,24,32,0.04)]'
              : 'text-[#55636f]',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

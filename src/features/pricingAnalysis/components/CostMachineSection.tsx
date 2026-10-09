import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { isMachineRowLocked, NOT_FOUND_CONDITION_CODE } from '../schemas/costMachineForm';
import clsx from 'clsx';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { DenseProvider, RHFInputCell } from './table/RHFInputCell';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { Icon, ParameterDisplay } from '@/shared/components';
import { Skeleton } from '@/shared/components/Skeleton';
import { useEffect, useState, type ReactNode } from 'react';
import { BulkRcnReferenceDialog, type BulkRcnTargetRow } from './BulkRcnReferenceDialog';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

export interface MachineryItem {
  appraisalPropertyId: string;
  quantity: number | null;
  machineName: string | null;
  registrationNumber: string | null;
  manufacturer: string | null;
  conditionUse: string | null;
  yearOfManufacture: number | null;
  /**
   * The appraiser's "รับรองราคาประเมิน" decision on this machine. False means they declined to
   * put a value on it, so the cost workings for the row are not theirs to fill in.
   */
  isPriceCertified: boolean | null;
}

export interface MachineryRowFormValue {
  id: string | null;
  appraisalPropertyId: string;
  machine: MachineryItem;
  rcn: number | null;
  lifeSpan: number | null;
  durationInUse: number;
  residualLifeSpan: number;
  conditionFactor: number | null;
  physicalDeterioration: number;
  functionalObsolescence: number | null;
  economicObsolescence: number | null;
  fmv: number;
  marketDemand: 'Y' | 'N';
  notes: string;
}

const costMachinePath = {
  rows: () => 'machineryCosts',
  rcn: (r: number) => `machineryCosts.${r}.rcn`,
  lifeSpan: (r: number) => `machineryCosts.${r}.lifeSpan`,
  durationInUse: (r: number) => `machineryCosts.${r}.durationInUse`,
  residualLifeSpan: (r: number) => `machineryCosts.${r}.residualLifeSpan`,
  conditionFactor: (r: number) => `machineryCosts.${r}.conditionFactor`,
  physicalDeterioration: (r: number) => `machineryCosts.${r}.physicalDeterioration`,
  functionalObsolescence: (r: number) => `machineryCosts.${r}.functionalObsolescence`,
  economicObsolescence: (r: number) => `machineryCosts.${r}.economicObsolescence`,
  fmv: (r: number) => `machineryCosts.${r}.fmv`,
  marketDemand: (r: number) => `machineryCosts.${r}.marketDemand`,
  notes: (r: number) => `machineryCosts.${r}.notes`,
  conditionUse: (r: number) => `machineryCosts.${r}.machine.conditionUse`,
  yearOfManufacture: (r: number) => `machineryCosts.${r}.machine.yearOfManufacture`,
  isPriceCertified: (r: number) => `machineryCosts.${r}.machine.isPriceCertified`,
};

function useRowComputedValues(rowIndex: number) {
  const currentYear = new Date().getFullYear() + 543; // พ.ศ.

  const conditionUse = useWatch({ name: costMachinePath.conditionUse(rowIndex) }) as string;
  const isPriceCertified = useWatch({
    name: costMachinePath.isPriceCertified(rowIndex),
  }) as boolean | null;
  const yearOfManufacture = useWatch({
    name: costMachinePath.yearOfManufacture(rowIndex),
  }) as number;
  const lifeSpan = (useWatch({ name: costMachinePath.lifeSpan(rowIndex) }) as number | null) ?? 0;
  const rcn = useWatch({ name: costMachinePath.rcn(rowIndex) }) as number | null;
  const conditionFactor =
    (useWatch({ name: costMachinePath.conditionFactor(rowIndex) }) as number | null) ?? 0;
  const functionalObsolescence = useWatch({
    name: costMachinePath.functionalObsolescence(rowIndex),
  }) as number | null;
  const economicObsolescence = useWatch({
    name: costMachinePath.economicObsolescence(rowIndex),
  }) as number | null;

  // n = currentYear - yearOfManufacture
  const durationInUse = yearOfManufacture > 0 ? currentYear - yearOfManufacture : 0;

  // R = N - n
  const diffResidualLifeSpan = (lifeSpan ?? 0) - durationInUse;
  const isResidualBelowMin = diffResidualLifeSpan < 5;
  const residualLifeSpan =
    isResidualBelowMin && conditionUse !== NOT_FOUND_CONDITION_CODE ? 5 : diffResidualLifeSpan;

  // P = ((1 - (N - R) / N) * C)
  const physicalDeterioration =
    lifeSpan !== 0
      ? parseFloat(((1 - (lifeSpan - residualLifeSpan) / lifeSpan) * conditionFactor).toFixed(2))
      : 0;

  // FMV = (RCN * P) * F * E
  const computedFmv =
    (rcn ?? 0) *
    physicalDeterioration *
    (functionalObsolescence ?? 0) *
    (economicObsolescence ?? 0);

  const isRowLocked = isMachineRowLocked({ conditionUse, isPriceCertified });

  // A locked row is worth nothing, and it has to SAY nothing — locking only stops new typing, it
  // never cleared what a machine was worth before the appraiser withdrew the price certification
  // (or before the survey came back "not found"). Left alone, the old RCN keeps recomputing an FMV
  // that rolls into the group's value with every Save, and no one can clear it because every input
  // in the row is disabled. Worse for '03': that code skips the residual-life floor, so an old RCN
  // recomputes a NEGATIVE figure and quietly subtracts from the group.
  // Zero here, null in the payload; the machine's own RCN and life span stay in the database, so
  // re-certifying the price brings the row back exactly as it was.
  const fmv = isRowLocked ? 0 : computedFmv;

  const marketDemand: 'Y' | 'N' = fmv > 0 ? 'Y' : 'N';

  // isDisabled is what the CONDITION says, and only the ConditionUse chip is coloured from it —
  // folding the certification decision in would grey out the chip on a machine that is plainly
  // ใช้งานอยู่. isRowLocked (above) is the separate question of what the row's inputs obey.
  const isDisabled = conditionUse === NOT_FOUND_CONDITION_CODE;

  return {
    durationInUse,
    residualLifeSpan,
    isResidualBelowMin,
    physicalDeterioration,
    fmv,
    marketDemand,
    isDisabled,
    isRowLocked,
  };
}

function MachineryRow({
  rowIndex,
  isReadOnly,
}: {
  rowIndex: number;
  isReadOnly: boolean;
}) {
  const { getValues } = useFormContext();
  const { t } = useTranslation('pricingAnalysis');
  const {
    durationInUse,
    residualLifeSpan,
    isResidualBelowMin,
    physicalDeterioration,
    fmv,
    marketDemand,
    isDisabled,
    isRowLocked,
  } = useRowComputedValues(rowIndex);

  const { setValue } = useFormContext();
  useEffect(() => {
    setValue(costMachinePath.fmv(rowIndex), fmv, { shouldDirty: false });
  }, [fmv, rowIndex, setValue]);

  const machine: MachineryItem = getValues(`machineryCosts.${rowIndex}.machine`) ?? {};
  const inputDisabled = isRowLocked || isReadOnly;

  const tdBase = 'px-[8px] py-0 h-[26px] border-b border-r border-gray-300 whitespace-nowrap';
  // N/n/R/C/P/F/E deliberately carry no width. mock:1857's th2() emits a plain
  // `class="c two"`, and mock:147-148's `.g .w1` is the WQS grid's sticky-column rule
  // (position/left/padding — no width in it at all), so the 56px these cells used to
  // declare came from nowhere. It also did damage: max-width caps a cell even under
  // table-layout auto, and with nowrap sub-labels the text had nowhere to go and ran
  // across the next column's border. They size to their content now, as the mock's do.
  // What keeps the four INPUT columns (N/C/F/E) honest is `inputSize` on the cells below,
  // not a width here. An <input> carries a browser-default intrinsic width of 20 characters,
  // and a percentage width contributes nothing to intrinsic sizing — so `w-full` could not
  // shrink them and the 20-char default became the column's content width, which is why
  // N/C/F/E rendered ~3x wider than the text columns beside them. `size` lowers that floor
  // in characters (the browser measures the font, no px guess) and caps nothing, so the
  // header sub-label still sets the column and still cannot be clipped. Do not "simplify"
  // this into a width on the td/th: that is the cap that broke these columns before.
  // mock:1796/142 `data-sticky="190"` + `.g .stk` — the Name column freezes at 190px
  // with ellipsis overflow, same shape WQS/SAG/DC's first sticky column already uses.
  // Shadow is a box-shadow keyed off ScrollableTableContainer's scrolled state
  // (`group-data-[scrolled=true]`), same mechanism as ComparativeFactorTable.tsx — not
  // a border, and not the older `.pa-sticky-edge` global-CSS route.
  const stickyName =
    'sticky left-0 z-10 bg-white w-[190px] min-w-[190px] max-w-[190px] overflow-hidden text-ellipsis ' +
    'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';

  return (
    <tr>
      {/* Row number lives inside the name cell — mock:1807 renders "${i + 1}. ${name}",
          there is no separate No. column. */}
      <td className={clsx(tdBase, stickyName)} title={machine.machineName ?? '-'}>
        {rowIndex + 1}. {machine.machineName}
      </td>
      <td className={clsx(tdBase, 'text-center bg-white')}>{machine.quantity ?? 0}</td>
      <td className={clsx(tdBase, 'min-w-[70px]')}>{machine.registrationNumber}</td>
      {/* "Country of Manufacturer" holds a Country parameter code (TH, JP, …). Print the code
          alongside its description so the cell still matches what the form stores while reading
          as a country — same store the ConditionUse chip below uses. */}
      <td className={clsx(tdBase)}>
        <ParameterDisplay group="Country" code={machine.manufacturer} format="code-description" />
      </td>
      <td className={clsx(tdBase, 'min-w-[70px] text-center')}>
        <span
          className={clsx(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            isDisabled ? 'bg-gray-100 text-gray-500' : 'bg-emerald-50 text-emerald-700',
          )}
        >
          <ParameterDisplay group="ConditionUse" code={machine.conditionUse} />
        </span>
        {/* A '03' row explains itself — the chip above goes grey. A row locked because the price
            is not certified would otherwise show a perfectly normal "ใช้งานอยู่" beside five dead
            inputs, which reads as a broken screen rather than a decision someone made. Same
            wording as the property card's chip for the same flag, translated the same way — this
            table is the one place a hardcoded string would have gone unnoticed, since every other
            label in it is an English literal. */}
        {isRowLocked && !isDisabled && (
          <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700">
            {t('costMachine.notPriceCertified')}
          </span>
        )}
      </td>
      <td className={clsx(tdBase, 'min-w-[70px] text-center')}>
        {(machine.yearOfManufacture ?? 0) > 0 ? machine.yearOfManufacture : '-'}
      </td>

      {/* RCN — the per-row "WQS" reference button was removed deliberately, not lost: the bulk
          dialog on the RCN header (mock:1861) pulls the same figure for every machine at once and
          supersedes it. Creating a reference for a machine that has none is deferred to a later
          phase, so this cell is plain input only. Do not put the button back; it takes the dead
          right padding it used to need with it. */}
      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.rcn(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
        />
      </td>

      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.lifeSpan(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 0, maxIntegerDigits: 3, allowNegative: false }}
          inputSize={3}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-medium text-gray-700')}>
        {durationInUse}
      </td>

      <td
        className={clsx(
          tdBase,
          'text-right font-medium',
          isResidualBelowMin ? 'text-red-500' : 'text-gray-700',
        )}
      >
        {residualLifeSpan}
      </td>

      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.conditionFactor(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
          inputSize={4}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-medium text-gray-700')}>
        {physicalDeterioration.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </td>

      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.functionalObsolescence(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
          inputSize={4}
        />
      </td>

      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        <RHFInputCell
          fieldName={costMachinePath.economicObsolescence(rowIndex)}
          inputType="number"
          disabled={inputDisabled}
          number={{ decimalPlaces: 2, maxIntegerDigits: 1, allowNegative: false, maxValue: 1 }}
          inputSize={4}
        />
      </td>

      <td className={clsx(tdBase, 'text-right font-semibold text-gray-800')}>
        {fmv.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </td>

      <td className={clsx(tdBase, 'text-center')}>
        <span
          className={clsx(
            'inline-flex items-center justify-center size-6 rounded-full text-xs font-bold',
            marketDemand === 'Y' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500',
          )}
        >
          {marketDemand}
        </span>
      </td>

      <td className="px-[8px] py-0 h-[26px] border-b border-r border-gray-300">
        {/* Deliberately NOT locked with the rest of the row. The lock says "this machine is not
            being valued", which is a statement about money, not about whether anyone may write
            down why. An appraiser still needs to record what they found on a machine they are not
            certifying a price for. (Page-level read-only still disables it: Input.tsx reads
            FormReadOnlyContext on its own.) */}
        <RHFInputCell fieldName={costMachinePath.notes(rowIndex)} inputType="text" />
      </td>
    </tr>
  );
}

// px-[8px] py-0 — DaisyUI's `.table` adds 9.75px of vertical padding to any cell that
// doesn't override it, which silently doubles the row height; the leading on <thead> and
// on the <table> carries the vertical rhythm instead.
const th =
  'bg-gray-50 border-b border-r border-gray-300 text-[12px] font-medium text-gray-700 px-[8px] py-0 whitespace-nowrap';
const thCenter = clsx(th, 'text-center');
// mock:268 `.g th.two` — a header cell that carries a sub-label drops to 14px leading with
// 4px above and below, so the pair measures 4 + 14 + 12 + 4 = 34px. Without it the first
// line kept the thead's leading and the cell ran 38px — or 50px for RCN, whose sub-label
// had no size class at all and so inherited the table's full 25px line.
const thTwo = 'leading-[14px] py-[4px]';
// mock:267 `.g th .d` — the sub-label itself: its own block line at 10px / 12px, weight
// 400, in --ink-3. Spelled as a hex because Tailwind v4's palette is OKLCH, so no colour
// name lands on the mock's value. Being a block is also what replaces the <br> that used
// to split these labels.
const thSub = 'block text-[10px] leading-[12px] font-normal text-[#8a96a0]';
// N/n/R/C/P/F/E declare no width, here or in the body — the mock sizes them to content
// (see the note in MachineryRow). A 56px cap here clipped "Duration in Use" and "Residual
// Life" across the next column's border, so do not reintroduce one. These sub-labels are
// what each of those columns now measures to, since the inputs below no longer hold them
// open at 20 characters — so the sub-label text IS the column width. Lengthening one
// widens its column; that is the intended behaviour, not a regression.
// Header twin of MachineryRow's `stickyName` — same 190px/ellipsis/shadow shape, kept in
// sync with that copy rather than shared to avoid a cross-component import for one string.
const stickyName =
  'sticky left-0 z-10 bg-gray-50 w-[190px] min-w-[190px] max-w-[190px] overflow-hidden text-ellipsis ' +
  'shadow-[1px_0_0_#e3e9e8] transition-shadow duration-150 group-data-[scrolled=true]:shadow-[1px_0_0_#e3e9e8,6px_0_8px_-4px_rgba(16,24,32,0.22)]';

/**
 * The two header tiers — mock:1858-1865 (`tableMC`). Shared by the skeleton and the live
 * table so the two cannot drift apart.
 *
 * leading-[26px] is mock:140 `.g thead th`, and it sits on <thead> rather than in `th` so
 * that `thTwo`'s leading-[14px] reliably wins: two arbitrary leading utilities on the same
 * element would be settled by stylesheet order, but a class on the element always beats an
 * inherited value.
 */
function MachineryTableHead({ rcnAction }: { rcnAction?: ReactNode }) {
  return (
    <thead className="bg-neutral-50 leading-[26px]">
      <tr>
        {/* Machinery Name (with the row number folded in, mock:1869) and Qty sit beside
            "Machinery Information" rather than inside it — mock:1859. */}
        <th rowSpan={2} className={clsx(th, stickyName)}>
          Machinery Name
        </th>
        <th rowSpan={2} className={thCenter}>
          Qty
        </th>
        <th colSpan={4} className={clsx(thCenter, 'border-b-2')}>
          Machinery Information
        </th>
        {/* mock:1862 and mock:1863 — for RCN and FMV alike the big line is the initialism
            and the spelled-out name is the sub-label, which is the opposite of how these
            two read before. Both sub-labels carry "(Baht)". The mock puts it on RCN only,
            and an earlier pass matched that exactly — which left FMV, a money column, as
            the one figure on this table with no unit named anywhere. The user asked for it
            back. This is a deliberate, approved deviation from the mock: do not "correct"
            FMV back to a bare "Fair Market Value" on the grounds that the mock has it. */}
        <th rowSpan={2} className={clsx(th, thTwo, 'min-w-32 text-right')}>
          RCN
          <span className={thSub}>Replacement Cost (Baht)</span>
          {/* mock:1861 hangs the bulk "pull from WQS" chip off this header cell, below the
              sub-label. It makes the RCN header taller than its neighbours — which is the
              mock's own shape, and every cell in the header row grows with it. The chip is
              narrower than the column's existing min-w-32, so it widens nothing. */}
          {rcnAction}
        </th>
        <th rowSpan={2} className={clsx(thCenter, thTwo)}>
          N<span className={thSub}>Life Span</span>
        </th>
        <th rowSpan={2} className={clsx(thCenter, thTwo)}>
          n<span className={thSub}>Duration in Use</span>
        </th>
        <th rowSpan={2} className={clsx(thCenter, thTwo)}>
          R<span className={thSub}>Residual Life</span>
        </th>
        <th colSpan={4} className={clsx(thCenter, 'border-b-2')}>
          Depreciation
        </th>
        <th rowSpan={2} className={clsx(th, thTwo, 'text-right')}>
          FMV
          <span className={thSub}>Fair Market Value (Baht)</span>
        </th>
        <th rowSpan={2} className={clsx(thCenter, thTwo, 'min-w-32')}>
          Market Demand
          <span className={thSub}>Available / Used</span>
        </th>
        <th rowSpan={2} className={clsx(th, 'min-w-32')}>
          Notes
        </th>
      </tr>
      <tr>
        <th className={clsx(th, 'min-w-[70px]')}>Registration No.</th>
        <th className={clsx(th, 'min-w-32')}>Country of Manufacturer</th>
        <th className={clsx(thCenter, 'min-w-[70px]')}>Condition Use</th>
        <th className={clsx(thCenter, 'min-w-[70px]')}>Year</th>
        <th className={clsx(thCenter, thTwo)}>
          C<span className={thSub}>Condition</span>
        </th>
        <th className={clsx(thCenter, thTwo)}>
          P<span className={thSub}>Physical</span>
        </th>
        <th className={clsx(thCenter, thTwo)}>
          F<span className={thSub}>Functional</span>
        </th>
        <th className={clsx(thCenter, thTwo)}>
          E<span className={thSub}>Economic</span>
        </th>
      </tr>
    </thead>
  );
}

export function CostMachineSection({
  isLoading = false,
}: {
  machineryItems: MachineryItem[];
  isLoading?: boolean;
  // methodId / marketSurveys / templateList are still ACCEPTED but no longer read: they fed the
  // per-row WQS button that the RCN header's bulk dialog replaced. Kept on the props so
  // CostMachinePanel's call site (and the reference plumbing it shares with the other method
  // panels) needs no edit, and so the later phase that restores reference CREATION here finds
  // them already wired. Same shape as `machineryItems`, which this component has never read.
  /** hostMethodId — used for market reference cleanup scoping */
  methodId?: string;
  marketSurveys?: MarketComparableDetailType[];
  templateList?: TemplateDtoType[] | undefined;
}) {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const { control, setValue } = useFormContext();
  const { fields } = useFieldArray({ control, name: costMachinePath.rows() });
  const allRows =
    (useWatch({ control, name: costMachinePath.rows() }) as MachineryRowFormValue[]) ?? [];

  const [isBulkOpen, setIsBulkOpen] = useState(false);

  // Why a row cannot receive a pulled RCN. isMachineRowLocked owns the DECISION — restating its
  // predicate here would let the two disagree, and costMachineForm.ts exports it precisely so
  // callers don't. Only the wording is chosen here, and it matches what the row itself already
  // displays: the '03' case reads its description straight off the ConditionUse parameter master
  // rather than inventing a second copy of that wording in the locale files.
  const lockReason = (machine: MachineryItem | undefined): ReactNode => {
    if (!machine || !isMachineRowLocked(machine)) return undefined;
    if (machine.conditionUse === NOT_FOUND_CONDITION_CODE)
      return <ParameterDisplay group="ConditionUse" code={machine.conditionUse} />;
    if (machine.isPriceCertified === false) return t('costMachine.notPriceCertified');
    return t('marketRef.bulk.reasonLocked');
  };

  const bulkRows: BulkRcnTargetRow[] = allRows.map((row, rowIndex) => ({
    rowIndex,
    appraisalPropertyId: row?.appraisalPropertyId ?? '',
    machineName: row?.machine?.machineName ?? null,
    disabledReason: lockReason(row?.machine),
  }));

  // Copy-only: the same setValue the per-cell WQS button performs, once per selected machine.
  // Nothing records where the figure came from — see the note at the top of the dialog.
  const handleBulkApply = (applications: { rowIndex: number; value: number }[]) => {
    for (const { rowIndex, value } of applications) {
      setValue(costMachinePath.rcn(rowIndex), value, { shouldDirty: true });
    }
  };

  // mock:362 `.thref` — 10px chip, 16px line, 3px above, pushed to the cell's right edge.
  // Its accent colours are the mock's own (--accent-line/--accent-wash/--accent-ink) spelled as
  // hexes, because Tailwind v4's palette is OKLCH and no colour name lands on those values.
  const bulkButton =
    isReadOnly || allRows.length === 0 ? null : (
      <button
        type="button"
        onClick={() => setIsBulkOpen(true)}
        className="mt-[3px] ml-auto flex items-center gap-[3px] rounded-[5px] border border-[#99f6e4] bg-[#f0fdfa] px-[6px] py-0 text-[10px] leading-[16px] font-medium text-[#0f766e] transition-colors hover:border-[#5eead4] hover:bg-[#ccfbf1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        title={t('marketRef.bulk.headerButton')}
      >
        <Icon name="link" style="solid" className="size-[10px]" />
        <span>{t('marketRef.bulk.headerButton')}</span>
      </button>
    );

  const totalQuantity = allRows.reduce((sum, row) => sum + (row?.machine?.quantity ?? 0), 0);
  // Every total sums every row, because a column total has to equal the sum of what THAT column
  // shows. A locked row still displays its stored RCN, so dropping it from Total RCN would leave
  // a column that visibly does not add up. FMV needs no filter: a locked row displays 0 and
  // therefore contributes 0 — which is also exactly what the server totals, since the payload
  // sends that row's fair market value as null and the calculation service sums only the items
  // that have one. RCN 500,000 against FMV 0 on the same row is not an error to hide; it is the
  // machine saying it has a replacement cost that nobody is turning into a valuation.
  const totalRcn = allRows.reduce((sum, row) => sum + (row?.rcn ?? 0), 0);
  const totalFmv = allRows.reduce((sum, row) => sum + (row?.fmv ?? 0), 0);
  if (isLoading) {
    return (
      // No rounded corners — matches the mock's calc-tab tables (measured 0px, both
      // wrapper and table).
      <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 overflow-hidden">
        <ScrollableTableContainer className="flex-1 min-h-0" edgeShadow>
          <table className="table min-w-max border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none">
            <MachineryTableHead />
            <tbody>
              {Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {Array.from({ length: 17 }).map((_, j) => (
                    <td key={j} className="border-b border-r border-gray-300 px-[8px] py-0 h-[26px]">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollableTableContainer>
      </div>
    );
  }

  return (
    <DenseProvider value={true}>
    {/* No rounded corners — matches the mock's calc-tab tables (measured 0px, both
        wrapper and table). */}
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 overflow-hidden">
      <ScrollableTableContainer className="flex-1 min-h-0" edgeShadow>
        <table className="table min-w-max border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none">
          <MachineryTableHead rcnAction={bulkButton} />
          <tbody className="divide-y divide-gray-100">
            {fields.map((_field, rowIndex) => (
              <MachineryRow key={_field.id} rowIndex={rowIndex} isReadOnly={isReadOnly} />
            ))}
            {fields.length === 0 && (
              <tr>
                <td colSpan={17} className="py-10 text-center text-sm text-gray-400">
                  No data.
                </td>
              </tr>
            )}
            <tr>
              <td colSpan={1} className={clsx(thCenter, stickyName)}>
                Total
              </td>
              {/* No min-width: the header above dropped its own (mock:1859 has none on
                  Qty), and leaving 8rem here would have pinned the column at 104px anyway
                  and made that removal inert. */}
              <td colSpan={1} className={thCenter}>
                {totalQuantity.toLocaleString()}
              </td>
              <td colSpan={4} className={clsx(thCenter, 'min-w-32')}></td>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                {totalRcn.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td colSpan={7} className={clsx(thCenter, 'min-w-32')}></td>
              <td colSpan={1} className={clsx(thCenter, 'min-w-32')}>
                {totalFmv.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </td>
              <td colSpan={2} className={clsx(thCenter, 'min-w-32')}></td>
            </tr>
          </tbody>
        </table>
      </ScrollableTableContainer>
      {bulkButton && (
        <BulkRcnReferenceDialog
          isOpen={isBulkOpen}
          onClose={() => setIsBulkOpen(false)}
          rows={bulkRows}
          onApply={handleBulkApply}
        />
      )}
    </div>
    </DenseProvider>
  );
}

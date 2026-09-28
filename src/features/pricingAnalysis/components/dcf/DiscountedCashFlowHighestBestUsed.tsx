import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { toRaiNganWa } from '@/features/appraisal/utils/areaFormat';
import { useFormContext, useWatch } from 'react-hook-form';
import { DenseProvider, RHFInputCell, toNumber } from '../table/RHFInputCell';
import { KvRow } from '../KvRow';
import { SummaryGrid, SummaryCard, DisplayValueRow, IndicatedValueRow } from '../SummaryValueCard';
import { convertLandAreaToTotalSqWa } from '../../domain/convertLandAreaToTotalSqWa';
import { useDerivedFields, type DerivedFieldRule } from '../../adapters/useDerivedFieldArray';
import { floorToThousands, roundToThousand } from '../../domain/calculation';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  useGetReferences,
  useCreateReferenceFromMethod,
  PricingAnalysisSubjectType,
} from '../../api/references';
import { useGetPricingAnalysis } from '../../api';
import { MarketReferenceModal } from '../MarketReferenceModal';
import type { MarketComparableDetailType } from '../../schemas';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscountedCashFlowHighestBestUsedProps {
  isReadOnly?: boolean;
  /** Income analysis ID — used as anchorId for the IncomeLandRef market reference */
  incomeAnalysisId?: string;
  hostMethodId?: string;
  /** Group / income PA id — needed to fetch Cost-approach methods for the picker */
  pricingAnalysisId?: string;
  marketSurveys?: MarketComparableDetailType[];
  subjectProperty?: Record<string, unknown>;
  /** Ensures the income analysis is saved before attempting to create/open a reference */
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
  /** The group's land from its title deeds, sq.wa (0 = none recorded). */
  groupLandSqWa?: number;
}

// ── Cost-method source for the HBU land price ─────────────────────────────────

const COST_COMPARABLE_METHODS = new Set(['WQS', 'SaleGrid', 'DirectComparison']);
const METHOD_CODE: Record<string, string> = { WQS: 'WQS', SaleGrid: 'SAG', DirectComparison: 'DC' };

/** The group's Cost-approach land methods a split-land price can be copied from. */
function useCostLandMethods(groupPricingAnalysisId: string) {
  const { data: groupPA } = useGetPricingAnalysis(groupPricingAnalysisId);
  return (groupPA?.approaches ?? [])
    .filter((a: any) => a.approachType === 'Cost' || a.type === 'Cost')
    .flatMap((a: any) =>
      (a.methods ?? []).filter((m: any) => COST_COMPARABLE_METHODS.has(m.methodType)),
    ) as { id: string; methodType: string; label?: string }[];
}

// ── IncomeLandRefControl ──────────────────────────────────────────────────────

interface IncomeLandRefControlProps {
  incomeAnalysisId: string;
  hostMethodId: string;
  pricingAnalysisId: string;
  marketSurveys: MarketComparableDetailType[];
  subjectProperty: Record<string, unknown> | undefined;
  totalWaValue: number;
  onApplyValue: (v: number) => void;
  /** The price input, rendered in the manual branch. */
  priceInput: React.ReactNode;
  isReadOnly?: boolean;
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}

/**
 * mock hbuHtml(): "ราคาที่ดิน / ตร.วา มาจาก" [คัดลอกจากวิธีใน Cost | อ้างอิง / กรอกเอง].
 * Copy → pick a Cost land method inline and copy it into an IncomeLandRef reference sized
 * to the split land (same `useCreateReferenceFromMethod` call the old picker modal made).
 * Manual → type the price, or open the reference (WQS) to work it out and apply it.
 */
function IncomeLandRefControl({
  incomeAnalysisId,
  hostMethodId,
  pricingAnalysisId,
  marketSurveys,
  subjectProperty,
  totalWaValue,
  onApplyValue,
  ensureIncomeAnalysisId,
  priceInput,
  isReadOnly,
}: IncomeLandRefControlProps) {
  const { t } = useTranslation('pricingAnalysis');

  const [refModalOpen, setRefModalOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [chosenMode, setChosenMode] = useState<'copy' | 'manual' | null>(null);
  const [sourceMethodId, setSourceMethodId] = useState('');

  const createFromMethodMutation = useCreateReferenceFromMethod();
  const costMethods = useCostLandMethods(pricingAnalysisId);

  const { data: refsData } = useGetReferences(
    PricingAnalysisSubjectType.IncomeLandRef,
    incomeAnalysisId,
  );
  const existingRef = refsData?.references?.[0] ?? null;
  // Until the user picks, an existing reference means the price came from one.
  const mode = chosenMode ?? (existingRef ? 'copy' : 'manual');

  const runEnsure = async (): Promise<boolean> => {
    if (!ensureIncomeAnalysisId) return true;
    setIsPending(true);
    try {
      return !!(await ensureIncomeAnalysisId());
    } catch {
      return false;
    } finally {
      setIsPending(false);
    }
  };

  const handleOpenRef = async () => {
    if (!(await runEnsure())) return;
    setRefModalOpen(true);
  };

  const handleCopy = async () => {
    if (!sourceMethodId || !(await runEnsure())) return;
    setIsPending(true);
    try {
      await createFromMethodMutation.mutateAsync({
        subjectType: PricingAnalysisSubjectType.IncomeLandRef,
        anchorId: incomeAnalysisId,
        hostMethodId,
        sourcePricingAnalysisId: pricingAnalysisId,
        sourceMethodId,
        landAreaOverride: totalWaValue > 0 ? totalWaValue : null,
      });
      setRefModalOpen(true);
    } catch {
      toast.error(t('incomeLandRef.copyFailed'));
    } finally {
      setIsPending(false);
    }
  };

  const segBtn = (value: 'copy' | 'manual', label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      disabled={isReadOnly}
      onClick={() => setChosenMode(value)}
      className={clsx(
        'h-[24px] px-[8px] text-[11.5px] rounded-[5px] whitespace-nowrap transition-colors',
        mode === value ? 'bg-white text-primary font-medium shadow-sm' : 'text-gray-500',
      )}
    >
      {label}
    </button>
  );
  const smallBtn =
    'h-[26px] px-[10px] text-[11.5px] font-medium rounded-[6px] whitespace-nowrap shrink-0 disabled:opacity-50';

  return (
    <>
      <KvRow
        label={t('methodTabs.dcf.hbu.priceSource')}
        value={
          <div className="inline-flex gap-[2px] p-[2px] rounded-[7px] bg-[#edf1f1]">
            {segBtn('copy', t('methodTabs.dcf.hbu.sourceCopy'))}
            {segBtn('manual', t('methodTabs.dcf.hbu.sourceManual'))}
          </div>
        }
      />
      {mode === 'copy' ? (
        <KvRow
          label={<span className="pl-3">{t('methodTabs.dcf.hbu.copyFrom')}</span>}
          value={
            <div className="flex items-center justify-end gap-1 min-w-0">
              {costMethods.length === 0 ? (
                <span className="text-[11px] text-amber-700">
                  {t('incomeLandRef.noCostMethods')}
                </span>
              ) : (
                <select
                  value={sourceMethodId}
                  onChange={e => setSourceMethodId(e.target.value)}
                  disabled={isReadOnly || isPending}
                  className="h-[26px] min-w-0 flex-1 rounded-[6px] border border-gray-200 bg-white px-[6px] text-[12px]"
                >
                  <option value="">{t('methodTabs.dcf.hbu.pickMethod')}</option>
                  {costMethods.map(m => (
                    <option key={m.id} value={m.id}>
                      {METHOD_CODE[m.methodType] ?? m.methodType} · {m.label ?? m.methodType}
                    </option>
                  ))}
                </select>
              )}
              {existingRef && (
                <button
                  type="button"
                  onClick={handleOpenRef}
                  disabled={isPending}
                  className={clsx(
                    smallBtn,
                    'border border-primary/40 text-primary hover:bg-primary/10',
                  )}
                >
                  {t('methodTabs.dcf.hbu.openRef')}
                </button>
              )}
            </div>
          }
          hint={
            !isReadOnly && costMethods.length > 0 ? (
              <button
                type="button"
                onClick={handleCopy}
                disabled={!sourceMethodId || isPending}
                className={clsx(smallBtn, 'bg-primary text-white hover:bg-primary/90')}
              >
                {t('methodTabs.dcf.hbu.copyAsRef')}
              </button>
            ) : undefined
          }
        />
      ) : (
        <KvRow
          label={<span className="pl-3">{t('methodTabs.dcf.hbu.landPricePerSqWa')}</span>}
          value={
            <div className="flex items-center justify-end gap-1">
              <div className="flex-1 min-w-0">{priceInput}</div>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleOpenRef}
                  disabled={isPending}
                  title={t('incomeLandRef.openRef')}
                  className={clsx(
                    smallBtn,
                    'border border-primary/40 text-primary hover:bg-primary/10',
                  )}
                >
                  WQS
                </button>
              )}
            </div>
          }
          unit={t('dcf.common.baht')}
        />
      )}

      <MarketReferenceModal
        isOpen={refModalOpen}
        onClose={() => setRefModalOpen(false)}
        subjectType={PricingAnalysisSubjectType.IncomeLandRef}
        anchorId={incomeAnalysisId}
        hostMethodId={hostMethodId}
        marketSurveys={marketSurveys}
        templateList={undefined}
        subjectProperty={subjectProperty}
        onApplyValue={onApplyValue}
        readOnly={false}
      />
    </>
  );
}

// ── Split-land picture ────────────────────────────────────────────────────────

/**
 * mock hbuHtml()'s small land picture: one isometric slab, the part used for income in
 * green and the split-off part hatched, sized by their share of the group land and
 * redrawn as the numbers change. Presentational only.
 */
function HbuLandPicture({ groupWa, splitWa }: { groupWa: number; splitWa: number }) {
  const { t } = useTranslation('pricingAnalysis');
  const uid = useId().replace(/:/g, '');
  // Ported from the mock's landSvg() (mock:2560): same isometric projection, slab size,
  // grid, drop shadow, edges and 80° stripe fill. Colours are the mock's color-mix()
  // results written as hex (accent #0d9488 / warn #b45309 over white). The mock's
  // floating cards, leader lines and pins are left out — this screen keeps its own labels.
  const VW = 560,
    VH = 150,
    W = 9,
    D = 3.2,
    T = 0.12,
    S = 12.5,
    ox = 214,
    // oy 98, not the mock's 120: the slab spanned y≈64–140 of 150 and sat on the bottom
    // edge; 98 puts it at ≈42–118, vertically centred.
    oy = 98;
  const pt = (x: number, y: number, z = 0) => [
    ox + (x + y) * 0.866 * S,
    oy + (y - x) * 0.5 * S - z * S,
  ];
  const P = (ps: number[][]) => ps.map(q => q.map(n => n.toFixed(1)).join(',')).join(' ');
  const wa = groupWa > 0 ? Math.min(Math.max(splitWa, 0), groupWa) : 0;
  const xs = groupWa > 0 ? W * ((groupWa - wa) / groupWa) : W;
  const segs = [
    { x0: 0, x1: xs, k: 'inc' as const },
    { x0: xs, x1: W, k: 'sep' as const },
  ].filter(q => q.x1 - q.x0 > 0.001);
  const C = {
    inc: { fill: '#9ed4cf', stripe: '#bee2df', top: '#92cfc9', topW: 0.5, edge: '#51b2a9' },
    sep: { fill: '#e0b798', stripe: '#eacfba', top: '#b45309', topW: 1, edge: '#d2986b' },
  };
  const grid: ReactNode[] = [];
  for (let k = -40; k <= 40; k += 2) {
    const [a, b, c, d] = [pt(k, -30), pt(k, 30), pt(-30, k), pt(30, k)];
    grid.push(<line key={`a${k}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} />);
    grid.push(<line key={`b${k}`} x1={c[0]} y1={c[1]} x2={d[0]} y2={d[1]} />);
  }
  return (
    <div className="px-[12px] py-[8px] border-b border-[#e3e9e8]">
      <div className="relative">
        <svg
          viewBox={`0 0 ${VW} ${VH}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full h-auto"
          role="img"
          aria-label={t('methodTabs.dcf.hbu.splitArea')}
        >
          <defs>
            <linearGradient id={`lbg-${uid}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ffffff" />
              <stop offset="1" stopColor="#edf1f1" />
            </linearGradient>
            <clipPath id={`lclip-${uid}`}>
              <rect width={VW} height={VH} rx="12" />
            </clipPath>
            <filter id={`lblur-${uid}`}>
              <feGaussianBlur stdDeviation="3" />
            </filter>
            {(['inc', 'sep'] as const).map(k => (
              <pattern
                key={k}
                id={`l${k}-${uid}`}
                width="4"
                height="4"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(80)"
              >
                <rect width="4" height="4" fill={C[k].fill} />
                <rect width="1.7" height="4" fill={C[k].stripe} />
              </pattern>
            ))}
          </defs>
          <g clipPath={`url(#lclip-${uid})`}>
            <rect width={VW} height={VH} fill={`url(#lbg-${uid})`} />
            <g stroke="#cbd5d3" strokeWidth="0.6" strokeDasharray="2 2" opacity="0.55">
              {grid}
            </g>
            <polygon
              fill="#10181f"
              opacity="0.1"
              filter={`url(#lblur-${uid})`}
              points={P([
                pt(0.3, 0.6, -0.45),
                pt(W + 0.3, 0.6, -0.45),
                pt(W + 0.3, D + 0.6, -0.45),
                pt(0.3, D + 0.6, -0.45),
              ])}
            />
            {segs.map(q => (
              <polygon
                key={`e${q.k}`}
                fill={C[q.k].edge}
                points={P([pt(q.x0, D, T), pt(q.x1, D, T), pt(q.x1, D, 0), pt(q.x0, D, 0)])}
              />
            ))}
            {segs[0] && (
              <polygon
                fill={C[segs[0].k].edge}
                points={P([pt(0, 0, T), pt(0, D, T), pt(0, D, 0), pt(0, 0, 0)])}
              />
            )}
            {segs.map(q => (
              <polygon
                key={`t${q.k}`}
                fill={`url(#l${q.k}-${uid})`}
                stroke={C[q.k].top}
                strokeWidth={C[q.k].topW}
                points={P([pt(q.x0, 0, T), pt(q.x1, 0, T), pt(q.x1, D, T), pt(q.x0, D, T)])}
              />
            ))}
          </g>
        </svg>
        <div className="absolute left-[10px] top-[8px] flex flex-col gap-1 text-[10.5px] leading-tight">
          <span className="inline-flex items-center gap-1 text-[#0f766e] font-medium">
            <span className="size-[7px] rounded-full bg-[#0f766e]" />
            {t('methodTabs.dcf.hbu.pictureUsed')}{' '}
            <span className="text-gray-500 font-normal">
              {t('methodTabs.dcf.hbu.pictureTotal', {
                area: toRaiNganWa(Math.max(groupWa - wa, 0)),
              })}
            </span>
          </span>
          {wa > 0 && (
            <span className="inline-flex items-center gap-1 text-[#c2410c] font-medium">
              <span className="size-[7px] rounded-full bg-[#ea580c]" />
              {t('methodTabs.dcf.hbu.pictureSplit')}{' '}
              <span className="text-gray-500 font-normal">
                {t('methodTabs.dcf.hbu.pictureTotal', { area: toRaiNganWa(wa) })}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DiscountedCashFlowHighestBestUsed ─────────────────────────────────────────

export function DiscountedCashFlowHighestBestUsed({
  isReadOnly,
  incomeAnalysisId,
  hostMethodId,
  pricingAnalysisId,
  marketSurveys,
  subjectProperty,
  ensureIncomeAnalysisId,
  groupLandSqWa = 0,
}: DiscountedCashFlowHighestBestUsedProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { control, getValues, setValue } = useFormContext();
  const isHighestBestUsed = useWatch({ control, name: 'isHighestBestUsed' });
  const finalValue = useWatch({ control, name: 'finalValue' });
  const totalWa = useWatch({ control, name: 'highestBestUsed.totalWa' });
  const totalLandValue = useWatch({ control, name: 'highestBestUsed.totalValue' });
  const appraisalPrice = useWatch({ control, name: 'appraisalPrice' });
  const appraisalPriceRounded = useWatch({ control, name: 'appraisalPriceRounded' });

  // `finalValueAdjust` lifecycle:
  //   - Page load: keep API value (skip seed if non-empty).
  //   - First non-zero `finalValue` after empty form: seed from
  //     roundToThousand(finalValue).
  //   - Cashflow table edit (preview returns a new finalValue with a different
  //     rounded value): recalc to the new auto.
  //   - User typing in `finalValueAdjust`: doesn't change `finalValue`, so the
  //     effect doesn't re-fire — override sticks.
  //   - Save round-trip: `finalValue` returns the same rounded value, so the
  //     ref-equality check skips the recalc — saved override sticks.
  // Comparing on the rounded value (not raw) protects against floating-point
  // drift between successive recomputes returning the same canonical number.
  const lastFinalValueRoundedRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const finalValueNum = toNumber(finalValue);
    if (finalValueNum == null || finalValueNum === 0) return;
    const rounded = roundToThousand(finalValueNum);

    if (lastFinalValueRoundedRef.current === undefined) {
      lastFinalValueRoundedRef.current = rounded;
      const curr = toNumber(getValues('finalValueAdjust'));
      if (curr == null || curr === 0) {
        setValue('finalValueAdjust', rounded, { shouldDirty: false });
      }
      return;
    }

    if (rounded === lastFinalValueRoundedRef.current) return;
    lastFinalValueRoundedRef.current = rounded;
    setValue('finalValueAdjust', rounded, { shouldDirty: false });
  }, [finalValue, getValues, setValue]);

  // `appraisalPriceRounded` is the appraiser's override only — null means "follow the
  // system", the same edited ?? computed rule as Leasehold/Profit Rent/Hypothesis and the
  // backend's `MethodValue = IndicatedValue ?? computed`. It used to be pre-filled with the
  // computed figure and re-overwritten whenever `appraisalPrice` moved, which silently
  // replaced a typed override (e.g. after a save whose recalculation differed).

  const rules: DerivedFieldRule[] = [
    {
      targetPath: 'highestBestUsed.totalWa',
      deps: ['highestBestUsed.areaRai', 'highestBestUsed.areaNgan', 'highestBestUsed.areaWa'],
      compute: ({ getValues }) => {
        const areaRai = toNumber(getValues('highestBestUsed.areaRai')) ?? 0;
        const areaNgan = toNumber(getValues('highestBestUsed.areaNgan')) ?? 0;
        const areaWa = toNumber(getValues('highestBestUsed.areaWa')) ?? 0;
        return convertLandAreaToTotalSqWa(areaRai, areaNgan, areaWa);
      },
    },
    {
      targetPath: 'highestBestUsed.totalValue',
      deps: ['highestBestUsed.totalWa', 'highestBestUsed.pricePerSqWa'],
      compute: ({ getValues }) => {
        const pricePerSqWa = toNumber(getValues('highestBestUsed.pricePerSqWa')) ?? 0;
        const totalWa = toNumber(getValues('highestBestUsed.totalWa')) ?? 0;
        return pricePerSqWa * totalWa;
      },
    },
    {
      targetPath: 'appraisalPrice',
      deps: [
        'finalValueAdjust',
        'finalValueRounded',
        'isHighestBestUsed',
        'highestBestUsed.totalValue',
      ],
      compute: ({ getValues }) => {
        const isHbu = getValues('isHighestBestUsed') ?? false;
        // HBU=Yes: building IS the highest-and-best-use, so appraisal anchors to
        // the always-auto Final Value (Rounded). The editable Final Value
        // (Adjust) input is hidden in this mode.
        if (isHbu) {
          return toNumber(getValues('finalValueRounded')) ?? 0;
        }
        // HBU=No: appraisal = Final Value (Adjust) + Land Value (when entered).
        const finalValueAdjust = toNumber(getValues('finalValueAdjust')) ?? 0;
        const totalLandValue = toNumber(getValues('highestBestUsed.totalValue')) ?? 0;
        if (totalLandValue > 0) {
          return floorToThousands(finalValueAdjust + totalLandValue);
        }
        return finalValueAdjust;
      },
    },
  ];
  useDerivedFields({ rules });

  const computedAppraisal = Number(appraisalPrice) || 0;
  const landValueNum = toNumber(totalLandValue) ?? 0;
  const finalValueNum = toNumber(finalValue) ?? 0;
  const showLandRows = !isHighestBestUsed && landValueNum > 0;

  // Derive the total Sq.Wa value for use as landAreaOverride when copying
  const totalWaNum = toNumber(totalWa) ?? 0;
  const splitExceeds = groupLandSqWa > 0 && totalWaNum > groupLandSqWa;
  const fmtWa = (n: number) =>
    n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Whether to show the reference control (non-HBU only, needs incomeAnalysisId + pricingAnalysisId)
  const showRefControl =
    !isReadOnly &&
    !isHighestBestUsed &&
    !!incomeAnalysisId &&
    !!hostMethodId &&
    !!pricingAnalysisId;

  const areaInput = (field: string, digits: number, maxInt: number, maxValue?: number) => (
    <div className="w-[52px]">
      <RHFInputCell
        fieldName={field}
        inputType="number"
        disabled={isReadOnly}
        number={{ decimalPlaces: digits, maxIntegerDigits: maxInt, maxValue, allowNegative: false }}
      />
    </div>
  );
  const unit = (text: string) => <span className="text-[11px] text-gray-400">{text}</span>;

  // mock summaryOther('DCF') — hbuHtml() card beside the kv() value card. One editable
  // value only (HANDOFF §3.3): `finalValueAdjust` is no longer an input; it keeps its
  // system-rounded seed from the effect above, so the formula is unchanged.
  return (
    <SummaryGrid>
      <SummaryCard title={t('methodTabs.dcf.hbu.cardTitle')}>
        <DenseProvider value={true}>
          <KvRow
            label={t('methodTabs.dcf.hbu.question')}
            value={
              <RHFInputCell
                fieldName={'isHighestBestUsed'}
                inputType="toggle"
                disabled={isReadOnly}
                toggle={{
                  checked: isHighestBestUsed,
                  options: [t('dcf.hbu.toggleNo'), t('dcf.hbu.toggleYes')],
                }}
                onUserChange={e => {
                  if (!e) {
                    setValue('highestBestUsed.areaRai', null);
                    setValue('highestBestUsed.areaNgan', null);
                    setValue('highestBestUsed.areaWa', null);
                    setValue('highestBestUsed.pricePerSqWa', null);
                    setValue('highestBestUsed.totalWa', null);
                    setValue('highestBestUsed.totalValue', null);
                  }
                  return e;
                }}
              />
            }
          />
          {!isHighestBestUsed && (
            <>
              <KvRow
                label={
                  <>
                    {t('methodTabs.dcf.hbu.groupLand')}{' '}
                    <span className="text-[10.5px] text-gray-400">
                      {t('methodTabs.dcf.hbu.groupLandSub')}
                    </span>
                  </>
                }
                value={
                  groupLandSqWa > 0 ? (
                    <span className="font-semibold text-gray-800 tabular-nums">
                      {toRaiNganWa(groupLandSqWa)} · {fmtWa(groupLandSqWa)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-gray-400">
                      {t('methodTabs.dcf.hbu.noGroupLand')}
                    </span>
                  )
                }
                unit={t('dcf.hbu.sqWaUnit')}
              />
              <KvRow
                hint={
                  splitExceeds ? (
                    <span className="text-[10.5px] text-red-600">
                      {t('methodTabs.dcf.hbu.splitExceeds', { max: fmtWa(groupLandSqWa) })}
                    </span>
                  ) : undefined
                }
                label={t('methodTabs.dcf.hbu.splitArea')}
                value={
                  <div className="flex items-center justify-end gap-1">
                    {areaInput('highestBestUsed.areaRai', 0, 5)}
                    {unit(t('dcf.hbu.rai'))}
                    {areaInput('highestBestUsed.areaNgan', 0, 1, 3)}
                    {unit(t('dcf.hbu.ngan'))}
                    {areaInput('highestBestUsed.areaWa', 2, 3)}
                  </div>
                }
                unit={t('dcf.hbu.wa')}
              />
              <HbuLandPicture groupWa={groupLandSqWa} splitWa={totalWaNum} />
              {showRefControl ? (
                <IncomeLandRefControl
                  incomeAnalysisId={incomeAnalysisId!}
                  hostMethodId={hostMethodId!}
                  pricingAnalysisId={pricingAnalysisId!}
                  marketSurveys={marketSurveys ?? []}
                  subjectProperty={subjectProperty}
                  totalWaValue={totalWaNum}
                  onApplyValue={v =>
                    setValue('highestBestUsed.pricePerSqWa', v, { shouldDirty: true })
                  }
                  ensureIncomeAnalysisId={ensureIncomeAnalysisId}
                  isReadOnly={isReadOnly}
                  priceInput={
                    <RHFInputCell
                      fieldName={'highestBestUsed.pricePerSqWa'}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
                    />
                  }
                />
              ) : (
                <KvRow
                  label={t('methodTabs.dcf.hbu.landPricePerSqWa')}
                  value={
                    <RHFInputCell
                      fieldName={'highestBestUsed.pricePerSqWa'}
                      inputType="number"
                      disabled={isReadOnly}
                      number={{ decimalPlaces: 2, maxIntegerDigits: 15, allowNegative: false }}
                    />
                  }
                  unit={t('dcf.common.baht')}
                />
              )}
              <DisplayValueRow
                label={
                  <span className="font-semibold">{t('methodTabs.dcf.hbu.splitLandValue')}</span>
                }
                value={landValueNum}
              />
            </>
          )}
        </DenseProvider>
      </SummaryCard>

      <SummaryCard title={t('methodTabs.dcf.hbu.valueCardTitle')}>
        <DisplayValueRow
          label={
            <>
              {t('methodTabs.dcf.hbu.incomeValue')}{' '}
              <span className="text-[10.5px] text-gray-400">
                {t('methodTabs.dcf.hbu.incomeValueSub')}
              </span>
            </>
          }
          value={finalValueNum}
        />
        {showLandRows && (
          <>
            <DisplayValueRow
              label={<span className="pl-3">{t('methodTabs.dcf.hbu.plusLand')}</span>}
              value={landValueNum}
            />
            <DisplayValueRow
              label={t('methodTabs.dcf.hbu.total')}
              value={finalValueNum + landValueNum}
            />
          </>
        )}
        <IndicatedValueRow
          label={
            <span className="font-semibold text-[#0f766e]">
              {t('costMachine.summary.indicatedValueLabel')}{' '}
              <span className="text-[10.5px] text-gray-400 font-normal">
                {t('finalValue.indicatedValueSubLabel')}
              </span>
            </span>
          }
          // The system's own rounded figure (floor/round-to-thousand of income + land) —
          // IndicatedValueRow re-rounds it, which is a no-op, so "edited" only lights up
          // when the user actually typed a different number.
          computedValue={computedAppraisal}
          value={toNumber(appraisalPriceRounded) ?? computedAppraisal}
          onChange={v => setValue('appraisalPriceRounded', v, { shouldDirty: true })}
          disabled={isReadOnly}
        />
      </SummaryCard>
    </SummaryGrid>
  );
}

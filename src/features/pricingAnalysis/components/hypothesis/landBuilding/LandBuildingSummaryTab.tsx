/**
 * Summary tab for L&B hypothesis analysis.
 * Sections map to C01..C82 per FSD §2.1.3.7.
 *
 * User inputs only appear in writable fields (LandBuildingSummaryInput).
 * Computed fields are overlaid from previewSummary (read-only display).
 */
import { useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import NumberInput from '@/shared/components/inputs/NumberInput';
import Badge from '@/shared/components/Badge';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { LandBuildingFormValues } from '../../../schemas/hypothesisForm';
import type {
  LandBuildingSummaryDto,
  LandBuildingModelAggregate,
  CostItemDto,
} from '../../../types/hypothesis';
import {
  IsCalculatingProvider,
  LedgerTable,
  LedgerBand,
  LedgerRow,
  LedgerRemarkRow,
  LedgerAddRow,
  LedgerUserRow,
  LedgerIndicatedValueRow,
  LedgerWithChart,
  RateInput,
  RateValue,
  Qty,
  Num,
  pct,
} from '../_shared/summaryAtoms';
import { HypothesisResidualWaterfall } from '../../viz/HypothesisResidualWaterfall';
import { getLbTooltips } from '../_shared/hypothesisTooltips';

interface LandBuildingSummaryTabProps {
  previewSummary?: LandBuildingSummaryDto | null;
  models?: Record<string, LandBuildingModelAggregate> | null;
  /** FSD C01 — system-derived from property group land titles. Null for project-model analyses. */
  totalLandAreaFromTitles?: number | null;
  /** Server snapshot of cost items — used to read computed categoryRatio for user-added rows. */
  costItems?: CostItemDto[] | null;
  isCalculating?: boolean;
  /** Charts aside on/off — the toggle lives in the tab toolbar (LandBuildingTabs). */
  showChart?: boolean;
}

/** Section ids + labels, shared with the tab toolbar's jump bar. */
export function useLbSections() {
  const { t } = useTranslation('pricingAnalysis');
  return [
    {
      id: 'land',
      title: t('hypothesis.ledger.lb.sec.land'),
      short: t('hypothesis.ledger.lb.short.land'),
    },
    {
      id: 'rev',
      title: t('hypothesis.ledger.lb.sec.rev'),
      short: t('hypothesis.ledger.lb.short.rev'),
    },
    {
      id: 'sales',
      title: t('hypothesis.ledger.lb.sec.sales'),
      short: t('hypothesis.ledger.lb.short.sales'),
    },
    {
      id: 'pdc',
      title: t('hypothesis.ledger.lb.sec.pdc'),
      short: t('hypothesis.ledger.lb.short.pdc'),
    },
    {
      id: 'cons',
      title: t('hypothesis.ledger.lb.sec.cons'),
      short: t('hypothesis.ledger.lb.short.cons'),
    },
    {
      id: 'pc',
      title: t('hypothesis.ledger.lb.sec.pc'),
      short: t('hypothesis.ledger.lb.short.pc'),
    },
    {
      id: 'gov',
      title: t('hypothesis.ledger.lb.sec.gov'),
      short: t('hypothesis.ledger.lb.short.gov'),
    },
    {
      id: 'risk',
      title: t('hypothesis.ledger.lb.sec.risk'),
      short: t('hypothesis.ledger.lb.short.risk'),
    },
    {
      id: 'tdc',
      title: t('hypothesis.ledger.lb.sec.tdc'),
      short: t('hypothesis.ledger.lb.short.tdc'),
    },
    {
      id: 'fv',
      title: t('hypothesis.ledger.lb.sec.fv'),
      short: t('hypothesis.ledger.lb.short.fv'),
    },
  ];
}

export function LandBuildingSummaryTab({
  previewSummary: s,
  models,
  totalLandAreaFromTitles,
  costItems,
  isCalculating,
  showChart,
}: LandBuildingSummaryTabProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const sec = Object.fromEntries(useLbSections().map(x => [x.id, x.title]));
  const u = (
    k:
      | 'sqWa'
      | 'baht'
      | 'unit'
      | 'month'
      | 'houseMonth'
      | 'bahtSqWa'
      | 'bahtUnit'
      | 'bahtPlot'
      | 'bahtMonth'
      | 'monthConstruction'
      | 'monthSales',
  ) => t(`hypothesis.ledger.u.${k}`);
  const LB_TIPS = getLbTooltips(t);
  const { control } = useFormContext<LandBuildingFormValues>();
  const modelList = models ? Object.values(models) : [];

  // Field array for ad-hoc Project Dev Cost rows (kind = Other).
  // `keyName: '_rhfKey'` so RHF's synthetic key doesn't shadow our `id` form field
  // (we need the real `id` to look up server-computed CategoryRatio below).
  const {
    fields: otherCostFields,
    append: appendOther,
    remove: removeOther,
  } = useFieldArray<LandBuildingFormValues, 'otherCostItems', '_rhfKey'>({
    control,
    name: 'otherCostItems',
    keyName: '_rhfKey',
  });

  // Indices of user-added Project Dev Cost rows within the otherCostItems array.
  const projectDevCostRows = otherCostFields
    .map((f, idx) => ({ rhfKey: f._rhfKey, idx, field: f }))
    .filter(({ field }) => field.category === 'ProjectDevCost' && field.kind === 'Other');

  // Indices of user-added Project Cost rows.
  const projectCostRows = otherCostFields
    .map((f, idx) => ({ rhfKey: f._rhfKey, idx, field: f }))
    .filter(({ field }) => field.category === 'ProjectCost' && field.kind === 'Other');

  // Map serverItemId → categoryRatio (only present for saved/previewed user rows).
  const categoryRatioById = new Map<string, number | null | undefined>();
  for (const ci of costItems ?? []) {
    if (
      ci.kind === 'Other' &&
      (ci.category === 'ProjectDevCost' || ci.category === 'ProjectCost')
    ) {
      categoryRatioById.set(ci.id, ci.categoryRatio);
    }
  }

  const makeBlankUserRow = (category: 'ProjectDevCost' | 'ProjectCost') => ({
    id: null,
    category,
    kind: 'Other' as const,
    description: '',
    displaySequence: otherCostFields.length,
    amount: 0,
    rateAmount: null,
    quantity: null,
    ratePercent: null,
    modelName: null,
    area: null,
    pricePerSqM: null,
    year: null,
    annualDepreciationPercent: null,
    priceBeforeDepreciation: null,
    totalDepreciationPercent: null,
    depreciationAmount: null,
    valueAfterDepreciation: null,
    isBuilding: false,
    depreciationMethod: 'Gross' as const,
    depreciationPeriods: [],
  });

  const handleAddProjectDevCost = () => appendOther(makeBlankUserRow('ProjectDevCost'));
  const handleAddProjectCost = () => appendOther(makeBlankUserRow('ProjectCost'));

  // C01 — prefer the system-derived title sum; fall back to persisted summary value.
  const totalArea = totalLandAreaFromTitles ?? s?.totalArea ?? null;

  const L = (k: string) => t(`hypothesis.ledger.lb.${k}` as never) as string;
  const yrs =
    s?.estimatedDurationMonths != null ? (s.estimatedDurationMonths / 12).toFixed(2) : '-';

  return (
    <IsCalculatingProvider value={isCalculating ?? false}>
      <LedgerWithChart
        chart={
          showChart ? <HypothesisResidualWaterfall variant="LandBuilding" summary={s} /> : undefined
        }
      >
        <LedgerTable ratio>
          {/* ── Land (C01–C10A) ── */}
          <LedgerBand id="land" title={sec.land}>
            <LedgerRow
              label={L('totalArea')}
              tip={LB_TIPS.totalArea}
              qty={<Qty value={totalArea} unit={u('sqWa')} />}
            />
            <LedgerRow
              label={L('sellingArea')}
              tip={LB_TIPS.sellingArea}
              rate={
                <RateValue
                  value={pct(s?.sellingAreaPercent)}
                  danger={isSellingAreaOutOfBand(s?.sellingAreaPercent)}
                  note={t('hypothesis.ledger.n.ofTotalArea')}
                />
              }
              qty={<Qty value={s?.sellingArea} unit={u('sqWa')} />}
            />
            {modelList.map(m => (
              <LedgerRow
                key={m.modelName}
                sub
                label={`- ${m.modelName}`}
                rate={
                  <RateValue
                    value={<Num value={m.unitCount} int />}
                    unit={u('unit')}
                    note={t('hypothesis.ledger.n.avgSqWa', {
                      value: (m.avgLandAreaSqWa ?? 0).toFixed(2),
                    })}
                  />
                }
                qty={<Qty value={m.totalLandAreaSqWa} unit={u('sqWa')} />}
              />
            ))}
            <LedgerRow
              label={L('publicUtilityArea')}
              tip={LB_TIPS.publicUtilityArea}
              rate={
                <RateValue
                  value={pct(s?.publicUtilityAreaPercent)}
                  note={t('hypothesis.ledger.n.ofTotalArea')}
                />
              }
              qty={<Qty value={s?.publicUtilityArea} unit={u('sqWa')} />}
            />
            <LedgerRemarkRow control={control} name="summary.remark" />
          </LedgerBand>

          {/* ── Revenue (C11–C15) ── */}
          <LedgerBand id="rev" title={sec.rev}>
            <LedgerRow
              label={L('houseModel')}
              rate={
                <span className="text-[10.5px] text-gray-400">
                  {t('hypothesis.ledger.n.perModelUpload')}
                </span>
              }
            />
            {modelList.map(m => (
              <LedgerRow
                key={m.modelName}
                sub
                label={`- ${m.modelName}`}
                rate={<RateValue value={<Num value={m.unitCount} int />} unit={u('unit')} />}
                total={<Num value={m.totalSellingPrice} />}
              />
            ))}
            <LedgerRow
              tone="tot"
              label={L('totalRevenue')}
              tip={LB_TIPS.totalRevenue}
              total={<Num value={s?.totalRevenue} />}
            />
          </LedgerBand>

          {/* ── Sales period (C16–C18) ── */}
          <LedgerBand id="sales" title={sec.sales}>
            <LedgerRow
              label={L('estSalesPeriod')}
              tip={LB_TIPS.estSalesPeriod}
              rate={
                <RateInput
                  control={control}
                  name="summary.estSalesPeriod"
                  decimals={0}
                  unit={u('houseMonth')}
                />
              }
              qty={<Qty value={s?.totalUnits} unit={u('unit')} int />}
              total={<Num value={s?.estimatedDurationMonths} int />}
              totalUnit={u('month')}
            />
          </LedgerBand>

          {/* ── Project development cost (C19–C39) ── */}
          <LedgerBand id="pdc" title={sec.pdc}>
            <LedgerRow
              label={L('constructionCost')}
              rate={
                <span className="text-[10.5px] text-gray-400">
                  {t('hypothesis.ledger.n.fromBuilding')}
                </span>
              }
            />
            {modelList.map(m => {
              const warning =
                m.totalCost != null
                  ? t('hypothesis.costTab.pillTotalEdited')
                  : !m.buildingPropertyId
                    ? t('hypothesis.costTab.pillNoBuilding')
                    : undefined;
              return (
                <LedgerRow
                  key={m.modelName}
                  sub
                  label={
                    <>
                      - {m.modelName}
                      {warning && (
                        <span className="ml-[6px]">
                          <Badge tone="yellow" size="sm" dot={false}>
                            {warning}
                          </Badge>
                        </span>
                      )}
                    </>
                  }
                  rate={
                    <RateValue
                      value={<Num value={m.totalBuildingValueAfterDepreciation} />}
                      unit={u('bahtUnit')}
                    />
                  }
                  qty={<Qty value={m.unitCount} unit={u('unit')} int />}
                  total={<Num value={m.totalValueAfterDepreciationAllUnits} />}
                  ratio={pct(m.devCostRatioPercent)}
                />
              );
            })}
            <LedgerRow
              label={L('publicUtilityConstruction')}
              tip={LB_TIPS.publicUtilityConstruction}
              rate={
                <RateInput
                  control={control}
                  name="summary.publicUtilityRatePerSqWa"
                  unit={u('bahtSqWa')}
                />
              }
              qty={<Qty value={s?.publicUtilityAreaForCost} unit={u('sqWa')} />}
              total={<Num value={s?.publicUtilityCost} />}
              ratio={pct(s?.publicUtilityCostRatio)}
            />
            <LedgerRow
              label={L('landFilling')}
              tip={LB_TIPS.landFilling}
              rate={
                <RateInput
                  control={control}
                  name="summary.landFillingRatePerSqWa"
                  unit={u('bahtSqWa')}
                />
              }
              qty={<Qty value={s?.landFillingArea} unit={u('sqWa')} />}
              total={<Num value={s?.landFillingCost} />}
              ratio={pct(s?.landFillingCostRatio)}
            />
            {projectDevCostRows.map(({ rhfKey, idx, field }) => (
              <UserAddedPdcRow
                key={rhfKey}
                index={idx}
                serverItemId={field.id ?? null}
                categoryRatioById={categoryRatioById}
                totalProjectDevCost={s?.totalProjectDevCost ?? null}
                onRemove={() => removeOther(idx)}
              />
            ))}
            {!readOnly && (
              <LedgerAddRow
                label={t('hypothesis.ledger.addPdc')}
                onClick={handleAddProjectDevCost}
              />
            )}
            <LedgerRow
              label={L('contingency')}
              tip={LB_TIPS.contingencyDev}
              rate={
                <RateInput
                  control={control}
                  name="summary.contingencyPercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofPdc')}
                />
              }
              total={<Num value={s?.contingencyAmount} />}
              ratio={pct(s?.contingencyRatio)}
            />
            <LedgerRow
              tone="tot"
              label={L('totalPdc')}
              total={<Num value={s?.totalProjectDevCost} />}
              ratio={pct(s?.totalDevCostRatio)}
            />
          </LedgerBand>

          {/* ── Construction period (C40–C42) ── */}
          <LedgerBand id="cons" title={sec.cons}>
            <LedgerRow
              label={L('estConstructionPeriod')}
              tip={LB_TIPS.estConstructionPeriod}
              rate={
                <RateInput
                  control={control}
                  name="summary.estConstructionPeriod"
                  decimals={0}
                  unit={u('houseMonth')}
                />
              }
              qty={<Qty value={s?.totalUnitsForConstruction} unit={u('unit')} int />}
              total={<Num value={s?.estimatedConstructionDurationMonths} int />}
              totalUnit={u('month')}
            />
          </LedgerBand>

          {/* ── Project cost (C43–C65) ── */}
          <LedgerBand id="pc" title={sec.pc}>
            <LedgerRow
              label={L('allocationPermitFee')}
              tip={LB_TIPS.allocationPermitFee}
              rate={
                <RateInput control={control} name="summary.allocationPermitFee" unit={u('baht')} />
              }
              total={<Num value={s?.allocationPermitFee} />}
              ratio={pct(s?.allocationPermitFeeRatio)}
            />
            <LedgerRow
              label={L('landTitleFee')}
              tip={LB_TIPS.landTitleFee}
              rate={
                <RateInput
                  control={control}
                  name="summary.landTitleFeePerPlot"
                  unit={u('bahtPlot')}
                />
              }
              qty={<Qty value={s?.totalPlots} unit={u('unit')} int />}
              total={<Num value={s?.landTitleFeeTotal} />}
              ratio={pct(s?.landTitleFeeRatio)}
            />
            <LedgerRow
              label={L('professionalFee')}
              tip={LB_TIPS.professionalFee}
              rate={
                <RateInput
                  control={control}
                  name="summary.professionalFeePerMonth"
                  unit={u('bahtMonth')}
                />
              }
              qty={<Qty value={s?.professionalFeeMonths} unit={u('monthConstruction')} int />}
              total={<Num value={s?.professionalFeeTotal} />}
              ratio={pct(s?.professionalFeeRatio)}
            />
            <LedgerRow
              label={L('adminCost')}
              tip={LB_TIPS.adminCost}
              rate={
                <RateInput
                  control={control}
                  name="summary.adminCostPerMonth"
                  unit={u('bahtMonth')}
                />
              }
              qty={<Qty value={s?.adminCostMonths} unit={u('monthSales')} int />}
              total={<Num value={s?.adminCostTotal} />}
              ratio={pct(s?.adminCostRatio)}
            />
            <LedgerRow
              label={L('sellingAdv')}
              tip={LB_TIPS.sellingAdv}
              rate={
                <RateInput
                  control={control}
                  name="summary.sellingAdvPercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofRevenue')}
                />
              }
              total={<Num value={s?.sellingAdvTotal} />}
              ratio={pct(s?.sellingAdvRatio)}
            />
            {projectCostRows.map(({ rhfKey, idx, field }) => (
              <UserAddedPdcRow
                key={rhfKey}
                index={idx}
                serverItemId={field.id ?? null}
                categoryRatioById={categoryRatioById}
                totalProjectDevCost={s?.totalProjectCost ?? null}
                onRemove={() => removeOther(idx)}
              />
            ))}
            {!readOnly && (
              <LedgerAddRow label={t('hypothesis.ledger.addPc')} onClick={handleAddProjectCost} />
            )}
            <LedgerRow
              label={L('contingency')}
              tip={LB_TIPS.contingencyProject}
              rate={
                <RateInput
                  control={control}
                  name="summary.projectContingencyPercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofPc')}
                />
              }
              total={<Num value={s?.projectContingencyAmount} />}
              ratio={pct(s?.projectContingencyRatio)}
            />
            <LedgerRow
              tone="tot"
              label={L('totalPc')}
              total={<Num value={s?.totalProjectCost} />}
              ratio={pct(s?.totalProjectCostRatio)}
            />
          </LedgerBand>

          {/* ── Government taxes (C66–C73) ── */}
          <LedgerBand id="gov" title={sec.gov}>
            <LedgerRow
              label={L('transferFee')}
              tip={LB_TIPS.transferFee}
              rate={
                <RateInput
                  control={control}
                  name="summary.transferFeePercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofRevenue')}
                />
              }
              total={<Num value={s?.transferFeeAmount} />}
              ratio={pct(s?.transferFeeRatio)}
            />
            <LedgerRow
              label={L('specificBizTax')}
              tip={LB_TIPS.specificBizTax}
              rate={
                <RateInput
                  control={control}
                  name="summary.specificBizTaxPercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofRevenue')}
                />
              }
              total={<Num value={s?.specificBizTaxAmount} />}
              ratio={pct(s?.specificBizTaxRatio)}
            />
            <LedgerRow
              tone="tot"
              label={L('totalGov')}
              total={<Num value={s?.totalGovTax} />}
              ratio={pct(s?.totalGovTaxRatio)}
            />
          </LedgerBand>

          {/* ── Risk (C74–C75) ── */}
          <LedgerBand id="risk" title={sec.risk}>
            <LedgerRow
              label={L('riskPremium')}
              tip={LB_TIPS.riskPremium}
              rate={
                <RateInput
                  control={control}
                  name="summary.riskPremiumPercent"
                  unit="%"
                  note={t('hypothesis.ledger.n.ofRevenue')}
                />
              }
              total={<Num value={s?.riskPremiumAmount} />}
            />
          </LedgerBand>

          {/* ── Total cost (C76) ── */}
          <LedgerBand id="tdc" title={sec.tdc}>
            <LedgerRow
              tone="tot"
              label={L('totalDev')}
              total={<Num value={s?.totalDevCostsAndExpenses} />}
            />
          </LedgerBand>

          {/* ── Final value (C77–C82) ── */}
          <LedgerBand id="fv" title={sec.fv}>
            <LedgerRow
              label={L('currentValue')}
              tip={LB_TIPS.currentPropertyValue}
              rate={
                <span className="text-[10.5px] text-gray-400">
                  {t('hypothesis.ledger.n.revenueMinusCost')}
                </span>
              }
              total={<Num value={s?.currentPropertyValue} />}
            />
            <LedgerRow
              label={L('discountRate')}
              tip={LB_TIPS.discountRate}
              rate={
                <RateInput
                  control={control}
                  name="summary.discountRate"
                  unit="%"
                  note={t('hypothesis.ledger.n.noDiscount')}
                />
              }
            />
            <LedgerRow
              label={L('discountFactor')}
              tip={LB_TIPS.discountRateFactor}
              rate={
                <RateValue
                  value={
                    s?.discountRateFactor != null ? Number(s.discountRateFactor).toFixed(4) : ''
                  }
                  note={t('hypothesis.ledger.n.salesPeriod', {
                    years: yrs,
                    months: s?.estimatedDurationMonths ?? '-',
                  })}
                />
              }
            />
            <LedgerRow
              tone="tot"
              label={L('finalValue')}
              tip={LB_TIPS.finalPropertyValue}
              total={<Num value={s?.finalPropertyValue} />}
            />
            <LedgerIndicatedValueRow
              control={control}
              computed={s?.totalAssetValueRounded}
              tip={LB_TIPS.totalAssetValueRounded}
              disabled={readOnly}
            />
            <LedgerRow
              tone="tot"
              label={L('perSqWa')}
              tip={LB_TIPS.totalAssetValuePerSqWa}
              total={<Num value={s?.totalAssetValuePerSqWa} />}
              totalUnit={u('bahtSqWa')}
            />
          </LedgerBand>
        </LedgerTable>
      </LedgerWithChart>
    </IsCalculatingProvider>
  );
}

// Selling area % is expected to land in [50, 70]. Outside that band → highlight red.
function isSellingAreaOutOfBand(percent?: number | null): boolean {
  if (percent === null || percent === undefined) return false;
  return percent < 50 || percent > 70;
}

function UserAddedPdcRow({
  index,
  serverItemId,
  categoryRatioById,
  totalProjectDevCost,
  onRemove,
}: {
  index: number;
  serverItemId: string | null;
  categoryRatioById: Map<string, number | null | undefined>;
  totalProjectDevCost: number | null;
  onRemove: () => void;
}) {
  const { t } = useTranslation('pricingAnalysis');
  const { control } = useFormContext<LandBuildingFormValues>();
  const amount = useWatch({ control, name: `otherCostItems.${index}.amount` as const });
  // Prefer server-computed ratio for saved rows; derive client-side for unsaved rows.
  const serverRatio = serverItemId ? categoryRatioById.get(serverItemId) : null;
  const amt = typeof amount === 'number' ? amount : amount != null ? Number(amount) : null;
  const derivedRatio =
    amt !== null && totalProjectDevCost && totalProjectDevCost > 0
      ? (amt * 100) / totalProjectDevCost
      : null;
  const ratio = serverRatio ?? derivedRatio;
  return (
    <LedgerUserRow
      ratio={ratio}
      onRemove={onRemove}
      descriptionInput={
        <Controller
          control={control}
          name={`otherCostItems.${index}.description` as const}
          render={({ field }) => (
            <input
              {...field}
              value={field.value ?? ''}
              placeholder={t('hypothesis.ledger.itemPlaceholder')}
              className="w-full h-[21px] text-[12px] border border-gray-200 rounded px-[6px] focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400"
            />
          )}
        />
      }
      amountInput={
        <Controller
          control={control}
          name={`otherCostItems.${index}.amount` as const}
          render={({ field }) => (
            <NumberInput
              value={field.value ?? null}
              onChange={e => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              decimalPlaces={2}
              fullWidth
              dense
            />
          )}
        />
      }
    />
  );
}

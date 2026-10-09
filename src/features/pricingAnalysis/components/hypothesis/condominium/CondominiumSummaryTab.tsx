/**
 * Summary tab for Condominium hypothesis analysis — E01..E59 per FSD §2.1.3.7.
 * Backend is source of truth for all derived values; the FE only sends user inputs.
 *
 * One ledger table (mock v94 `HC_LEDGER`), same shell as the Land & Building summary but with
 * no ratio column and no user-added rows.
 */
import { useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { CondominiumFormValues } from '../../../schemas/hypothesisForm';
import type { CondominiumSummaryDto } from '../../../types/hypothesis';
import {
  IsCalculatingProvider,
  LedgerTable,
  LedgerBand,
  LedgerRow,
  LedgerRemarkRow,
  LedgerIndicatedValueRow,
  LedgerWithChart,
  RateInput,
  RateValue,
  Qty,
  Num,
  pct,
} from '../_shared/summaryAtoms';
import { HypothesisResidualWaterfall } from '../../viz/HypothesisResidualWaterfall';
import { getCondoTooltips } from '../_shared/hypothesisTooltips';

interface CondominiumSummaryTabProps {
  previewSummary?: CondominiumSummaryDto | null;
  /** System-derived land area from title deeds (Sq.Wa) — preferred over persisted input. */
  totalLandAreaFromTitles?: number | null;
  isCalculating?: boolean;
  /** Charts aside on/off — the toggle lives in the tab toolbar (CondominiumTabs). */
  showChart?: boolean;
}

/** Section ids + labels, shared with the tab toolbar's jump bar. */
export function useCondoSections() {
  const { t } = useTranslation('pricingAnalysis');
  return [
    {
      id: 'land',
      title: t('hypothesis.ledger.condo.sec.land'),
      short: t('hypothesis.ledger.condo.short.land'),
    },
    {
      id: 'rev',
      title: t('hypothesis.ledger.condo.sec.rev'),
      short: t('hypothesis.ledger.condo.short.rev'),
    },
    {
      id: 'sales',
      title: t('hypothesis.ledger.condo.sec.sales'),
      short: t('hypothesis.ledger.condo.short.sales'),
    },
    {
      id: 'hard',
      title: t('hypothesis.ledger.condo.sec.hard'),
      short: t('hypothesis.ledger.condo.short.hard'),
    },
    {
      id: 'cons',
      title: t('hypothesis.ledger.condo.sec.cons'),
      short: t('hypothesis.ledger.condo.short.cons'),
    },
    {
      id: 'soft',
      title: t('hypothesis.ledger.condo.sec.soft'),
      short: t('hypothesis.ledger.condo.short.soft'),
    },
    {
      id: 'gov',
      title: t('hypothesis.ledger.condo.sec.gov'),
      short: t('hypothesis.ledger.condo.short.gov'),
    },
    {
      id: 'risk',
      title: t('hypothesis.ledger.condo.sec.risk'),
      short: t('hypothesis.ledger.condo.short.risk'),
    },
    {
      id: 'tdc',
      title: t('hypothesis.ledger.condo.sec.tdc'),
      short: t('hypothesis.ledger.condo.short.tdc'),
    },
    {
      id: 'fv',
      title: t('hypothesis.ledger.condo.sec.fv'),
      short: t('hypothesis.ledger.condo.short.fv'),
    },
  ];
}

export function CondominiumSummaryTab({
  previewSummary: s,
  totalLandAreaFromTitles,
  isCalculating,
  showChart,
}: CondominiumSummaryTabProps) {
  const { t } = useTranslation('pricingAnalysis');
  const readOnly = usePageReadOnly();
  const TIPS = getCondoTooltips(t);
  const { control } = useFormContext<CondominiumFormValues>();
  const sec = Object.fromEntries(useCondoSections().map(x => [x.id, x.title]));
  const L = (k: string) => t(`hypothesis.ledger.condo.${k}` as never) as string;
  const u = (
    k:
      | 'sqWa'
      | 'sqM'
      | 'baht'
      | 'unit'
      | 'month'
      | 'bahtSqM'
      | 'bahtUnit'
      | 'bahtMonth'
      | 'sqMUnit'
      | 'monthConstruction'
      | 'monthSales',
  ) => t(`hypothesis.ledger.u.${k}`);
  const n = (
    k:
      | 'ofConstructionArea'
      | 'average'
      | 'ofHardBase'
      | 'ofIncome'
      | 'ofSoftBase'
      | 'noDiscount'
      | 'gdvMinusCost',
  ) => t(`hypothesis.ledger.n.${k}`);

  // E01 prefers the live title-sum; fall back to the snapshot's persisted value.
  const areaTitleDeedSqWa = totalLandAreaFromTitles ?? s?.areaTitleDeed ?? null;
  const areaTitleDeedSqM =
    s?.areaSqM ?? (areaTitleDeedSqWa !== null ? Number(areaTitleDeedSqWa) * 4 : null);
  const months = s?.estSalesDurationMonths;
  const yrs = months != null ? (months / 12).toFixed(2) : '-';

  return (
    <IsCalculatingProvider value={isCalculating ?? false}>
      <LedgerWithChart
        chart={
          showChart ? <HypothesisResidualWaterfall variant="Condominium" summary={s} /> : undefined
        }
      >
        <LedgerTable>
          {/* ── Land / building area (E01–E09) ── */}
          <LedgerBand id="land" title={sec.land}>
            <LedgerRow
              label={L('areaTitleDeed')}
              tip={TIPS.areaTitleDeed}
              rate={
                <RateValue value={<Num value={areaTitleDeedSqWa} />} unit={u('sqWa')} note="≈" />
              }
              qty={<Qty value={areaTitleDeedSqM} unit={u('sqM')} />}
            />
            <LedgerRow
              label={L('far')}
              tip={TIPS.far}
              rate={<RateInput control={control} name="summary.far" decimals={0} unit=": 1" />}
            />
            <LedgerRow
              label={L('cityPlanArea')}
              tip={TIPS.far}
              qty={<Qty value={s?.constructionAreaCityPlan} unit={u('sqM')} />}
            />
            <LedgerRow
              label={L('totalBuildingArea')}
              tip={TIPS.totalBuildingArea}
              rate={
                <RateInput control={control} name="summary.totalBuildingArea" unit={u('sqM')} />
              }
            />
            <LedgerRow
              label={L('commonArea')}
              tip={TIPS.commonArea}
              rate={<RateValue value={pct(s?.commonAreaPercent)} note={n('ofConstructionArea')} />}
              qty={<Qty value={s?.commonArea} unit={u('sqM')} />}
            />
            <LedgerRow
              label={L('indoorSalesArea')}
              tip={TIPS.indoorSalesArea}
              rate={
                <RateValue value={pct(s?.indoorSalesAreaPercent)} note={n('ofConstructionArea')} />
              }
              qty={<Qty value={s?.indoorSalesArea} unit={u('sqM')} />}
            />
            <LedgerRemarkRow control={control} name="summary.remark" />
          </LedgerBand>

          {/* ── Revenue (E10–E13) ── */}
          <LedgerBand id="rev" title={sec.rev}>
            <LedgerRow
              label={L('projectSalesArea')}
              tip={TIPS.projectSalesArea}
              qty={<Qty value={s?.projectSalesArea} unit={u('sqM')} />}
            />
            <LedgerRow
              label={L('avgSellingPrice')}
              tip={TIPS.averageSellingPrice}
              rate={<RateValue value={<Num value={s?.averagePricePerSqM} />} unit={u('bahtSqM')} />}
            />
            <LedgerRow
              label={L('totalSellingPrice')}
              tip={TIPS.totalRevenue}
              total={<Num value={s?.totalProjectSellingPrice} />}
            />
            <LedgerRow
              tone="tot"
              label={L('totalRevenue')}
              total={<Num value={s?.totalRevenue} />}
            />
          </LedgerBand>

          {/* ── Sales duration (E14) ── */}
          <LedgerBand id="sales" title={sec.sales}>
            <LedgerRow
              label={L('estSalesDuration')}
              tip={TIPS.estSalesDuration}
              rate={
                <RateInput
                  control={control}
                  name="summary.estSalesDurationMonths"
                  decimals={0}
                  unit={u('month')}
                />
              }
            />
          </LedgerBand>

          {/* ── Hard cost (E15–E27) ── */}
          <LedgerBand id="hard" title={sec.hard}>
            <LedgerRow
              label={L('buildingCost')}
              tip={TIPS.condoBuildingCost}
              rate={
                <RateInput
                  control={control}
                  name="summary.condoBuildingCostPerSqM"
                  unit={u('bahtSqM')}
                />
              }
              qty={<Qty value={s?.buildingArea} unit={u('sqM')} />}
              total={<Num value={s?.condoBuildingCostTotal} />}
            />
            <LedgerRow
              label={L('avgRoomSize')}
              tip={TIPS.setAvgRoomSize}
              rate={
                <RateValue
                  value={<Num value={s?.setAvgRoomSizeUnits} int />}
                  unit={u('unit')}
                  note={n('average')}
                />
              }
              qty={<Qty value={s?.avgIndoorSalesAreaPerUnit} unit={u('sqMUnit')} />}
            />
            <LedgerRow
              label={L('furniture')}
              tip={TIPS.furniture}
              rate={
                <RateInput control={control} name="summary.furniturePerUnit" unit={u('bahtUnit')} />
              }
              qty={<Qty value={s?.furnitureQuantity} unit={u('unit')} int />}
              total={<Num value={s?.furnitureTotal} />}
            />
            <LedgerRow
              label={L('externalUtilities')}
              tip={TIPS.externalUtilities}
              rate={
                <RateInput
                  control={control}
                  name="summary.externalUtilities"
                  unit={u('baht')}
                  note="MAO"
                />
              }
              total={<Num value={s?.externalUtilitiesTotal} />}
            />
            <LedgerRow
              label={L('hardContingency')}
              tip={TIPS.hardCostContingency}
              rate={
                <RateInput
                  control={control}
                  name="summary.hardCostContingencyPercent"
                  unit="%"
                  note={n('ofHardBase')}
                />
              }
              total={<Num value={s?.hardCostContingencyAmount} />}
            />
            <LedgerRow tone="tot" label={L('totalHard')} total={<Num value={s?.totalHardCost} />} />
          </LedgerBand>

          {/* ── Construction period (E28) ── */}
          <LedgerBand id="cons" title={sec.cons}>
            <LedgerRow
              label={L('estConstructionDuration')}
              tip={TIPS.estConstructionPeriod}
              rate={
                <RateInput
                  control={control}
                  name="summary.estConstructionPeriodMonths"
                  decimals={0}
                  unit={u('month')}
                />
              }
            />
          </LedgerBand>

          {/* ── Soft cost (E29–E45) ── */}
          <LedgerBand id="soft" title={sec.soft}>
            <LedgerRow
              label={L('professionalFee')}
              tip={TIPS.professionalFee}
              rate={
                <RateInput
                  control={control}
                  name="summary.professionalFeePerMonth"
                  unit={u('bahtMonth')}
                />
              }
              qty={<Qty value={s?.professionalFeeMonths} unit={u('monthConstruction')} int />}
              total={<Num value={s?.professionalFeeTotal} />}
            />
            <LedgerRow
              label={L('adminCost')}
              tip={TIPS.adminCost}
              rate={
                <RateInput
                  control={control}
                  name="summary.adminCostPerMonth"
                  unit={u('bahtMonth')}
                />
              }
              qty={<Qty value={s?.adminCostMonths} unit={u('monthSales')} int />}
              total={<Num value={s?.adminCostTotal} />}
            />
            <LedgerRow
              label={L('sellingAdv')}
              tip={TIPS.sellingAdv}
              rate={
                <RateInput
                  control={control}
                  name="summary.sellingAdvPercent"
                  unit="%"
                  note={n('ofIncome')}
                />
              }
              total={<Num value={s?.sellingAdvTotal} />}
            />
            <LedgerRow
              label={L('titleDeedFee')}
              tip={TIPS.titleDeedFee}
              rate={<RateInput control={control} name="summary.titleDeedFee" unit={u('baht')} />}
              total={<Num value={s?.titleDeedFeeTotal} />}
            />
            <LedgerRow
              label={L('eia')}
              tip={TIPS.eiaCost}
              rate={<RateInput control={control} name="summary.eiaCost" unit={u('baht')} />}
              total={<Num value={s?.eiaCostTotal} />}
            />
            <LedgerRow
              label={L('registrationFee')}
              tip={TIPS.condoRegistrationFee}
              rate={
                <RateInput control={control} name="summary.condoRegistrationFee" unit={u('baht')} />
              }
              total={<Num value={s?.condoRegistrationFeeTotal} />}
            />
            <LedgerRow
              label={L('otherExpenses')}
              tip={TIPS.otherExpenses}
              rate={
                <RateInput
                  control={control}
                  name="summary.otherExpensesPercent"
                  unit="%"
                  note={n('ofSoftBase')}
                />
              }
              total={<Num value={s?.otherExpensesTotal} />}
            />
            <LedgerRow tone="tot" label={L('totalSoft')} total={<Num value={s?.totalSoftCost} />} />
          </LedgerBand>

          {/* ── Government taxes (E46–E50) ── */}
          <LedgerBand id="gov" title={sec.gov}>
            <LedgerRow
              label={L('transferFee')}
              tip={TIPS.transferFee}
              rate={
                <RateInput
                  control={control}
                  name="summary.transferFeePercent"
                  unit="%"
                  note={n('ofIncome')}
                />
              }
              total={<Num value={s?.transferFeeTotal} />}
            />
            <LedgerRow
              label={L('specificBizTax')}
              tip={TIPS.specificBizTax}
              rate={
                <RateInput
                  control={control}
                  name="summary.specificBizTaxPercent"
                  unit="%"
                  note={n('ofIncome')}
                />
              }
              total={<Num value={s?.specificBizTaxTotal} />}
            />
            <LedgerRow tone="tot" label={L('totalGov')} total={<Num value={s?.totalGovTax} />} />
          </LedgerBand>

          {/* ── Risk and profit (E51–E52) ── */}
          <LedgerBand id="risk" title={sec.risk}>
            <LedgerRow
              label={L('riskProfit')}
              tip={TIPS.riskProfit}
              rate={
                <RateInput
                  control={control}
                  name="summary.riskProfitPercent"
                  unit="%"
                  note={n('ofIncome')}
                />
              }
              total={<Num value={s?.riskProfitTotal} />}
            />
          </LedgerBand>

          {/* ── Total cost (E53) ── */}
          <LedgerBand id="tdc" title={sec.tdc}>
            <LedgerRow tone="tot" label={L('totalDev')} total={<Num value={s?.totalDevCosts} />} />
          </LedgerBand>

          {/* ── Final value (E54–E59) ── */}
          <LedgerBand id="fv" title={sec.fv}>
            <LedgerRow
              label={L('remainingValue')}
              tip={TIPS.totalRemainingValue}
              rate={<span className="text-[10.5px] text-gray-400">{n('gdvMinusCost')}</span>}
              total={<Num value={s?.totalRemainingValue} />}
            />
            <LedgerRow
              label={L('discountRate')}
              tip={TIPS.discountRate}
              rate={
                <RateInput
                  control={control}
                  name="summary.discountRate"
                  unit="%"
                  note={n('noDiscount')}
                />
              }
            />
            <LedgerRow
              label={L('discountFactor')}
              tip={TIPS.discountRateFactor}
              rate={
                <RateValue
                  value={
                    s?.discountRateFactor != null ? Number(s.discountRateFactor).toFixed(4) : ''
                  }
                  note={t('hypothesis.ledger.n.salesPeriod', { years: yrs, months: months ?? '-' })}
                />
              }
            />
            <LedgerRow
              tone="tot"
              label={L('finalRemainingValue')}
              tip={TIPS.finalRemainingValue}
              total={<Num value={s?.finalRemainingValue} />}
            />
            <LedgerIndicatedValueRow
              control={control}
              computed={s?.totalAssetValueRounded}
              tip={TIPS.totalAssetValueRounded}
              disabled={readOnly}
            />
            <LedgerRow
              tone="tot"
              label={L('perSqM')}
              tip={TIPS.totalAssetValuePerSqM}
              total={<Num value={s?.totalAssetValuePerSqM} />}
              totalUnit={u('bahtSqM')}
            />
          </LedgerBand>
        </LedgerTable>
      </LedgerWithChart>
    </IsCalculatingProvider>
  );
}

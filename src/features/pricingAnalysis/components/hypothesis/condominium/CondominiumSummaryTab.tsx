/**
 * Summary tab for Condominium hypothesis analysis.
 * Maps to E01..E59 per FSD §2.1.3.7. Backend is source of truth for all derived
 * values; the FE only sends user inputs and overlays computed fields.
 *
 * Section structure mirrors the Land & Building variant (see LandBuildingSummaryTab.tsx)
 * using the shared atoms in `_shared/summaryAtoms.tsx`.
 */
import { useFormContext, Controller } from 'react-hook-form';
import type { CondominiumFormValues } from '../../../schemas/hypothesisForm';
import type { CondominiumSummaryDto } from '../../../types/hypothesis';
import { fmt } from '../../../domain/formatters';
import {
  SectionPrimary,
  FieldRow,
  DerivedValue,
  PdcDerivedRow,
  PdcTotalRow,
  FvDerivedRow,
  FvInputRow,
  InlineNumberInput,
} from '../_shared/summaryAtoms';
import { HypothesisResidualWaterfall } from '../../viz/HypothesisResidualWaterfall';
import { HypothesisCostDonut } from '../../viz/HypothesisCostDonut';
import { CONDO_TIPS } from '../_shared/hypothesisTooltips';

interface CondominiumSummaryTabProps {
  previewSummary?: CondominiumSummaryDto | null;
  /** System-derived land area from title deeds (Sq.Wa) — preferred over persisted input. */
  totalLandAreaFromTitles?: number | null;
}

export function CondominiumSummaryTab({
  previewSummary: s,
  totalLandAreaFromTitles,
}: CondominiumSummaryTabProps) {
  const { control } = useFormContext<CondominiumFormValues>();
  // E01 prefers the live title-sum; fall back to the snapshot's persisted value.
  const areaTitleDeedSqWa = totalLandAreaFromTitles ?? s?.areaTitleDeed ?? null;
  const areaTitleDeedSqM =
    s?.areaSqM ?? (areaTitleDeedSqWa !== null ? Number(areaTitleDeedSqWa) * 4 : null);

  return (
    <div className="space-y-5">
      {/* ── Visual residual story + cost composition ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <HypothesisResidualWaterfall variant="Condominium" summary={s} />
        </div>
        <div className="lg:col-span-5">
          <HypothesisCostDonut variant="Condominium" summary={s} />
        </div>
      </div>

      {/* ── Land Area Details (E01-E09) ─────────────────────────────────── */}
      {/*
        Inputs: E01 AreaTitleDeed (Sq.Wa), E03 FAR, E05 TotalBuildingArea.
        Derived: E02 = E01×4, E04 = E02×E03, E06/E07 = 100−E08 / E05−E09,
                 E08/E09 sourced from active upload.
      */}
      <SectionPrimary title="Land Area Details">
        <FieldRow label="Area According to Title Deed" tooltip={CONDO_TIPS.areaTitleDeed}>
          <div className="ml-auto flex items-center gap-2">
            <span className="min-w-[110px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(areaTitleDeedSqWa)}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.W</span>
          </div>
        </FieldRow>

        <FieldRow label="">
          <div className="ml-auto flex items-center gap-2">
            <span className="min-w-[110px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(areaTitleDeedSqM)}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.M</span>
          </div>
        </FieldRow>

        <FieldRow label="Floor Area Ratio (FAR)" tooltip={CONDO_TIPS.far}>
          <div className="ml-auto flex items-center gap-2">
            <InlineNumberInput control={control} name="summary.far" decimalPlaces={0} />
            <span className="text-[11px] text-gray-500 whitespace-nowrap">: 1</span>
          </div>
        </FieldRow>

        <FieldRow label="Construction Area According to City Plan" tooltip={CONDO_TIPS.far}>
          <div className="ml-auto flex items-center gap-2">
            <span className="min-w-[110px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.constructionAreaCityPlan)}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.M</span>
          </div>
        </FieldRow>

        <FieldRow label="Total Building Area" tooltip={CONDO_TIPS.totalBuildingArea}>
          <div className="ml-auto flex items-center gap-2">
            <InlineNumberInput control={control} name="summary.totalBuildingArea" />
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.M</span>
          </div>
        </FieldRow>

        <FieldRow label="Common Area" tooltip={CONDO_TIPS.commonArea}>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-gray-500">Consider At</span>
            <span className="min-w-[70px] text-right tabular-nums text-xs font-medium text-gray-800">
              {s?.commonAreaPercent !== null && s?.commonAreaPercent !== undefined
                ? `${Number(s.commonAreaPercent).toFixed(2)} %`
                : '-'}
            </span>
            <span className="text-[11px] text-gray-500">Of The Total Construction Area</span>
            <span className="min-w-[110px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.commonArea)}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.M</span>
          </div>
        </FieldRow>

        <FieldRow label="Indoor Sales Area" tooltip={CONDO_TIPS.indoorSalesArea}>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-[11px] text-gray-500">Consider At</span>
            <span className="min-w-[70px] text-right tabular-nums text-xs font-medium text-gray-800">
              {s?.indoorSalesAreaPercent !== null && s?.indoorSalesAreaPercent !== undefined
                ? `${Number(s.indoorSalesAreaPercent).toFixed(2)} %`
                : '-'}
            </span>
            <span className="text-[11px] text-gray-500">Of The Total Construction Area</span>
            <span className="min-w-[110px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.indoorSalesArea)}
            </span>
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Sq.M</span>
          </div>
        </FieldRow>

        <FieldRow label="Remark" alignTop>
          <Controller
            control={control}
            name="summary.remark"
            render={({ field }) => (
              <textarea
                {...field}
                value={field.value ?? ''}
                rows={3}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400"
                placeholder="Notes or assumptions about the assessed land area…"
              />
            )}
          />
        </FieldRow>
      </SectionPrimary>

      {/* ── Project Revenue Estimates (E10-E13) ────────────────────────── */}
      <SectionPrimary id="hyp-section-revenue" title="Project Revenue Estimates">
        <FieldRow label="Project Sales Area" tooltip={CONDO_TIPS.projectSalesArea}>
          <DerivedValue value={s?.projectSalesArea} unit="Sq.M" />
        </FieldRow>
        <FieldRow label="Average Selling Price" tooltip={CONDO_TIPS.averageSellingPrice}>
          <DerivedValue value={s?.averagePricePerSqM} unit="Baht/Sq.M" />
        </FieldRow>
        <FieldRow label="Total Project Selling Price" tooltip={CONDO_TIPS.totalRevenue}>
          <DerivedValue value={s?.totalProjectSellingPrice} unit="Baht" />
        </FieldRow>
        <PdcTotalRow label="Total Project Revenue Estimates (Total of GDV)" total={s?.totalRevenue} ratioPercent={null} />
      </SectionPrimary>

      {/* ── Estimate Sales Period (E14) ────────────────────────────────── */}
      <SectionPrimary title="Estimate Project Sales Duration">
        <FieldRow label="Estimated Sales Duration" tooltip={CONDO_TIPS.estSalesDuration}>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <InlineNumberInput
              control={control}
              name="summary.estSalesDurationMonths"
              decimalPlaces={0}
            />
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Month</span>
          </div>
        </FieldRow>
      </SectionPrimary>

      {/* ── Hard Cost Estimates (E15-E27) ──────────────────────────────── */}
      <SectionPrimary id="hyp-section-hard" title="Estimate building construction costs and project development costs (Hard Cost)">
        <PdcDerivedRow
          label="Condominium Building Construction"
          tooltip={CONDO_TIPS.condoBuildingCost}
          rateInput={
            <InlineNumberInput control={control} name="summary.condoBuildingCostPerSqM" fillSlot />
          }
          rateUnit="Baht/Sq.M"
          qtyLabel="Area"
          qtyValue={s?.buildingArea}
          qtyUnit="Sq.M"
          total={s?.condoBuildingCostTotal}
          ratioPercent={null}
          compact
        />

        {/* E18: total units sourced from active unit-detail upload (read-only). */}
        <PdcDerivedRow
          label="Set Average Room Size"
          tooltip={CONDO_TIPS.setAvgRoomSize}
          rateInput={
            <span className="text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.setAvgRoomSizeUnits)}
            </span>
          }
          rateUnit="Unit"
          qtyLabel="Average"
          qtyValue={s?.avgIndoorSalesAreaPerUnit}
          qtyUnit="Sq.M/Unit"
          total={null}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Furniture, Kitchen Sets and Air Conditioners"
          tooltip={CONDO_TIPS.furniture}
          rateInput={
            <InlineNumberInput control={control} name="summary.furniturePerUnit" fillSlot />
          }
          rateUnit="Baht/Unit"
          qtyLabel="Quantity"
          qtyValue={s?.furnitureQuantity}
          qtyUnit="Unit"
          total={s?.furnitureTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="External Utilities of The Project"
          tooltip={CONDO_TIPS.externalUtilities}
          rateInput={
            <InlineNumberInput control={control} name="summary.externalUtilities" fillSlot />
          }
          rateUnit="Baht"
          rateSuffix="Maximum Allowable Outcome (MAO)"
          total={s?.externalUtilitiesTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Contingency / Deficiency"
          tooltip={CONDO_TIPS.hardCostContingency}
          rateInput={
            <InlineNumberInput control={control} name="summary.hardCostContingencyPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Building Construction Costs and Project Development Costs"
          total={s?.hardCostContingencyAmount}
          ratioPercent={null}
          compact
        />

        <PdcTotalRow label="Total Hard Cost" total={s?.totalHardCost} ratioPercent={null} />
      </SectionPrimary>

      {/* ── Estimate Construction Period (E28) ─────────────────────────── */}
      <SectionPrimary title="Estimate The Project Construction Period">
        <FieldRow label="Estimated Construction Duration" tooltip={CONDO_TIPS.estConstructionPeriod}>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <InlineNumberInput
              control={control}
              name="summary.estConstructionPeriodMonths"
              decimalPlaces={0}
            />
            <span className="text-[11px] text-gray-500 whitespace-nowrap">Month</span>
          </div>
        </FieldRow>
      </SectionPrimary>

      {/* ── Soft Cost Estimates (E29-E45) ──────────────────────────────── */}
      <SectionPrimary id="hyp-section-soft" title="Project Cost Estimation (Soft Cost)">
        <PdcDerivedRow
          label="Professional Service Fees and Construction Supervision"
          tooltip={CONDO_TIPS.professionalFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.professionalFeePerMonth" fillSlot />
          }
          rateUnit="Baht/Month"
          qtyValue={s?.professionalFeeMonths}
          qtyUnit="Month"
          total={s?.professionalFeeTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Project Administration and Management Costs"
          tooltip={CONDO_TIPS.adminCost}
          rateInput={
            <InlineNumberInput control={control} name="summary.adminCostPerMonth" fillSlot />
          }
          rateUnit="Baht/Month"
          qtyValue={s?.adminCostMonths}
          qtyUnit="Month"
          total={s?.adminCostTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Selling and Advertising Expenses"
          tooltip={CONDO_TIPS.sellingAdv}
          rateInput={
            <InlineNumberInput control={control} name="summary.sellingAdvPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Income"
          total={s?.sellingAdvTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Condo Title Deed Issuance Fee"
          tooltip={CONDO_TIPS.titleDeedFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.titleDeedFee" fillSlot />
          }
          rateUnit="Baht"
          total={s?.titleDeedFeeTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Cost of Preparing an Environmental Impact Assessment (EIA) Report"
          tooltip={CONDO_TIPS.eiaCost}
          rateInput={
            <InlineNumberInput control={control} name="summary.eiaCost" fillSlot />
          }
          rateUnit="Baht"
          total={s?.eiaCostTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Condominium Registration Permit Fee"
          tooltip={CONDO_TIPS.condoRegistrationFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.condoRegistrationFee" fillSlot />
          }
          rateUnit="Baht"
          total={s?.condoRegistrationFeeTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Other Expenses"
          tooltip={CONDO_TIPS.otherExpenses}
          rateInput={
            <InlineNumberInput control={control} name="summary.otherExpensesPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Cost Expenses"
          total={s?.otherExpensesTotal}
          ratioPercent={null}
          compact
        />

        <PdcTotalRow label="Total Soft Cost" total={s?.totalSoftCost} ratioPercent={null} />
      </SectionPrimary>

      {/* ── Government Taxes and Fees (E46-E50) ────────────────────────── */}
      <SectionPrimary id="hyp-section-tax" title="Government Taxes and Fees">
        <PdcDerivedRow
          label="Transfer Fee"
          tooltip={CONDO_TIPS.transferFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.transferFeePercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Income"
          total={s?.transferFeeTotal}
          ratioPercent={null}
          compact
        />

        <PdcDerivedRow
          label="Specific Business Tax"
          tooltip={CONDO_TIPS.specificBizTax}
          rateInput={
            <InlineNumberInput control={control} name="summary.specificBizTaxPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Income"
          total={s?.specificBizTaxTotal}
          ratioPercent={null}
          compact
        />

        <PdcTotalRow
          label="Total Government Taxes and Fees"
          total={s?.totalGovTax}
          ratioPercent={null}
        />
      </SectionPrimary>

      {/* ── Risk and Expected Profit (E51-E52) ─────────────────────────── */}
      <SectionPrimary id="hyp-section-risk" title="Estimate Risk and Expected Profit">
        <PdcDerivedRow
          label="Estimate Risk and Expected Profit"
          tooltip={CONDO_TIPS.riskProfit}
          rateInput={
            <InlineNumberInput control={control} name="summary.riskProfitPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Income"
          total={s?.riskProfitTotal}
          ratioPercent={null}
          compact
        />
      </SectionPrimary>

      {/* ── Total Development Costs and Expenses (E53) ─────────────────── */}
      <SectionPrimary id="hyp-section-total-dev" title="Total Project Development Costs and Expenses">
        <PdcTotalRow
          label="Total Project Development Costs and Expenses"
          total={s?.totalDevCosts}
          ratioPercent={null}
        />
      </SectionPrimary>

      {/* ── Final Property Value (E54-E59) ─────────────────────────────── */}
      <SectionPrimary id="hyp-section-final" title="Total Remaining Value of All Assets in Cash">
        <FvDerivedRow
          label="Total Remaining Value of All Assets in Cash"
          tooltip={CONDO_TIPS.totalRemainingValue}
          value={s?.totalRemainingValue}
          unit="Baht"
        />

        <FvInputRow
          label="Discount Rate"
          tooltip={CONDO_TIPS.discountRate}
          rateInput={
            <InlineNumberInput control={control} name="summary.discountRate" fillSlot />
          }
          rateUnit="%"
          rateSuffix="0 = no discounting"
        />

        <FvDerivedRow label="Discount Rate Factor" tooltip={CONDO_TIPS.discountRateFactor} value={s?.discountRateFactor} />
        <FvDerivedRow
          label="Final Total Remaining Value of All Assets in Cash"
          tooltip={CONDO_TIPS.finalRemainingValue}
          value={s?.finalRemainingValue}
          unit="Baht"
        />
        <FvDerivedRow
          label="Total Asset Value (Rounded ±10,000)"
          tooltip={CONDO_TIPS.totalAssetValueRounded}
          value={s?.totalAssetValueRounded}
          unit="Baht"
          emphasize
        />
        <FvDerivedRow
          label="Value Per Sq.M (Rounded ±100)"
          tooltip={CONDO_TIPS.totalAssetValuePerSqM}
          value={s?.totalAssetValuePerSqM}
          unit="Baht/Sq.M"
          emphasize
        />
      </SectionPrimary>
    </div>
  );
}


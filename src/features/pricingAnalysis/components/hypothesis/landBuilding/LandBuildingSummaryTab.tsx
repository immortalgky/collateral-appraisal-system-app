/**
 * Summary tab for L&B hypothesis analysis.
 * Sections map to C01..C82 per FSD §2.1.3.7.
 *
 * User inputs only appear in writable fields (LandBuildingSummaryInput).
 * Computed fields are overlaid from previewSummary (read-only display).
 */
import { useFormContext, Controller, useFieldArray, useWatch } from 'react-hook-form';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { fmt } from '../../../domain/formatters';
import type { LandBuildingFormValues } from '../../../schemas/hypothesisForm';
import type { LandBuildingSummaryDto, LandBuildingModelAggregate, CostItemDto } from '../../../types/hypothesis';
import {
  COL,
  SectionPrimary,
  SubSectionLabel,
  FieldRow,
  DerivedValue,
  PercentExpression,
  PdcDerivedRow,
  PdcTotalRow,
  AddRowButton,
  UserAddedRow,
  FvDerivedRow,
  FvInputRow,
  InlineNumberInput,
} from '../_shared/summaryAtoms';
import { HypothesisResidualWaterfall } from '../../viz/HypothesisResidualWaterfall';
import { HypothesisCostDonut } from '../../viz/HypothesisCostDonut';
import { LB_TIPS } from '../_shared/hypothesisTooltips';

interface LandBuildingSummaryTabProps {
  previewSummary?: LandBuildingSummaryDto | null;
  models?: Record<string, LandBuildingModelAggregate> | null;
  /** FSD C01 — system-derived from property group land titles. Null for project-model analyses. */
  totalLandAreaFromTitles?: number | null;
  /** Server snapshot of cost items — used to read computed categoryRatio for user-added rows. */
  costItems?: CostItemDto[] | null;
}

export function LandBuildingSummaryTab({
  previewSummary: s,
  models,
  totalLandAreaFromTitles,
  costItems,
}: LandBuildingSummaryTabProps) {
  const { control } = useFormContext<LandBuildingFormValues>();
  const modelList = models ? Object.values(models) : [];

  // Field array for ad-hoc Project Dev Cost rows (kind = Other).
  // `keyName: '_rhfKey'` so RHF's synthetic key doesn't shadow our `id` form field
  // (we need the real `id` to look up server-computed CategoryRatio below).
  const { fields: otherCostFields, append: appendOther, remove: removeOther } = useFieldArray<
    LandBuildingFormValues,
    'otherCostItems',
    '_rhfKey'
  >({ control, name: 'otherCostItems', keyName: '_rhfKey' });

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
    if (ci.kind === 'Other' && (ci.category === 'ProjectDevCost' || ci.category === 'ProjectCost')) {
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

  return (
    <div className="space-y-5">
      {/* ── Visual residual story + cost composition ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7">
          <HypothesisResidualWaterfall variant="LandBuilding" summary={s} />
        </div>
        <div className="lg:col-span-5">
          <HypothesisCostDonut variant="LandBuilding" summary={s} />
        </div>
      </div>

      {/* ── Details of the Assessed Land Area ───────────────────────────── */}
      <SectionPrimary title="Details of the Assessed Land Area">
        <FieldRow label="Total Area" tooltip={LB_TIPS.totalArea}>
          <DerivedValue value={totalArea} unit="Sq.Wa" />
        </FieldRow>

        <FieldRow label="Selling Area" tooltip={LB_TIPS.sellingArea}>
          <PercentExpression
            percent={s?.sellingAreaPercent}
            ofLabel="Of the Total Area"
            highlightPercent={isSellingAreaOutOfBand(s?.sellingAreaPercent)}
          />
          <DerivedValue value={s?.sellingArea} unit="Sq.Wa" />
        </FieldRow>

        {modelList.map(m => (
          <ModelDetailRow
            key={m.modelName}
            modelName={m.modelName}
            unit={m.unitCount}
            avgArea={m.avgLandAreaSqWa}
            totalArea={m.totalLandAreaSqWa}
          />
        ))}

        <FieldRow label="Public Utility Area" tooltip={LB_TIPS.publicUtilityArea}>
          <PercentExpression
            percent={s?.publicUtilityAreaPercent}
            ofLabel="Of the Total Area"
          />
          <DerivedValue value={s?.publicUtilityArea} unit="Sq.Wa" />
        </FieldRow>

        <FieldRow label="Remark" alignTop>
          <Controller
            control={control}
            name="summary.remark"
            render={({ field }) => (
              <textarea
                {...field}
                value={field.value ?? ''}
                rows={4}
                className="w-full text-xs border border-gray-200 rounded-lg px-3 py-2 resize-y focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400"
                placeholder="Notes or assumptions about the assessed land area…"
              />
            )}
          />
        </FieldRow>
      </SectionPrimary>

      {/* ── Project Revenue Estimates ───────────────────────────────────── */}
      <SectionPrimary id="hyp-section-revenue" title="Project Revenue Estimates">
        <FieldRow label="House Model">
          <span className="text-xs text-gray-400 italic">Per house model from upload</span>
        </FieldRow>

        {modelList.map(m => (
          <ModelRevenueRow
            key={m.modelName}
            modelName={m.modelName}
            unit={m.unitCount}
            sellingPrice={m.totalSellingPrice}
          />
        ))}

        <TotalRow label="Total project revenue estimates" value={s?.totalRevenue} unit="Baht" />
      </SectionPrimary>

      {/* ── Estimate Sales Period ───────────────────────────────────────── */}
      <SectionPrimary title="Estimate Sales Period">
        <FieldRow label="Estimate Sales Period" tooltip={LB_TIPS.estSalesPeriod}>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <InlineNumberInput control={control} name="summary.estSalesPeriod" decimalPlaces={0} />
            <span className="text-[11px] text-gray-500 w-[80px]">House/Month</span>
            <span className="min-w-[80px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.totalUnits)}
            </span>
            <span className="text-[11px] text-gray-500 w-[40px]">Unit</span>
            <span className="min-w-[80px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.estimatedDurationMonths)}
            </span>
            <span className="text-[11px] text-gray-500 w-[50px]">Month</span>
          </div>
        </FieldRow>
      </SectionPrimary>

      {/* ── Project Development Cost Estimates (FSD Figure 57) ──────────── */}
      <SectionPrimary id="hyp-section-dev" title="Project Development Cost Estimates">
        <SubSectionLabel label="Construction Cost Per Unit of Building / House" />

        {modelList.map(m => (
          <ConstructionCostRow
            key={m.modelName}
            modelName={m.modelName}
            costPerUnit={m.totalBuildingValueAfterDepreciation}
            unitCount={m.unitCount}
            total={m.totalValueAfterDepreciationAllUnits}
            ratioPercent={m.devCostRatioPercent}
          />
        ))}

        <PdcDerivedRow
          label="Public Utility Construction Costs"
          tooltip={LB_TIPS.publicUtilityConstruction}
          rateInput={
            <InlineNumberInput control={control} name="summary.publicUtilityRatePerSqWa" fillSlot />
          }
          rateUnit="Baht/Sq.Wa"
          total={s?.publicUtilityCost}
          ratioPercent={s?.publicUtilityCostRatio}
        />

        <PdcDerivedRow
          label="Land Filling Cost (Remaining Amount)"
          tooltip={LB_TIPS.landFilling}
          rateInput={
            <InlineNumberInput control={control} name="summary.landFillingRatePerSqWa" fillSlot />
          }
          rateUnit="Baht/Sq.Wa"
          total={s?.landFillingCost}
          ratioPercent={s?.landFillingCostRatio}
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

        <AddRowButton
          label="Add Project Development Cost Estimates"
          onClick={handleAddProjectDevCost}
        />

        <PdcDerivedRow
          label="Contingency Allowance"
          tooltip={LB_TIPS.contingencyDev}
          rateInput={
            <InlineNumberInput control={control} name="summary.contingencyPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Project Development Costs"
          total={s?.contingencyAmount}
          ratioPercent={s?.contingencyRatio}
        />

        <PdcTotalRow
          label="Total Project Development Cost Estimates"
          total={s?.totalProjectDevCost}
          ratioPercent={s?.totalDevCostRatio}
        />
      </SectionPrimary>

      {/* ── Estimate Construction Period (FSD Figure 58) ────────────────── */}
      <SectionPrimary title="Estimate Construction Period">
        <FieldRow label="Estimate Construction Period" tooltip={LB_TIPS.estConstructionPeriod}>
          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <InlineNumberInput control={control} name="summary.estConstructionPeriod" decimalPlaces={0} />
            <span className="text-[11px] text-gray-500 w-[80px]">House/Month</span>
            <span className="min-w-[80px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.totalUnitsForConstruction)}
            </span>
            <span className="text-[11px] text-gray-500 w-[40px]">Unit</span>
            <span className="min-w-[80px] text-right tabular-nums text-xs font-medium text-gray-800">
              {fmt(s?.estimatedConstructionDurationMonths)}
            </span>
            <span className="text-[11px] text-gray-500 w-[50px]">Month</span>
          </div>
        </FieldRow>
      </SectionPrimary>

      {/* ── Project Cost Estimates (FSD Figure 59) ──────────────────────── */}
      <SectionPrimary id="hyp-section-project" title="Project Cost Estimates">
        <PdcDerivedRow
          label="Allocation Permit Fee"
          tooltip={LB_TIPS.allocationPermitFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.allocationPermitFee" fillSlot />
          }
          rateUnit="Baht"
          total={s?.allocationPermitFee}
          ratioPercent={s?.allocationPermitFeeRatio}
        />

        <PdcDerivedRow
          label="Land Title Deed Division Fee"
          tooltip={LB_TIPS.landTitleFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.landTitleFeePerPlot" fillSlot />
          }
          rateUnit="Baht/Plot"
          qtyValue={s?.totalPlots}
          qtyUnit="Unit"
          total={s?.landTitleFeeTotal}
          ratioPercent={s?.landTitleFeeRatio}
        />

        <PdcDerivedRow
          label="Professional Service Fees and Construction Supervision"
          tooltip={LB_TIPS.professionalFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.professionalFeePerMonth" fillSlot />
          }
          rateUnit="Baht/Month"
          qtyValue={s?.professionalFeeMonths}
          qtyUnit="Month"
          total={s?.professionalFeeTotal}
          ratioPercent={s?.professionalFeeRatio}
        />

        <PdcDerivedRow
          label="Project Administration and Management Costs"
          tooltip={LB_TIPS.adminCost}
          rateInput={
            <InlineNumberInput control={control} name="summary.adminCostPerMonth" fillSlot />
          }
          rateUnit="Baht/Month"
          qtyValue={s?.adminCostMonths}
          qtyUnit="Month"
          total={s?.adminCostTotal}
          ratioPercent={s?.adminCostRatio}
        />

        <PdcDerivedRow
          label="Selling and Advertising Expenses"
          tooltip={LB_TIPS.sellingAdv}
          rateInput={
            <InlineNumberInput control={control} name="summary.sellingAdvPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Total Revenue"
          total={s?.sellingAdvTotal}
          ratioPercent={s?.sellingAdvRatio}
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

        <AddRowButton
          label="Add Project Cost Estimates"
          onClick={handleAddProjectCost}
        />

        <PdcDerivedRow
          label="Contingency Allowance"
          tooltip={LB_TIPS.contingencyProject}
          rateInput={
            <InlineNumberInput control={control} name="summary.projectContingencyPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of the Project Cost Expenses"
          total={s?.projectContingencyAmount}
          ratioPercent={s?.projectContingencyRatio}
        />

        <PdcTotalRow
          label="Total Project Cost Estimates"
          total={s?.totalProjectCost}
          ratioPercent={s?.totalProjectCostRatio}
        />
      </SectionPrimary>

      {/* ── Government Taxes and Fees (FSD Figure 60) ───────────────────── */}
      <SectionPrimary id="hyp-section-tax" title="Government Taxes and Fees">
        <PdcDerivedRow
          label="Transfer Fee"
          tooltip={LB_TIPS.transferFee}
          rateInput={
            <InlineNumberInput control={control} name="summary.transferFeePercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Total Revenue"
          total={s?.transferFeeAmount}
          ratioPercent={s?.transferFeeRatio}
        />

        <PdcDerivedRow
          label="Specific Business Tax"
          tooltip={LB_TIPS.specificBizTax}
          rateInput={
            <InlineNumberInput control={control} name="summary.specificBizTaxPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Total Revenue"
          total={s?.specificBizTaxAmount}
          ratioPercent={s?.specificBizTaxRatio}
        />

        <PdcTotalRow
          label="Total Government Taxes and Fees"
          total={s?.totalGovTax}
          ratioPercent={s?.totalGovTaxRatio}
        />
      </SectionPrimary>

      {/* ── Risk Premium (FSD Figure 61) ────────────────────────────────── */}
      <SectionPrimary id="hyp-section-risk" title="Risk Premium">
        <PdcDerivedRow
          label="Risk Premium"
          tooltip={LB_TIPS.riskPremium}
          rateInput={
            <InlineNumberInput control={control} name="summary.riskPremiumPercent" fillSlot />
          }
          rateUnit="%"
          rateSuffix="Of Total Revenue"
          total={s?.riskPremiumAmount}
          ratioPercent={null}
        />
      </SectionPrimary>

      {/* ── Total Development Costs and Expenses (FSD Figure 62) ────────── */}
      <SectionPrimary title="Total Development Costs and Expenses">
        <PdcTotalRow
          label="Total Development Costs and Expenses"
          total={s?.totalDevCostsAndExpenses}
          ratioPercent={null}
        />
      </SectionPrimary>

      {/* ── Final Property Value (FSD Figure 63) ────────────────────────── */}
      <SectionPrimary id="hyp-section-final" title="Final Property Value">
        <FvDerivedRow label="Current Property Value" tooltip={LB_TIPS.currentPropertyValue} value={s?.currentPropertyValue} unit="Baht" />

        <FvInputRow
          label="Discount Rate"
          tooltip={LB_TIPS.discountRate}
          rateInput={
            <InlineNumberInput control={control} name="summary.discountRate" fillSlot />
          }
          rateUnit="%"
          rateSuffix="0 = no discounting"
        />

        <FvDerivedRow label="Discount Rate Factor" tooltip={LB_TIPS.discountRateFactor} value={s?.discountRateFactor} />
        <FvDerivedRow label="Final Property Value" tooltip={LB_TIPS.finalPropertyValue} value={s?.finalPropertyValue} unit="Baht" />
        <FvDerivedRow
          label="Total Asset Value (Rounded ±10,000)"
          tooltip={LB_TIPS.totalAssetValueRounded}
          value={s?.totalAssetValueRounded}
          unit="Baht"
          emphasize
        />
        <FvDerivedRow
          label="Value Per Sq.Wa (Rounded ±100)"
          tooltip={LB_TIPS.totalAssetValuePerSqWa}
          value={s?.totalAssetValuePerSqWa}
          unit="Baht/Sq.Wa"
          emphasize
        />
      </SectionPrimary>

    </div>
  );
}

// Selling area % is expected to land in [50, 70]. Outside that band → highlight red.
function isSellingAreaOutOfBand(percent?: number | null): boolean {
  if (percent === null || percent === undefined) return false;
  return percent < 50 || percent > 70;
}

function ModelRevenueRow({
  modelName,
  unit,
  sellingPrice,
}: {
  modelName: string;
  unit?: number | null;
  sellingPrice?: number | null;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-gray-50/60 items-center">
      <div className="col-span-2" />
      <div className="col-span-10 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-700 min-w-[220px]">- {modelName}</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="min-w-[60px] text-right tabular-nums text-xs font-medium text-gray-800">
            {fmt(unit)}
          </span>
          <span className="text-[11px] text-gray-500 w-[40px]">Unit</span>
          <span className="min-w-[120px] text-right tabular-nums text-xs font-medium text-gray-800">
            {fmt(sellingPrice)}
          </span>
          <span className="text-[11px] text-gray-500 w-[68px]">Baht</span>
        </div>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  unit,
}: {
  label: string;
  value?: number | null;
  unit?: string;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-3 bg-gray-100/80 border-t border-gray-200 items-center">
      <div className="col-span-6 text-xs font-semibold text-gray-800">{label}</div>
      <div className="col-span-6 flex items-center gap-2 justify-end">
        <span className="min-w-[140px] text-right tabular-nums text-sm font-bold text-gray-900">
          {fmt(value)}
        </span>
        {unit && <span className="text-[11px] text-gray-500 w-[68px]">{unit}</span>}
      </div>
    </div>
  );
}

function ModelDetailRow({
  modelName,
  unit,
  avgArea,
  totalArea,
}: {
  modelName: string;
  unit?: number | null;
  avgArea?: number | null;
  totalArea?: number | null;
}) {
  return (
    <div className="grid grid-cols-12 gap-3 px-5 py-2.5 bg-gray-50/60 items-center">
      <div className="col-span-2" />
      <div className="col-span-10 flex items-center gap-3 flex-wrap">
        <span className="text-xs font-medium text-gray-700 min-w-[220px]">- {modelName}</span>
        <div className="flex items-center gap-2 ml-auto">
          <span className="min-w-[60px] text-right tabular-nums text-xs font-medium text-gray-800">
            {fmt(unit)}
          </span>
          <span className="text-[11px] text-gray-500 w-[40px]">Unit</span>
          <span className="min-w-[80px] text-right tabular-nums text-xs font-medium text-gray-800">
            {fmt(avgArea)}
          </span>
          <span className="text-[11px] text-gray-500 w-[68px]">Avg Sq.Wa</span>
          <span className="min-w-[100px] text-right tabular-nums text-xs font-semibold text-gray-800">
            {fmt(totalArea)}
          </span>
          <span className="text-[11px] text-gray-500 w-[68px]">Sq.Wa</span>
        </div>
      </div>
    </div>
  );
}


function ConstructionCostRow({
  modelName,
  costPerUnit,
  unitCount,
  total,
  ratioPercent,
}: {
  modelName: string;
  costPerUnit?: number | null;
  unitCount?: number | null;
  total?: number | null;
  ratioPercent?: number | null;
}) {
  return (
    <div className="flex items-center px-5 py-2.5 bg-gray-50/60 gap-2">
      <div className="flex-1 text-xs font-medium text-gray-700 pl-4 min-w-0">- {modelName}</div>
      <span className={`${COL.rate} text-right tabular-nums text-xs font-medium text-primary shrink-0`}>
        {fmt(costPerUnit)}
      </span>
      <span className={`${COL.rateUnit} text-[11px] text-gray-500 shrink-0`}>Baht/Unit</span>
      <span className={`${COL.suffix} shrink-0`} />
      <div className={`${COL.mid} flex items-center justify-end gap-2 shrink-0`}>
        <span className="text-right tabular-nums text-xs font-medium text-gray-800">
          {fmt(unitCount)}
        </span>
        <span className="text-[11px] text-gray-500 w-[44px]">Unit</span>
      </div>
      <span className={`${COL.total} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
        {fmt(total)}
      </span>
      <span className={`${COL.totalUnit} text-[11px] text-gray-500 shrink-0`}>Baht</span>
      <span className={`${COL.ratio} text-right tabular-nums text-xs font-medium text-gray-800 shrink-0`}>
        {ratioPercent !== null && ratioPercent !== undefined ? `${Number(ratioPercent).toFixed(2)} %` : '-'}
      </span>
      <span className={`${COL.remove} shrink-0`} />
    </div>
  );
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
    <UserAddedRow
      amountValue={amt}
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
              placeholder="Item description…"
              className="w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary/40 placeholder:text-gray-400"
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
              onChange={(e) => field.onChange(e.target.value)}
              onBlur={field.onBlur}
              decimalPlaces={2}
              fullWidth
              className="!text-xs"
            />
          )}
        />
      }
    />
  );
}



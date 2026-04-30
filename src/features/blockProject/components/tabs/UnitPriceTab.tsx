import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import ActionBar from '@/shared/components/ActionBar';
import Checkbox from '@/shared/components/inputs/Checkbox';
import type { ApiError } from '@/shared/types/api';

import {
  useGetProjectPricingAssumptions,
  useSaveProjectPricingAssumptions,
} from '../../api/projectPricingAssumption';
import {
  useGetProjectUnitPrices,
  useCalculateProjectUnitPrices,
  useSaveProjectUnitPrices,
} from '../../api/projectUnitPrice';
import type {
  ProjectModelAssumption,
  ProjectUnitPrice,
  ProjectUnitPriceFlagData,
  ProjectType,
} from '../../types';
import {
  projectPricingAssumptionForm,
  condoPricingAssumptionFormDefaults,
  lbPricingAssumptionFormDefaults,
  type CondoPricingAssumptionFormType,
  type LbPricingAssumptionFormType,
} from '../../schemas/form';
import PricingAssumptionForm from '../../forms/PricingAssumptionForm';
import {
  CONDO_FIRE_INSURANCE_CONDITION_LABEL_BY_VALUE,
  LB_FIRE_INSURANCE_LABEL_BY_VALUE,
} from '../../data/options';
import { recomputeUnitPrice, type AssumptionInputs } from '../../utils/recomputeUnitPrice';

type AppError = AxiosError & { apiError?: ApiError };

// ── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}>
        <Icon name={icon} style="solid" className="w-5 h-5" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{label}</h2>
    </div>
  );
}

// ── Model Assumptions Table ───────────────────────────────────────────────────

interface ModelAssumptionsTableProps {
  assumptions: ProjectModelAssumption[];
  projectType: ProjectType;
}

function ModelAssumptionsTable({ assumptions, projectType }: ModelAssumptionsTableProps) {
  if (assumptions.length === 0) {
    return (
      <p className="text-xs text-gray-400 text-center py-6">
        No model assumptions — add models first
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap min-w-[160px]">
              Model
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium w-full min-w-[200px]">
              Description
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Usable Area (sq.m.)
            </th>
            {projectType === 'LandAndBuilding' && (
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                Std Land Price (Baht/sq.wa)
              </th>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Standard Price (Baht/sq.m.)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Coverage Amount (Baht/Sq.m)
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Fire Insurance Condition
            </th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map(m => (
            <tr key={m.projectModelId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-800">{m.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-600">{m.modelDescription ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-800 whitespace-nowrap">
                {m.usableAreaFrom != null || m.usableAreaTo != null
                  ? `${m.usableAreaFrom?.toLocaleString() ?? '-'} - ${m.usableAreaTo?.toLocaleString() ?? '-'}`
                  : '-'}
              </td>
              {projectType === 'LandAndBuilding' && (
                <td className="py-2 px-3 text-right text-gray-800">
                  {m.standardLandPrice?.toLocaleString() ?? '-'}
                </td>
              )}
              <td className="py-2 px-3 text-right text-gray-800">
                {m.finalAppraisedValue != null
                  ? m.finalAppraisedValue.toLocaleString()
                  : <span className="text-gray-400 italic">— pending analysis —</span>}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.coverageAmount?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-600">
                {m.fireInsuranceCondition
                  ? (projectType === 'Condo'
                      ? CONDO_FIRE_INSURANCE_CONDITION_LABEL_BY_VALUE[m.fireInsuranceCondition]
                      : LB_FIRE_INSURANCE_LABEL_BY_VALUE[m.fireInsuranceCondition]) ??
                    m.fireInsuranceCondition
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Unit Price Result Table ───────────────────────────────────────────────────
// NOTE: UnitPriceResultTable is intentionally OUTSIDE <FormProvider>.
// Flag checkboxes (Condo) directly call saveUnitFlags + calculatePrices and do
// not participate in RHF state. LB flags are read-only check icons.

function fmt(value?: number | null) {
  return (
    value?.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) ?? '-'
  );
}

// Condo: editable FlagCell (checkbox + amount column)
function FlagCell({
  checked,
  amount,
  onChange,
  disabled,
}: {
  checked: boolean;
  amount?: number | null;
  onChange: (next: boolean) => void;
  disabled: boolean;
}) {
  return (
    <>
      <td className="py-2 px-3 text-center">
        <Checkbox checked={checked} onChange={onChange} disabled={disabled} />
      </td>
      <td className="py-2 px-3 text-right text-gray-800">{checked ? fmt(amount) : '-'}</td>
    </>
  );
}

// LB: read-only check icon cell
function CheckIconCell({ checked }: { checked: boolean }) {
  return (
    <td className="py-2 px-3 text-center">
      {checked ? (
        <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
      ) : (
        <span className="text-gray-300">-</span>
      )}
    </td>
  );
}

type CondoFlag = 'isCorner' | 'isEdge' | 'isPoolView' | 'isSouth' | 'isOther';

interface UnitPriceResultTableProps {
  unitPrices: ProjectUnitPrice[];
  projectType: ProjectType;
  isLoading: boolean;
  pricingAssumption: {
    cornerAdjustment?: number | null;
    edgeAdjustment?: number | null;
    poolViewAdjustment?: number | null;
    southAdjustment?: number | null;
    otherAdjustment?: number | null;
  } | null | undefined;
  onToggleFlag: (unitId: string, flag: CondoFlag, value: boolean) => void;
  isDisabled: boolean;
}

function UnitPriceResultTable({
  unitPrices,
  projectType,
  isLoading,
  pricingAssumption,
  onToggleFlag,
  isDisabled,
}: UnitPriceResultTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (unitPrices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-gray-400">
        <Icon name="calculator" className="text-3xl mb-2" />
        <p className="text-sm">No units uploaded yet — upload a unit list first</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Seq No</th>
            {projectType === 'Condo' && (
              <>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium">Floor</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Tower Name</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Reg Number</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Room No.</th>
              </>
            )}
            {projectType === 'LandAndBuilding' && (
              <>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Plot No</th>
                <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">House No</th>
              </>
            )}
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Model</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Usable Area</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Selling Price</th>
            {/* Common flags */}
            {projectType === 'Condo' ? (
              <>
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Corner</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium" />
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Edge</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium" />
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Pool View</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium" />
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">South</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium" />
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Other</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium" />
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Adjust Price / Location</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Standard Price</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Price Increment/Floor</th>
              </>
            ) : (
              <>
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Corner</th>
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Edge</th>
                <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Near Garden</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Land +/- (Baht)</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Location Adj.</th>
                <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Standard Price</th>
              </>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Appraisal Value</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Rounded Value</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Force Sale Price</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Coverage Amount</th>
          </tr>
        </thead>
        <tbody>
          {unitPrices.map(up => (
            <tr key={up.projectUnitId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-center text-gray-700">{up.sequenceNumber}</td>
              {projectType === 'Condo' && (
                <>
                  <td className="py-2 px-3 text-right text-gray-700">{up.floor ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.towerName ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.condoRegistrationNumber ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.roomNumber ?? '-'}</td>
                </>
              )}
              {projectType === 'LandAndBuilding' && (
                <>
                  <td className="py-2 px-3 text-gray-700">{up.plotNumber ?? '-'}</td>
                  <td className="py-2 px-3 text-gray-700">{up.houseNumber ?? '-'}</td>
                </>
              )}
              <td className="py-2 px-3 text-gray-700">{up.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-700">{fmt(up.usableArea)}</td>
              <td className="py-2 px-3 text-right text-gray-700">{fmt(up.sellingPrice)}</td>
              {projectType === 'Condo' ? (
                <>
                  <FlagCell
                    checked={up.isCorner}
                    amount={pricingAssumption?.cornerAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isCorner', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isEdge}
                    amount={pricingAssumption?.edgeAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isEdge', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isPoolView}
                    amount={pricingAssumption?.poolViewAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isPoolView', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isSouth}
                    amount={pricingAssumption?.southAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isSouth', v)}
                    disabled={isDisabled}
                  />
                  <FlagCell
                    checked={up.isOther}
                    amount={pricingAssumption?.otherAdjustment}
                    onChange={v => onToggleFlag(up.projectUnitId, 'isOther', v)}
                    disabled={isDisabled}
                  />
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.adjustPriceLocation)}</td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.standardPrice)}</td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.priceIncrementPerFloor)}</td>
                </>
              ) : (
                <>
                  <CheckIconCell checked={up.isCorner} />
                  <CheckIconCell checked={up.isEdge} />
                  <CheckIconCell checked={up.isNearGarden} />
                  <td className="py-2 px-3 text-right text-gray-800">
                    {up.landIncreaseDecreaseAmount?.toLocaleString() ?? '-'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.adjustPriceLocation)}</td>
                  <td className="py-2 px-3 text-right text-gray-800">{fmt(up.standardPrice)}</td>
                </>
              )}
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {fmt(up.totalAppraisalValue)}
              </td>
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {fmt(up.totalAppraisalValueRounded)}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {fmt(up.forceSellingPrice)}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {fmt(
                  up.coverageAmount != null && up.usableArea != null
                    ? up.coverageAmount * up.usableArea
                    : null,
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

interface UnitPriceTabProps {
  projectType: ProjectType;
}

export default function UnitPriceTab({ projectType }: UnitPriceTabProps) {
  const appraisalId = useAppraisalId();
  const isReadOnly = usePageReadOnly();

  const schema = projectPricingAssumptionForm(projectType);
  const defaults =
    projectType === 'Condo' ? condoPricingAssumptionFormDefaults : lbPricingAssumptionFormDefaults;

  const { data: pricingAssumption, isLoading: assumptionLoading } =
    useGetProjectPricingAssumptions(appraisalId ?? '');

  const { data: unitPricesData, isLoading: pricesLoading } = useGetProjectUnitPrices(
    appraisalId ?? '',
  );

  // Local mirror of unit prices: lets the user toggle flags and see an immediate
  // client-side recompute (preview). The backend remains the source of truth on
  // Save / Save Draft — the query is invalidated after save and this state is
  // refilled from the fresh server data via the useEffect below.
  const [localUnitPrices, setLocalUnitPrices] = useState<ProjectUnitPrice[]>([]);
  const [flagsDirty, setFlagsDirty] = useState(false);
  useEffect(() => {
    setLocalUnitPrices(unitPricesData ?? []);
    setFlagsDirty(false);
  }, [unitPricesData]);

  const { mutateAsync: saveAssumptionAsync, isPending: isSaving } =
    useSaveProjectPricingAssumptions();
  const { mutateAsync: calculatePricesAsync, isPending: isCalculating } =
    useCalculateProjectUnitPrices();
  const { mutateAsync: saveUnitFlagsAsync, isPending: isSavingFlags } =
    useSaveProjectUnitPrices();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    handleSubmit,
    reset,
    formState: { isDirty },
  } = methods;

  useEffect(() => {
    if (pricingAssumption) {
      if (projectType === 'Condo') {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          poolViewAdjustment: pricingAssumption.poolViewAdjustment ?? null,
          southAdjustment: pricingAssumption.southAdjustment ?? null,
          floorIncrementEveryXFloor: pricingAssumption.floorIncrementEveryXFloor ?? null,
          floorIncrementAmount: pricingAssumption.floorIncrementAmount ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies CondoPricingAssumptionFormType);
      } else {
        reset({
          locationMethod: pricingAssumption.locationMethod ?? 'AdjustPriceSqm',
          cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
          edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
          otherAdjustment: pricingAssumption.otherAdjustment ?? null,
          nearGardenAdjustment: pricingAssumption.nearGardenAdjustment ?? null,
          landIncreaseDecreaseRate: pricingAssumption.landIncreaseDecreaseRate ?? null,
          forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
        } satisfies LbPricingAssumptionFormType);
      }
    }
  }, [pricingAssumption, reset, projectType]);

  // Live form values for the client-side preview recompute (uses unsaved edits).
  // Cast: react-hook-form's generic is `any` here since the schema differs per project type.
  const watchedAssumption = useWatch({ control: methods.control }) as AssumptionInputs;

  // Persist: save flags + assumption together. When `withCalculate` is true
  // the backend recomputes and becomes the source of truth; the unit-prices
  // query is invalidated by the mutation hooks, refilling local state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const persistAssumption = async (data: any, withCalculate: boolean) => {
    if (!appraisalId) return;
    const flags: ProjectUnitPriceFlagData[] = localUnitPrices.map(up => ({
      projectUnitId: up.projectUnitId,
      isCorner: up.isCorner,
      isEdge: up.isEdge,
      isPoolView: up.isPoolView,
      isSouth: up.isSouth,
      isOther: up.isOther,
      isNearGarden: up.isNearGarden,
    }));

    try {
      if (flags.length > 0) {
        await saveUnitFlagsAsync({ appraisalId, flags });
      }
      await saveAssumptionAsync({ appraisalId, data });
      reset(data);

      if (withCalculate) {
        await calculatePricesAsync({ appraisalId });
        toast.success('Pricing assumptions saved and unit prices recalculated');
      } else {
        toast.success('Pricing assumptions saved as draft');
      }
    } catch (err) {
      const error = err as AppError;
      toast.error(error?.apiError?.detail ?? 'Failed to save assumptions');
    }
  };

  // Toggle a flag client-side only — just flips the flag on the local row.
  // The displayed totals are derived below via `displayedUnitPrices`, so any
  // change to the assumption form OR a flag toggle re-runs the preview.
  // No API call here — the server recomputes on Save / Save Draft.
  const handleToggleFlag = (unitId: string, flag: CondoFlag, value: boolean) => {
    setLocalUnitPrices(prev =>
      prev.map(up => (up.projectUnitId === unitId ? { ...up, [flag]: value } : up)),
    );
    setFlagsDirty(true);
  };

  // Derived display rows: re-run the preview calc whenever the local flag set
  // OR the watched assumption form values change.
  const displayedUnitPrices = useMemo(
    () => localUnitPrices.map(up => recomputeUnitPrice(up, watchedAssumption, projectType)),
    [localUnitPrices, watchedAssumption, projectType],
  );

  const modelAssumptions = pricingAssumption?.modelAssumptions ?? [];
  const isBusy = isSaving || isSavingFlags || isCalculating;

  return (
    <FormProvider methods={methods} schema={schema}>
      <form
        onSubmit={handleSubmit(data => persistAssumption(data, true))}
        className="flex flex-col h-full min-h-0"
      >
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          <div className="flex flex-col gap-6">
            {/* Model Assumptions (read-only display) */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <SectionHeader
                icon="layer-group"
                label="Model Assumptions"
                color="bg-blue-50 text-blue-600"
              />
              <div className="h-px bg-gray-100 mb-4" />
              {assumptionLoading ? (
                <div className="space-y-2">
                  {[1, 2].map(i => (
                    <div key={i} className="h-8 bg-gray-100 rounded animate-pulse" />
                  ))}
                </div>
              ) : (
                <ModelAssumptionsTable assumptions={modelAssumptions} projectType={projectType} />
              )}
            </div>

            {/* Pricing Assumption form */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <PricingAssumptionForm projectType={projectType} />
            </div>

            {/* Calculated Unit Prices */}
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeader
                  icon="tags"
                  label="Calculated Unit Prices"
                  color="bg-violet-50 text-violet-600"
                />
                {displayedUnitPrices.length > 0 && (
                  <span className="text-xs text-gray-500 self-start mt-0.5">
                    {displayedUnitPrices.length.toLocaleString()} units
                  </span>
                )}
              </div>
              <div className="h-px bg-gray-100 mb-4" />
              <UnitPriceResultTable
                unitPrices={displayedUnitPrices}
                projectType={projectType}
                isLoading={pricesLoading}
                pricingAssumption={pricingAssumption}
                onToggleFlag={handleToggleFlag}
                isDisabled={isReadOnly || isBusy}
              />
            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <ActionBar>
          <ActionBar.Left>
            {!isReadOnly && <ActionBar.UnsavedIndicator show={isDirty || flagsDirty} />}
          </ActionBar.Left>
          {!isReadOnly && (
            <ActionBar.Right>
              <Button
                variant="ghost"
                type="button"
                onClick={() => handleSubmit(data => persistAssumption(data, false))()}
                isLoading={isSaving && !isCalculating}
                disabled={isBusy}
              >
                <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                Save Draft
              </Button>
              <Button type="submit" isLoading={isBusy} disabled={isBusy}>
                <Icon name="calculator" style="solid" className="size-4 mr-2" />
                Save
              </Button>
            </ActionBar.Right>
          )}
        </ActionBar>
      </form>
    </FormProvider>
  );
}

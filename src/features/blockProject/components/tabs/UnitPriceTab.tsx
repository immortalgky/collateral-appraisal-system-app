import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
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
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Model</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Description</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Usable Area From (sq.m.)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Usable Area To (sq.m.)
            </th>
            {projectType === 'LandAndBuilding' && (
              <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
                Std Land Price (Baht/sq.wa)
              </th>
            )}
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              {projectType === 'Condo' ? 'Standard Price (Baht/sq.m.)' : 'Std Price (Baht/sq.m.)'}
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Coverage (Baht)
            </th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Fire Insurance
            </th>
          </tr>
        </thead>
        <tbody>
          {assumptions.map(m => (
            <tr key={m.projectModelId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-800">{m.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-600">{m.modelDescription ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaFrom?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaTo?.toLocaleString() ?? '-'}
              </td>
              {projectType === 'LandAndBuilding' && (
                <td className="py-2 px-3 text-right text-gray-800">
                  {m.standardLandPrice?.toLocaleString() ?? '-'}
                </td>
              )}
              <td className="py-2 px-3 text-right text-gray-800">
                {m.standardPrice?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.coverageAmount?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-gray-600">{m.fireInsuranceCondition ?? '-'}</td>
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
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Sq No.</th>
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
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {unitPrices.map(up => (
            <tr key={up.projectUnitId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-right text-gray-700">{up.sequenceNumber}</td>
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
              <td className="py-2 px-3 text-right text-amber-700 font-medium">
                {fmt(up.forceSellingPrice)}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">{fmt(up.coverageAmount)}</td>
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
  const unitPrices = unitPricesData ?? [];

  const { mutate: saveAssumption, isPending: isSaving } = useSaveProjectPricingAssumptions();
  const { mutate: calculatePrices, isPending: isCalculating } = useCalculateProjectUnitPrices();
  const { mutateAsync: saveUnitFlags, isPending: isSavingFlags } = useSaveProjectUnitPrices();

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
          locationMethod: pricingAssumption.locationMethod ?? null,
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
          locationMethod: pricingAssumption.locationMethod ?? null,
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSave = (data: any) => {
    if (!appraisalId) return;
    saveAssumption(
      { appraisalId, data },
      {
        onSuccess: () => {
          toast.success('Pricing assumptions saved');
          reset(data);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Failed to save assumptions');
        },
      },
    );
  };

  const handleCalculate = () => {
    if (!appraisalId) return;
    calculatePrices(
      { appraisalId },
      {
        onSuccess: () => toast.success('Unit prices calculated successfully'),
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Calculation failed');
        },
      },
    );
  };

  // Toggle a flag: save the updated flag set then re-run Calculate so all
  // downstream values (location adj, total, force sell, coverage) refresh.
  const handleToggleFlag = async (unitId: string, flag: CondoFlag, value: boolean) => {
    if (!appraisalId) return;
    const flags: ProjectUnitPriceFlagData[] = unitPrices.map(up => ({
      projectUnitId: up.projectUnitId,
      isCorner: up.projectUnitId === unitId && flag === 'isCorner' ? value : up.isCorner,
      isEdge: up.projectUnitId === unitId && flag === 'isEdge' ? value : up.isEdge,
      isPoolView: up.projectUnitId === unitId && flag === 'isPoolView' ? value : up.isPoolView,
      isSouth: up.projectUnitId === unitId && flag === 'isSouth' ? value : up.isSouth,
      isOther: up.projectUnitId === unitId && flag === 'isOther' ? value : up.isOther,
      isNearGarden: up.isNearGarden,
    }));
    try {
      await saveUnitFlags({ appraisalId, flags });
      calculatePrices({ appraisalId });
    } catch (err) {
      const error = err as AppError;
      toast.error(error?.apiError?.detail ?? 'Failed to save flag');
    }
  };

  const modelAssumptions = pricingAssumption?.modelAssumptions ?? [];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      {/* Model Assumptions (read-only display — outside FormProvider) */}
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

      {/* Pricing Assumption form — wrapped in FormProvider */}
      <FormProvider methods={methods} schema={schema}>
        <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <PricingAssumptionForm projectType={projectType} />
          </div>

          {/* Actions */}
          {!isReadOnly && (
            <div className="flex items-center justify-between py-2">
              {isDirty && (
                <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Unsaved assumption changes
                </span>
              )}
              <div className="flex items-center gap-3 ml-auto">
                <Button
                  type="submit"
                  variant="outline"
                  isLoading={isSaving}
                  disabled={isSaving || isCalculating}
                >
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save Assumptions
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={handleCalculate}
                  isLoading={isCalculating}
                  disabled={isSaving || isCalculating}
                >
                  <Icon name="calculator" style="solid" className="size-4 mr-2" />
                  Calculate
                </Button>
              </div>
            </div>
          )}
        </form>
      </FormProvider>

      {/* Calculated Unit Prices — OUTSIDE FormProvider (display + side-effect only) */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            icon="tags"
            label="Calculated Unit Prices"
            color="bg-violet-50 text-violet-600"
          />
          {unitPrices.length > 0 && (
            <span className="text-xs text-gray-500 self-start mt-0.5">
              {unitPrices.length.toLocaleString()} units
            </span>
          )}
        </div>
        <div className="h-px bg-gray-100 mb-4" />
        <UnitPriceResultTable
          unitPrices={unitPrices}
          projectType={projectType}
          isLoading={pricesLoading}
          pricingAssumption={pricingAssumption}
          onToggleFlag={handleToggleFlag}
          isDisabled={isReadOnly || isSavingFlags || isCalculating}
        />
      </div>
    </div>
  );
}

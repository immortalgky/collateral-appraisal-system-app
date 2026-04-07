import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };
import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import {
  useGetVillagePricingAssumption,
  useSaveVillagePricingAssumption,
  useCalculateVillageUnitPrices,
  useGetVillageUnitPrices,
} from '../../api/villageUnitPrice';
import type { VillageModelAssumption, VillageUnitPrice } from '../../types';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import NumberInput from '@shared/components/inputs/NumberInput';
import Dropdown from '@shared/components/inputs/Dropdown';
import { LOCATION_METHOD_OPTIONS } from '../../data/options';

// ==================== Schema ====================

const pricingAssumptionSchema = z.object({
  locationMethod: z.string().optional().nullable(),
  cornerAdjustment: z.number().optional().nullable(),
  edgeAdjustment: z.number().optional().nullable(),
  nearGardenAdjustment: z.number().optional().nullable(),
  otherAdjustment: z.number().optional().nullable(),
  landIncreaseDecreaseRate: z.number().optional().nullable(),
  forceSalePercentage: z.number().min(0).max(100).optional().nullable(),
});

type PricingAssumptionFormValues = z.infer<typeof pricingAssumptionSchema>;

// ==================== Sub-components ====================

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

// ── Model Assumptions Table ──────────────────────────────────────────────────

interface ModelAssumptionsTableProps {
  assumptions: VillageModelAssumption[];
}

function ModelAssumptionsTable({ assumptions }: ModelAssumptionsTableProps) {
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
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Std Land Price (Baht/sq.wa)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Std Price (Baht/sq.m.)
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
            <tr key={m.villageModelId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-800">{m.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-600">{m.modelDescription ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaFrom?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaTo?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.standardLandPrice?.toLocaleString() ?? '-'}
              </td>
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

// ── Unit Price Result Table ──────────────────────────────────────────────────

interface UnitPriceResultTableProps {
  unitPrices: VillageUnitPrice[];
  isLoading: boolean;
}

function UnitPriceResultTable({ unitPrices, isLoading }: UnitPriceResultTableProps) {
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
        <p className="text-sm">No calculated prices yet — configure assumptions and click Calculate</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Sq No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Plot No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">House No</th>
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Model</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Corner</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Edge</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">Near Garden</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Land +/- (Baht)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Location Adj.
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Standard Price
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Appraisal Value
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Rounded Value
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Force Sale Price
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Coverage
            </th>
          </tr>
        </thead>
        <tbody>
          {unitPrices.map(up => (
            <tr key={up.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 text-gray-600">{up.sequenceNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{up.plotNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{up.houseNumber ?? '-'}</td>
              <td className="py-2 px-3 text-gray-800">{up.modelName ?? '-'}</td>
              <td className="py-2 px-3 text-center">
                {up.isCorner ? (
                  <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-2 px-3 text-center">
                {up.isEdge ? (
                  <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-2 px-3 text-center">
                {up.isNearGarden ? (
                  <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.landIncreaseDecreaseAmount?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.adjustPriceLocation?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.standardPrice?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {up.totalAppraisalValue?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right font-medium text-gray-900">
                {up.totalAppraisalValueRounded?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-amber-700 font-medium">
                {up.forceSellingPrice?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.coverageAmount?.toLocaleString() ?? '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ==================== Main Component ====================

export default function UnitPriceTab() {
  const appraisalId = useAppraisalId();

  const {
    data: pricingAssumption,
    isLoading: assumptionLoading,
  } = useGetVillagePricingAssumption(appraisalId ?? '');

  const { data: unitPricesData, isLoading: pricesLoading } = useGetVillageUnitPrices(
    appraisalId ?? '',
  );

  const { mutate: saveAssumption, isPending: isSaving } = useSaveVillagePricingAssumption();
  const { mutate: calculatePrices, isPending: isCalculating } = useCalculateVillageUnitPrices();

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PricingAssumptionFormValues>({
    resolver: zodResolver(pricingAssumptionSchema),
  });

  const locationMethod = watch('locationMethod');
  const cornerAdjustment = watch('cornerAdjustment');
  const edgeAdjustment = watch('edgeAdjustment');
  const nearGardenAdjustment = watch('nearGardenAdjustment');
  const otherAdjustment = watch('otherAdjustment');
  const landIncreaseDecreaseRate = watch('landIncreaseDecreaseRate');
  const forceSalePercentage = watch('forceSalePercentage');

  const isPercentageMethod = locationMethod === 'AdjustPricePercentage';
  const adjustmentLabel = isPercentageMethod ? '%' : 'Baht/sq.m.';

  useEffect(() => {
    if (pricingAssumption) {
      reset({
        locationMethod: pricingAssumption.locationMethod ?? null,
        cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
        edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
        nearGardenAdjustment: pricingAssumption.nearGardenAdjustment ?? null,
        otherAdjustment: pricingAssumption.otherAdjustment ?? null,
        landIncreaseDecreaseRate: pricingAssumption.landIncreaseDecreaseRate ?? null,
        forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
      });
    }
  }, [pricingAssumption, reset]);

  const handleSave = (data: PricingAssumptionFormValues) => {
    if (!appraisalId) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    saveAssumption(
      { appraisalId, data: data as any },
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

  const modelAssumptions = pricingAssumption?.modelAssumptions ?? [];
  const unitPrices = Array.isArray(unitPricesData) ? unitPricesData : Array.isArray(unitPricesData?.unitPrices) ? unitPricesData.unitPrices : [];

  return (
    <div className="flex flex-col gap-6 overflow-y-auto">
      {/* Model Assumptions (read-only) */}
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
          <ModelAssumptionsTable assumptions={modelAssumptions} />
        )}
      </div>

      <form onSubmit={handleSubmit(handleSave)} className="space-y-6">
        {/* Location Method */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="location-dot"
            label="Location Method"
            color="bg-green-50 text-green-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="max-w-xs">
            <Dropdown
              value={locationMethod ?? ''}
              onChange={val => setValue('locationMethod', val as string, { shouldDirty: true })}
              label="Adjustment Method"
              options={LOCATION_METHOD_OPTIONS}
              error={errors.locationMethod?.message}
            />
          </div>
        </div>

        {/* Location Assumptions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="location-dot"
            label="Location Assumptions"
            color="bg-teal-50 text-teal-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <NumberInput
              name="cornerAdjustment"
              label={`Corner (${adjustmentLabel})`}
              value={cornerAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('cornerAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.cornerAdjustment?.message}
            />
            <NumberInput
              name="edgeAdjustment"
              label={`Edge (${adjustmentLabel})`}
              value={edgeAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('edgeAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.edgeAdjustment?.message}
            />
            <NumberInput
              name="nearGardenAdjustment"
              label={`Near Garden/Clubhouse (${adjustmentLabel})`}
              value={nearGardenAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('nearGardenAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.nearGardenAdjustment?.message}
            />
            <NumberInput
              name="otherAdjustment"
              label={`Other (${adjustmentLabel})`}
              value={otherAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('otherAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.otherAdjustment?.message}
            />
          </div>
        </div>

        {/* Land Assumption */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="map"
            label="Land Assumption"
            color="bg-amber-50 text-amber-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="max-w-xs">
            <NumberInput
              name="landIncreaseDecreaseRate"
              label="Land Increase/Decrease Rate (Baht/sq.wa)"
              value={landIncreaseDecreaseRate}
              decimalPlaces={2}
              onChange={e =>
                setValue('landIncreaseDecreaseRate', e.target.value, { shouldDirty: true })
              }
              error={errors.landIncreaseDecreaseRate?.message}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Applied as: (Unit land area - Standard land area) × Rate
            </p>
          </div>
        </div>

        {/* Force Sale Value */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="percent"
            label="Force Sale Value"
            color="bg-rose-50 text-rose-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="max-w-xs">
            <NumberInput
              name="forceSalePercentage"
              label="Force Sale Percentage (%)"
              value={forceSalePercentage}
              decimalPlaces={2}
              min={0}
              max={100}
              onChange={e =>
                setValue('forceSalePercentage', e.target.value, { shouldDirty: true })
              }
              error={errors.forceSalePercentage?.message}
            />
            <p className="text-xs text-gray-400 mt-1.5">
              Applied to calculated unit prices (0 - 100%)
            </p>
          </div>
        </div>

        {/* Actions */}
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
      </form>

      {/* Calculated Unit Prices */}
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
        <UnitPriceResultTable unitPrices={unitPrices} isLoading={pricesLoading} />
      </div>
    </div>
  );
}

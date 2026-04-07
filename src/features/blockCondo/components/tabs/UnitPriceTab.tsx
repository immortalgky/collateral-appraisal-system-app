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
  useGetCondoPricingAssumption,
  useSaveCondoPricingAssumption,
  useCalculateCondoUnitPrices,
  useGetCondoUnitPrices,
} from '../../api/condoUnitPrice';
import type { CondoModelAssumption, CondoUnitPrice } from '../../types';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import NumberInput from '@shared/components/inputs/NumberInput';

// ==================== Schema ====================

const pricingAssumptionSchema = z.object({
  cornerAdjustment: z.number().optional().nullable(),
  edgeAdjustment: z.number().optional().nullable(),
  poolViewAdjustment: z.number().optional().nullable(),
  southAdjustment: z.number().optional().nullable(),
  otherAdjustment: z.number().optional().nullable(),
  floorIncrementEveryXFloor: z.number().optional().nullable(),
  floorIncrementAmount: z.number().optional().nullable(),
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
  assumptions: CondoModelAssumption[];
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
              Area From (sq.m.)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Area To (sq.m.)
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Standard Price (Baht/sq.m.)
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
            <tr key={m.condoModelId} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 px-3 font-medium text-gray-800">{m.modelType ?? '-'}</td>
              <td className="py-2 px-3 text-gray-600">{m.modelDescription ?? '-'}</td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaFrom?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {m.usableAreaTo?.toLocaleString() ?? '-'}
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
  unitPrices: CondoUnitPrice[];
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
            <th className="text-left py-2.5 px-3 text-gray-500 font-medium">Unit ID</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Corner</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Edge</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">Pool View</th>
            <th className="text-center py-2.5 px-3 text-gray-500 font-medium">South</th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Location Adj.
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Standard Price
            </th>
            <th className="text-right py-2.5 px-3 text-gray-500 font-medium whitespace-nowrap">
              Floor Increment
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
              <td className="py-2 px-3 text-gray-700 font-mono text-xs">{up.condoUnitId}</td>
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
                {up.isPoolView ? (
                  <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-2 px-3 text-center">
                {up.isSouth ? (
                  <Icon name="check" style="solid" className="w-3.5 h-3.5 text-green-500 mx-auto" />
                ) : (
                  <span className="text-gray-300">-</span>
                )}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.adjustPriceLocation?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.standardPrice?.toLocaleString() ?? '-'}
              </td>
              <td className="py-2 px-3 text-right text-gray-800">
                {up.priceIncrementPerFloor?.toLocaleString() ?? '-'}
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
  } = useGetCondoPricingAssumption(appraisalId ?? '');

  const { data: unitPricesData, isLoading: pricesLoading } = useGetCondoUnitPrices(
    appraisalId ?? '',
  );
  const unitPrices = Array.isArray(unitPricesData) ? unitPricesData : Array.isArray(unitPricesData?.unitPrices) ? unitPricesData.unitPrices : [];

  const { mutate: saveAssumption, isPending: isSaving } = useSaveCondoPricingAssumption();
  const { mutate: calculatePrices, isPending: isCalculating } = useCalculateCondoUnitPrices();

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<PricingAssumptionFormValues>({
    resolver: zodResolver(pricingAssumptionSchema),
  });

  const cornerAdjustment = watch('cornerAdjustment');
  const edgeAdjustment = watch('edgeAdjustment');
  const poolViewAdjustment = watch('poolViewAdjustment');
  const southAdjustment = watch('southAdjustment');
  const otherAdjustment = watch('otherAdjustment');
  const floorIncrementEveryXFloor = watch('floorIncrementEveryXFloor');
  const floorIncrementAmount = watch('floorIncrementAmount');
  const forceSalePercentage = watch('forceSalePercentage');

  useEffect(() => {
    if (pricingAssumption) {
      reset({
        cornerAdjustment: pricingAssumption.cornerAdjustment ?? null,
        edgeAdjustment: pricingAssumption.edgeAdjustment ?? null,
        poolViewAdjustment: pricingAssumption.poolViewAdjustment ?? null,
        southAdjustment: pricingAssumption.southAdjustment ?? null,
        otherAdjustment: pricingAssumption.otherAdjustment ?? null,
        floorIncrementEveryXFloor: pricingAssumption.floorIncrementEveryXFloor ?? null,
        floorIncrementAmount: pricingAssumption.floorIncrementAmount ?? null,
        forceSalePercentage: pricingAssumption.forceSalePercentage ?? null,
      });
    }
  }, [pricingAssumption, reset]);

  const handleSave = (data: PricingAssumptionFormValues) => {
    if (!appraisalId) return;
    saveAssumption(
      { appraisalId, data },
      {
        onSuccess: () => {
          toast.success('Pricing assumptions saved');
          reset(data);
        },
        onError: (error: AppError) => {
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
        onError: (error: AppError) => {
          toast.error(error?.apiError?.detail ?? 'Calculation failed');
        },
      },
    );
  };

  const modelAssumptions = pricingAssumption?.modelAssumptions ?? [];

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
        {/* Location Assumptions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="location-dot"
            label="Location Assumptions"
            color="bg-green-50 text-green-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <NumberInput
              name="cornerAdjustment"
              label="Corner (Baht)"
              value={cornerAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('cornerAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.cornerAdjustment?.message}
            />
            <NumberInput
              name="edgeAdjustment"
              label="Edge (Baht)"
              value={edgeAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('edgeAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.edgeAdjustment?.message}
            />
            <NumberInput
              name="poolViewAdjustment"
              label="Pool View (Baht)"
              value={poolViewAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('poolViewAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.poolViewAdjustment?.message}
            />
            <NumberInput
              name="southAdjustment"
              label="South (Baht)"
              value={southAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('southAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.southAdjustment?.message}
            />
            <NumberInput
              name="otherAdjustment"
              label="Other (Baht)"
              value={otherAdjustment}
              decimalPlaces={2}
              onChange={e => setValue('otherAdjustment', e.target.value, { shouldDirty: true })}
              error={errors.otherAdjustment?.message}
            />
          </div>
        </div>

        {/* Floor Assumptions */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <SectionHeader
            icon="stairs"
            label="Floor Assumptions"
            color="bg-amber-50 text-amber-600"
          />
          <div className="h-px bg-gray-100 mb-5" />
          <div className="grid grid-cols-2 gap-4 max-w-sm">
            <NumberInput
              name="floorIncrementEveryXFloor"
              label="Every X Floor"
              value={floorIncrementEveryXFloor}
              decimalPlaces={0}
              onChange={e =>
                setValue('floorIncrementEveryXFloor', e.target.value, { shouldDirty: true })
              }
              error={errors.floorIncrementEveryXFloor?.message}
            />
            <NumberInput
              name="floorIncrementAmount"
              label="Amount (Baht)"
              value={floorIncrementAmount}
              decimalPlaces={2}
              onChange={e =>
                setValue('floorIncrementAmount', e.target.value, { shouldDirty: true })
              }
              error={errors.floorIncrementAmount?.message}
            />
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

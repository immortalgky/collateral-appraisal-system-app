import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/components';
import { BuildingCostTable } from './BuildingCostTable';
import { RHFInputCell } from './table/RHFInputCell';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import z from 'zod';
import { MethodFooterActions } from './MethodFooterActions';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import toast from 'react-hot-toast';
import { useResetMethod, useUpdateMethodValue } from '../api';
import { useEffect, useMemo, useState } from 'react';
import { fmt } from '../domain/formatters';
import { useDerivedFields } from '@features/pricingAnalysis/adapters/useDerivedFieldArray.tsx';
import { KpiSummaryStrip, type KpiCard } from './KpiSummaryStrip';

type CostBuildingFormType = z.infer<typeof costBuildingDto>;

const costBuildingDto = z
  .object({
    appraisalPriceRounded: z.number(),
  })
  .passthrough();

interface CostBuldingPanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  properties: Record<string, unknown>[] | undefined;
  savedMethodValue?: number | null;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function CostBuildingPanel({
  activeMethod,
  properties,
  savedMethodValue,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: CostBuldingPanelProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { methodId, methodType } = activeMethod ?? {};

  const COLLATERAL_TYPES_WITH_BUILDING = ['B', 'LSB'];
  const buildingProperties = useMemo(
    () =>
      properties?.filter(p => COLLATERAL_TYPES_WITH_BUILDING.includes(p.propertyType as string)) ??
      [],
    [properties],
  );
  const hasBuilding = buildingProperties.length > 0;

  type CostTotals = {
    totalBuildingArea: number;
    totalPriceAfterDepreciation: number;
    totalPriceBeforeDepreciation: number;
    totalPriceDepre: number;
  };

  const {
    totalBuildingArea,
    totalPriceAfterDepreciation,
    totalPriceBeforeDepreciation,
    totalPriceDepre,
  } = useMemo<CostTotals>(() => {
    return buildingProperties.reduce<CostTotals>(
      (total, property) => {
        const depreciationDetails = (property.depreciationDetails as any[]) ?? [];
        const {
          totalBuildingArea,
          totalPriceAfterDepreciation,
          totalPriceBeforeDepreciation,
          totalPriceDepre,
        } = depreciationDetails.reduce(
          (acc, curr) => {
            return {
              totalBuildingArea: acc.totalBuildingArea + Number(curr.area || 0),
              totalPriceAfterDepreciation:
                acc.totalPriceAfterDepreciation + Number(curr.priceAfterDepreciation || 0),
              totalPriceBeforeDepreciation:
                acc.totalPriceBeforeDepreciation +
                Number(curr.area || 0) * Number(curr.pricePerSqMBeforeDepreciation || 0),
              totalPriceDepre: acc.totalPriceDepre + Number(curr.priceDepreciation || 0),
            };
          },
          {
            totalBuildingArea: 0,
            totalPriceAfterDepreciation: 0,
            totalPriceBeforeDepreciation: 0,
            totalPriceDepre: 0,
          },
        );

        return {
          totalBuildingArea: (total.totalBuildingArea += totalBuildingArea),
          totalPriceAfterDepreciation: (total.totalPriceAfterDepreciation +=
            totalPriceAfterDepreciation),
          totalPriceBeforeDepreciation: (total.totalPriceBeforeDepreciation +=
            totalPriceBeforeDepreciation),
          totalPriceDepre: (total.totalPriceDepre += totalPriceDepre),
        };
      },
      {
        totalBuildingArea: 0,
        totalPriceAfterDepreciation: 0,
        totalPriceBeforeDepreciation: 0,
        totalPriceDepre: 0,
      },
    );
  }, [buildingProperties]);

  const totalBuildingValue = totalPriceAfterDepreciation;
  const totalBuildingValueRounded = Math.round(totalBuildingValue / 1000) * 1000;
  const totalDeprePct = fmt((totalPriceDepre / totalPriceAfterDepreciation) * 100);

  const methods = useForm<CostBuildingFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(costBuildingDto),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { isDirty },
  } = methods;

  const saveMutation = useUpdateMethodValue();
  const resetMutation = useResetMethod();

  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const [isGenerated, setIsGenerated] = useState<boolean>(false);

  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!activeMethod?.pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId,
      });
      reset({ appraisalPriceRounded: totalBuildingValueRounded });
      toast.success(t('toasts.resetSuccess'));
    } catch {
      toast.error(t('toasts.failedReset'));
    }
  };

  /** Form handler — skips full Zod validation so we can save factors/scores independently */
  const handleOnSubmit = async () => {
    if (!activeMethod?.pricingAnalysisId || !methodId) {
      toast.error(t('toasts.missingIds'));
      return;
    }

    try {
      const request = getValues();

      await saveMutation.mutateAsync({
        id: activeMethod.pricingAnalysisId,
        methodId,
        request: { methodValue: request.appraisalPriceRounded },
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: request.appraisalPriceRounded,
        });
      }
      toast.success(t('toasts.saved'));
      reset(request);
    } catch {
      toast.error(t('toasts.saveFailed'));
    }
  };

  // Single init effect — runs once on mount or when method changes
  useEffect(() => {
    if (isGenerated) return;
    if (!methodId || !methodType || !properties) return;

    if (savedMethodValue != null && savedMethodValue !== 0) {
      // Priority 1: restore saved value
      reset({ appraisalPriceRounded: savedMethodValue });
    } else if (hasBuilding) {
      // Priority 2: seed from calculated total
      reset({ appraisalPriceRounded: totalBuildingValueRounded });
    }

    setIsGenerated(true);
  }, [
    isGenerated,
    methodId,
    methodType,
    properties,
    savedMethodValue,
    hasBuilding,
    totalBuildingValueRounded,
    reset,
  ]);

  // Warn user about unsaved changes before leaving
  useEffect(() => {
    onCalculationMethodDirty(isDirty);
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty, onCalculationMethodDirty]);

  return (
    <FormProvider methods={methods} schema={costBuildingDto}>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        <div className="flex flex-col gap-4 mt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
              <Icon name="person-digging" className="size-4" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Building Cost</h2>
          </div>
          <div className="rounded-lg border border-gray-200 p-5 space-y-4">
            <KpiSummaryStrip
              cards={
                [
                  {
                    label: 'Total Building Area',
                    value: totalBuildingArea,
                    icon: 'vector-square',
                    color: 'blue',
                    suffix: 'sq. m',
                  },
                  {
                    label: 'RCN before depreciation',
                    value: totalPriceBeforeDepreciation,
                    icon: 'building',
                    color: 'gray',
                    suffix: '฿',
                  },
                  {
                    label: `Total depreciation (${totalDeprePct}%)`,
                    value: totalPriceDepre,
                    icon: 'arrow-trend-down',
                    color: 'gray',
                    suffix: '฿',
                  },
                  {
                    label: 'Net building value',
                    value: totalPriceAfterDepreciation,
                    icon: 'circle-check',
                    color: 'green',
                    primary: true,
                    suffix: '฿',
                  },
                ] satisfies KpiCard[]
              }
            />
            <BuildingCostTable buildingCost={buildingProperties ?? []} />
          </div>

          {/* Summary */}
          {/* <div className="rounded-lg border border-gray-200 p-5 space-y-4">
            <BuildingCostSummary buildingCost={buildingProperties ?? []} />
          </div> */}
          <div className="border-t border-gray-200 mx-1" />
          <AdjustAppraisalPrice totalBuildingValue={totalBuildingValue} />
        </div>
        <MethodFooterActions
          onCancel={onCancelCalculationMethod}
          onReset={handleOnReset}
          showReset={!!savedMethodValue || saveMutation.isSuccess}
          isSubmitting={saveMutation.isPending}
        />
        <ConfirmDialog
          isOpen={isShowResetDialog}
          onClose={() => setIsShowResetDialog(false)}
          onConfirm={handleOnConfirmReset}
          message="Are you sure you want to reset this method? All calculation data will be cleared."
        />
      </form>
    </FormProvider>
  );
}

function AdjustAppraisalPrice({ totalBuildingValue }: { totalBuildingValue: number }) {
  useDerivedFields({
    rules: [
      {
        // appraisalDiff: appraisalPrice − upstream (negative = user rounded down).
        targetPath: 'appraisalDiff',
        deps: ['appraisalPriceRounded'],
        compute: ({ getValues }) => {
          const upstream = totalBuildingValue;
          const appraisalVal = Number(getValues('appraisalPriceRounded') || 0);
          return appraisalVal - upstream;
        },
      },
    ],
  });

  const diffBadge = (fieldPath: string) => (
    <RHFInputCell
      fieldName={fieldPath}
      inputType="display"
      accessor={({ value }) => {
        const num = Number(value) || 0;
        if (num === 0) return <span />;
        const color = num > 0 ? 'text-green-600' : 'text-red-500';
        const bgColor = num > 0 ? 'bg-green-50' : 'bg-red-50';
        const icon = num > 0 ? 'arrow-up' : 'arrow-down';
        return (
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${color} ${bgColor}`}
          >
            <Icon name={icon} style="solid" className="size-3" />
            {fmt(Math.abs(num))}
          </span>
        );
      }}
    />
  );

  return (
    <>
      {/* Adjust appraisal price */}
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 text-gray-500">Appraisal Price</span>
        <div className="w-40 text-right">
          <span className="font-semibold text-gray-800 tabular-nums">
            {fmt(Number(totalBuildingValue) || 0)}
          </span>
        </div>
        <span className="text-gray-500">Baht</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="w-48 shrink-0 font-semibold text-gray-800">
          Appraisal Price
          <span className="ml-1 text-xs font-normal text-gray-400">(rounded)</span>
        </span>
        <div className="w-40">
          <RHFInputCell
            fieldName={'appraisalPriceRounded'}
            inputType="number"
            number={{
              decimalPlaces: 2,
              maxIntegerDigits: 15,
              maxValue: 999_999_999_999_999.0,
              allowNegative: false,
            }}
          />
        </div>
        <span className="text-gray-500">Baht</span>
        {diffBadge('appraisalDiff')}
      </div>
    </>
  );
}

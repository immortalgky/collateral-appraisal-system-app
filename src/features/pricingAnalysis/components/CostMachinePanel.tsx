import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodFooterActions } from './MethodFooterActions';
import { CostMachineFormSchema, type CostMachineFormType } from '../schemas/costMachineForm';
import { type MachineryItem } from './CostMachineSection';
import toast from 'react-hot-toast';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '@/shared/components';
import { initializeCostMachineForm } from '../adapters/initializeCostMachineForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import CostMachineForm from './CostMachineForm';
import { useQueryClient } from '@tanstack/react-query';
import { useGetMachineCostItems, useResetMethod, useSaveMachineCostItems } from '../api';
import type { SaveMachineCostItemInput } from '../api';
import { pricingAnalysisKeys } from '../api/queryKeys';

interface CostMachinePanelProps {
  activeMethod?: {
    pricingAnalysisId?: string;
    approachId?: string;
    approachType?: string;
    methodId?: string;
    methodType?: string;
  };
  propertiesMap?: Record<string, Record<string, unknown>>;
  savedMethodValue?: number | null;
  onCalculationSave: (payload: {
    approachType: string;
    methodType: string;
    appraisalValue: number;
  }) => void;
  onCalculationMethodDirty: (check: boolean) => void;
  onCancelCalculationMethod: () => void;
}

export function CostMachinePanel({
  activeMethod,
  propertiesMap,
  savedMethodValue,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: CostMachinePanelProps) {
  const { pricingAnalysisId, methodId } = activeMethod ?? {};
  const queryClient = useQueryClient();
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const resetMutation = useResetMethod();
  const saveMutation = useSaveMachineCostItems();

  // Fetch saved machine cost items from API
  const { data: savedData, isPending: isLoadingCostItems } = useGetMachineCostItems(pricingAnalysisId, methodId);

  // Build machinery items from propertiesMap (all MAC-type properties in the group)
  const machineryItems: MachineryItem[] = useMemo(() => {
    if (!propertiesMap) return [];
    return Object.entries(propertiesMap)
      .filter(([, detail]) => (detail as any).propertyType === 'MAC')
      .map(([propertyId, detail]) => {
        const d = detail as Record<string, any>;
        return {
          appraisalPropertyId: String(d.propertyId ?? propertyId),
          quantity: d.quantity != null ? Number(d.quantity) : null,
          machineName: d.machineName != null ? String(d.machineName) : null,
          registrationNo: d.registrationNo != null ? String(d.registrationNo) : null,
          manufacturer: d.manufacturer != null ? String(d.manufacturer) : null,
          conditionUse: d.conditionUse != null ? String(d.conditionUse) : null,
          yearOfManufacture: d.yearOfManufacture != null ? Number(d.yearOfManufacture) : null,
        };
      });
  }, [propertiesMap]);

  const methods = useForm<CostMachineFormType>({
    mode: 'onSubmit',
    resolver: zodResolver(CostMachineFormSchema),
  });

  const {
    handleSubmit,
    formState: { isDirty },
    getValues,
    reset,
  } = methods;

  // Initialize form once when machine list and saved data are ready
  const isInitialized = useRef(false);
  useEffect(() => {
    if (savedData !== undefined && !isInitialized.current) {
      isInitialized.current = true;
      initializeCostMachineForm({
        machineryItems,
        savedItems: savedData?.items,
        remark: savedData?.remark ?? '',
        reset,
      });
    }
  }, [machineryItems, savedData]);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  const handleOnSubmit = async () => {
    if (!pricingAnalysisId || !methodId) return;

    const data = getValues();

    // Map form rows to API request format
    const items: SaveMachineCostItemInput[] = data.machineryCosts.map((row, idx) => ({
      id: row.id ?? null,
      appraisalPropertyId: row.appraisalPropertyId,
      displaySequence: idx + 1,
      rcnReplacementCost: row.rcn,
      lifeSpanYears: row.lifeSpan,
      conditionFactor: row.conditionFactor ?? 0,
      functionalObsolescence: row.functionalObsolescence ?? 1,
      economicObsolescence: row.economicObsolescence ?? 1,
      fairMarketValue: row.fmv,
      marketDemandAvailable: row.marketDemand === 'Y',
      notes: row.notes || null,
    }));

    try {
      const result = await saveMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
        items,
        remark: data.remark,
      });

      if (activeMethod?.approachType && activeMethod?.methodType) {
        onCalculationSave({
          approachType: activeMethod.approachType,
          methodType: activeMethod.methodType,
          appraisalValue: result.totalFmv,
        });
      }
      toast.success('Saved!');
    } catch {
      toast.error('Failed to save');
    }
  };

  /** reset handler */
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId,
        methodId,
      });
      // Invalidate cached saved data so re-init uses fresh state
      queryClient.invalidateQueries({
        queryKey: pricingAnalysisKeys.machineCostItems(pricingAnalysisId, methodId),
      });
      isInitialized.current = false;
      initializeCostMachineForm({ machineryItems, reset });
      toast.success('Method reset successfully');
    } catch {
      toast.error('Failed to reset method');
    }
  };

  return (
    <FormProvider methods={methods} schema={CostMachineFormSchema}>
      <form
        onSubmit={e => {
          e.preventDefault();
          handleSubmit(handleOnSubmit)(e);
        }}
        className="flex flex-col h-full gap-4"
      >
        {/* Header */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center size-8 rounded-lg bg-primary/10 text-primary">
            <Icon name="gear" className="size-4" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Cost Machine</h2>
        </div>

        {/* Content */}
        <CostMachineForm machineryItems={machineryItems} isLoading={isLoadingCostItems} />

        {/* Footer save/cancel */}
        <MethodFooterActions
          showReset={true}
          isSubmitting={saveMutation.isPending}
          onReset={handleOnReset}
          onCancel={onCancelCalculationMethod}
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

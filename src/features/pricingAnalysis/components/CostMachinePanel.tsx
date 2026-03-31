import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { MethodFooterActions } from './MethodFooterActions';
import { CostMachineFormSchema, type CostMachineFormType } from '../schemas/costMachineForm';
import { type MachineryItem } from './CostMachineSection';
import toast from 'react-hot-toast';
import { useEffect, useState } from 'react';
import { Icon } from '@/shared/components';
import { initializeCostMachineForm } from '../adapters/initializeCostMachineForm';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import CostMachineForm from './CostMachineForm';
import { useResetMethod } from '../api';
import { mockMachineryItems } from '../data/machineData';

// interface เหมือน WQSPanel — รับ props จาก panelProps ใน MethodSectionRenderer
interface CostMachinePanelProps {
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

export function CostMachinePanel({
  activeMethod,
  properties,
  savedMethodValue,
  onCalculationSave,
  onCalculationMethodDirty,
  onCancelCalculationMethod,
}: CostMachinePanelProps) {
  const { methodId } = activeMethod ?? {};
  const [isShowResetDialog, setIsShowResetDialog] = useState<boolean>(false);
  const resetMutation = useResetMethod();

  const machineryItems: MachineryItem[] = (properties ?? [])
    .filter(f => (f as any).propertyType === 'MAC')
    .map(m => {
      const item = m as Record<string, any>;
      return {
        quantity: Number(item.quantity ?? 0),
        machineName: String(item.machineName ?? ''),
        registrationNo: String(item.registrationNo ?? ''),
        manufacturer: String(item.manufacturer ?? ''),
        conditionUse: String(item.conditionUse ?? ''),
        yearOfManufacture: Number(item.yearOfManufacture ?? 0),
      };
    });

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

  useEffect(() => {
    initializeCostMachineForm({ machineryItems, reset });
  }, []);

  useEffect(() => {
    onCalculationMethodDirty(isDirty);
  }, [isDirty, onCalculationMethodDirty]);

  const handleOnSubmit = () => {
    const data = getValues();
    const totalFmv = data.machineryCosts.reduce((sum, row) => sum + (row.fmv ?? 0), 0);

    if (activeMethod?.approachType && activeMethod?.methodType) {
      onCalculationSave({
        approachType: activeMethod.approachType,
        methodType: activeMethod.methodType,
        appraisalValue: totalFmv,
      });
    }
    toast.success('Saved!');
  };

  /** reset handler */
  const handleOnReset = () => setIsShowResetDialog(true);
  const handleOnConfirmReset = async () => {
    setIsShowResetDialog(false);
    if (!activeMethod?.pricingAnalysisId || !methodId) return;
    try {
      await resetMutation.mutateAsync({
        pricingAnalysisId: activeMethod.pricingAnalysisId,
        methodId,
      });
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
        <CostMachineForm machineryItems={machineryItems} />

        {/* Footer save/cancel */}
        <MethodFooterActions
          showReset={true}
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

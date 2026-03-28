import type { UseFormReset } from 'react-hook-form';
import type { CostMachineFormType } from '../schemas/costMachineForm';
import type { MachineryItem, MachineryRowFormValue } from '../components/CostMachineSection';

interface InitializeCostMachineFormProps {
  machineryItems: MachineryItem[];
  groupDescription?: string;
  remark?: string;
  reset: UseFormReset<CostMachineFormType>;
}

export function buildMachineryFormDefaults(items: MachineryItem[]): MachineryRowFormValue[] {
  const currentYear = new Date().getFullYear() + 543; // พ.ศ.

  return items.map(machine => {
    const durationInUse =
      (machine.yearOfManufacture ?? 0 > 0) ? currentYear - (machine.yearOfManufacture ?? 0) : 0;

    return {
      machine,
      rcn: null,
      lifeSpan: null,
      durationInUse,
      residualLifeSpan: -durationInUse,
      conditionFactor: null,
      physicalDeterioration: 0,
      functionalObsolescence: 1,
      economicObsolescence: 1,
      fmv: 0,
      marketDemand: 'N' as const,
      remark: '',
    };
  });
}

export function initializeCostMachineForm({
  machineryItems,
  groupDescription = '',
  remark = '',
  reset,
}: InitializeCostMachineFormProps): void {
  if (!reset) return;

  reset({
    groupDescription,
    remark,
    machineryCosts: buildMachineryFormDefaults(machineryItems),
  });
}

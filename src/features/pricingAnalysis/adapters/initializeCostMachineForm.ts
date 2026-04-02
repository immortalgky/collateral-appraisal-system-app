import type { UseFormReset } from 'react-hook-form';
import type { CostMachineFormType } from '../schemas/costMachineForm';
import type { MachineryItem, MachineryRowFormValue } from '../components/CostMachineSection';
import type { MachineCostItemResponse } from '../api';

interface InitializeCostMachineFormProps {
  machineryItems: MachineryItem[];
  savedItems?: MachineCostItemResponse[];
  remark?: string;
  reset: UseFormReset<CostMachineFormType>;
}

export function buildMachineryFormDefaults(
  items: MachineryItem[],
  savedItems?: MachineCostItemResponse[],
): MachineryRowFormValue[] {
  const currentYear = new Date().getFullYear() + 543; // พ.ศ.

  // Build lookup map: appraisalPropertyId → saved item
  const savedMap = new Map<string, MachineCostItemResponse>();
  if (savedItems) {
    for (const item of savedItems) {
      savedMap.set(item.appraisalPropertyId, item);
    }
  }

  return items.map(machine => {
    const saved = savedMap.get(machine.appraisalPropertyId);
    const durationInUse =
      (machine.yearOfManufacture ?? 0) > 0 ? currentYear - (machine.yearOfManufacture ?? 0) : 0;

    if (saved) {
      // Populate from saved values
      const lifeSpan = saved.lifeSpanYears ?? 0;
      const diffResidualLifeSpan = lifeSpan - durationInUse;
      const conditionFactor = saved.conditionFactor ?? 0;
      const residualLifeSpan =
        diffResidualLifeSpan < 5 && (machine.conditionUse ?? '') !== '03'
          ? 5
          : diffResidualLifeSpan;
      const physicalDeterioration =
        lifeSpan !== 0 ? (1 - (lifeSpan - residualLifeSpan) / lifeSpan) * conditionFactor : 0;

      return {
        id: saved.id,
        appraisalPropertyId: machine.appraisalPropertyId,
        machine,
        rcn: saved.rcnReplacementCost,
        lifeSpan: saved.lifeSpanYears,
        durationInUse,
        residualLifeSpan,
        conditionFactor: saved.conditionFactor,
        physicalDeterioration,
        functionalObsolescence: saved.functionalObsolescence,
        economicObsolescence: saved.economicObsolescence,
        fmv: saved.fairMarketValue ?? 0,
        marketDemand: saved.marketDemandAvailable ? ('Y' as const) : ('N' as const),
        notes: saved.notes ?? '',
      };
    }

    // Default values for unsaved machine
    return {
      id: null,
      appraisalPropertyId: machine.appraisalPropertyId,
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
      notes: '',
    };
  });
}

export function initializeCostMachineForm({
  machineryItems,
  savedItems,
  remark = '',
  reset,
}: InitializeCostMachineFormProps): void {
  if (!reset) return;

  reset({
    remark,
    machineryCosts: buildMachineryFormDefaults(machineryItems, savedItems),
  });
}

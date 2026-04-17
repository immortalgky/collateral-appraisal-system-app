import type { AssumptionEditDraft } from '../../components/DiscountedCashFlowMethodModal';
import type { DCFAssumption, DCFCategory, DCFSection } from '../../types/dcf';

interface UseAssumptionEditorProps {
  section: DCFSection;
  category: DCFCategory;
  activeAssumption: DCFAssumption | null;
}

export function useAssumptionEditor({ section, category, activeAssumption }: UseAssumptionEditorProps) {
  if (!activeAssumption) {
    return { modalInitialData: null };
  }

  const modalInitialData: AssumptionEditDraft = {
    targetSectionClientId: section.clientId,
    targetCategoryClientId: category.clientId,
    targetAssumptionClientId: activeAssumption.clientId,
    assumptionType: activeAssumption.assumptionType ?? null,
    assumptionName: activeAssumption.assumptionName ?? null,
    displayName: activeAssumption.assumptionName ?? null,
    method: activeAssumption.method ?? null,
  };

  return { modalInitialData };
}

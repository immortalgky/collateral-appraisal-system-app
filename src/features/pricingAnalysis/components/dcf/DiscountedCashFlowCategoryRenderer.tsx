import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { DiscountedCashFlowCategory } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowCategory';
import type { DCFCategory, DCFSection } from '../../types/dcf';
import { CategoryGOPExpense } from '@features/pricingAnalysis/components/dcf/dcfCategories/CategoryGOPExpense.tsx';

interface DiscountedCashFlowCategoryRendererProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
  isReadOnly?: boolean;
  onStructuralChange?: () => void;
  incomeAnalysisId?: string;
  hostMethodId?: string;
  marketSurveys?: import('@/features/pricingAnalysis/schemas').MarketComparableDetailType[];
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}
export function DiscountedCashFlowCategoryRenderer({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  color,
  isReadOnly,
  onStructuralChange,
  incomeAnalysisId,
  hostMethodId,
  marketSurveys,
  ensureIncomeAnalysisId,
}: DiscountedCashFlowCategoryRendererProps) {
  const props = {
    name: name,
    properties: properties,
    section: section,
    category: category,
    totalNumberOfYears: totalNumberOfYears,
    color: color,
    isReadOnly: isReadOnly,
    onStructuralChange: onStructuralChange,
    incomeAnalysisId,
    hostMethodId,
    marketSurveys,
    ensureIncomeAnalysisId,
  };
  switch (category.categoryType) {
    case 'income': {
      return <DiscountedCashFlowCategory key={category.dbId ?? category.clientId} {...props} />;
    }
    case 'expenses': {
      return <DiscountedCashFlowCategory key={category.dbId ?? category.clientId} {...props} />;
    }
    case 'gop': {
      return <CategoryGOPExpense key={category.dbId ?? category.clientId} {...props} />;
    }
    case 'fixedExps': {
      return <DiscountedCashFlowCategory key={category.dbId ?? category.clientId} {...props} />;
    }
  }
}

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
}
export function DiscountedCashFlowCategoryRenderer({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  color,
}: DiscountedCashFlowCategoryRendererProps) {
  const props = {
    name: name,
    properties: properties,
    section: section,
    category: category,
    totalNumberOfYears: totalNumberOfYears,
    color: color,
    baseStyles: {
      rowHeader: 'pl-8 px-1 py-1.5 h-12 text-sm border-b border-gray-300',
      rowBody: 'pl-8 px-1.5 py-1.5 h-12 text-sm text-right border-b border-gray-300',
    },
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

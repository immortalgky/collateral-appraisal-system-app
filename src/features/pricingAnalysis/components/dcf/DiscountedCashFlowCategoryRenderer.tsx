import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { DiscountedCashFlowCategory } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowCategory';
import type { DCFCategory, DCFSection } from '../../types/dcf';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  category: DCFCategory;
  totalNumberOfYears: number;
  color: SectionColor;
}
export function DiscountedCashFlowSectionRenderer({
  name,
  properties,
  section,
  category,
  totalNumberOfYears,
  color,
}: DiscountedCashFlowSectionRendererProps) {
  switch (section.sectionType) {
    case 'incomeGeneral': {
      return (
        <DiscountedCashFlowCategory
          key={category.clientId ?? `${name}.categories.${index}`}
          name={`${name}.categories.${index}`}
          properties={properties}
          section={section}
          category={category}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
        />
      );
    }
    case 'expenseGeneral': {
      return (
        <DiscountedCashFlowCategory
          key={category.clientId ?? `${name}.categories.${index}`}
          name={`${name}.categories.${index}`}
          properties={properties}
          totalNumberOfYears={totalNumberOfYears}
          section={section}
          category={category}
          color={color}
        />
      );
    }
    case 'expenseGOP': {
      return (
        <DiscountedCashFlowCategory
          key={category.clientId ?? `${name}.categories.${index}`}
          name={`${name}.categories.${index}`}
          properties={properties}
          totalNumberOfYears={totalNumberOfYears}
          section={section}
          category={category}
          color={color}
        />
      );
    }
    case 'expenseFixedCharge': {
      return (
        <DiscountedCashFlowCategory
          key={category.clientId ?? `${name}.categories.${index}`}
          name={`${name}.categories.${index}`}
          properties={properties}
          totalNumberOfYears={totalNumberOfYears}
          section={section}
          category={category}
          color={color}
        />
      );
    }
  }
}

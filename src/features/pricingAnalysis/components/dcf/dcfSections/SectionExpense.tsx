import type { DCFSection } from '@/features/pricingAnalysis/types/dcf';
import { DynamicSection } from './DynamicSection';
import type { SectionColor } from '../DiscountedCashFlowTable';
import { DiscountedCashFlowCategoryRenderer } from '@features/pricingAnalysis/components/dcf/DiscountedCashFlowCategoryRenderer.tsx';

interface SectionExpenseProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
  isReadOnly: boolean;
}

export function SectionExpense({
  name,
  properties,
  section,
  totalNumberOfYears,
  icon,
  color,
  isReadOnly,
}: SectionExpenseProps) {
  return (
    <DynamicSection
      name={`${name}`}
      section={section}
      totalNumberOfYears={totalNumberOfYears}
      color={color}
      icon={icon}
    >
      {(section?.categories ?? []).map((category, index) => {
        return (
          <DiscountedCashFlowCategoryRenderer
            key={category.dbId ?? category.clientId}
            name={`${name}.categories.${index}`}
            properties={properties}
            section={section}
            category={category}
            totalNumberOfYears={totalNumberOfYears}
            color={color}
            isReadOnly={isReadOnly}
          />
        );
      })}
    </DynamicSection>
  );
}

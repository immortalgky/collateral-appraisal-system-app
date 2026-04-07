import type { DCFSection } from '@/features/pricingAnalysis/types/dcf';
import { DiscountedCashFlowCategory } from '../DiscountedCashFlowCategory';
import { DynamicSection } from './DynamicSection';
import type { SectionColor } from '../DiscountedCashFlowTable';

interface SectionExpenseProps {
  name: string;
  properties: Record<string, unknown>[] | undefined;
  section: DCFSection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
}

export function SectionExpense({
  name,
  properties,
  section,
  totalNumberOfYears,
  icon,
  color,
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
      })}
    </DynamicSection>
  );
}

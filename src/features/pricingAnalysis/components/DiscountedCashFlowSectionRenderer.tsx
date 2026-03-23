import { DynamicSection } from '@features/pricingAnalysis/components/dcfSections/DynamicSection.tsx';
import type { DCFSectionFormType } from '@features/pricingAnalysis/schemas/dcfForm.ts';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { DiscountedCashFlowCategory } from '@features/pricingAnalysis/components/DiscountedCashFlowCategory.tsx';
import { SummarySection } from './dcfSections/SummarySection';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  section: DCFSectionFormType;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
}
export function DiscountedCashFlowSectionRenderer({
  name,
  section,
  totalNumberOfYears,
  icon,
  color,
}: DiscountedCashFlowSectionRendererProps) {
  switch (section.sectionType) {
    case 'income': {
      return (
        <DynamicSection
          sectionName={section.sectionName}
          totalNumberOfYears={totalNumberOfYears}
          totalSectionValues={(section.totalSectionValues ?? []).map(v => v.value)}
          color={color}
          onEditAssumption={() => null}
          icon={icon}
        >
          {(section?.categories ?? []).map((category, index) => {
            return (
              <DiscountedCashFlowCategory
                name={`${name}.categories.${index}`}
                totalNumberOfYears={totalNumberOfYears}
                key={category.id ?? index}
                category={category}
                color={color}
                onEditAssumption={() => null}
              />
            );
          })}
        </DynamicSection>
      );
    }
    case 'expenses': {
      return (
        <DynamicSection
          sectionName={section.sectionName}
          totalNumberOfYears={totalNumberOfYears}
          totalSectionValues={(section?.totalSectionValues ?? []).map(v => v.value)}
          color={color}
          onEditAssumption={() => null}
          icon={icon}
        >
          {(section?.categories ?? []).map((category, index) => {
            return (
              <DiscountedCashFlowCategory
                name={`${name}.categories.${index}`}
                totalNumberOfYears={totalNumberOfYears}
                key={category.id ?? index}
                category={category}
                color={color}
                onEditAssumption={() => null}
              />
            );
          })}
        </DynamicSection>
      );
    }
    case 'summary': {
      return <SummarySection name={name} totalNumberOfYears={totalNumberOfYears} />;
    }
  }
}

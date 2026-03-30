import { DynamicSection } from '@features/pricingAnalysis/components/dcfSections/DynamicSection.tsx';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { DiscountedCashFlowCategory } from '@features/pricingAnalysis/components/DiscountedCashFlowCategory.tsx';
import { SummarySection } from './dcfSections/SummarySection';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray } from 'react-hook-form';
import { useMemo } from 'react';
import type { DCFSection } from '../types/dcf';
import { DirectCashFlowSummarySection } from './dcfSections/DirectCashFlowSummarySection';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  property: Record<string, unknown> | undefined;
  section: DCFSection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
}
export function DiscountedCashFlowSectionRenderer({
  name,
  property,
  section,
  totalNumberOfYears,
  icon,
  color,
}: DiscountedCashFlowSectionRendererProps) {
  switch (section.sectionType) {
    case 'income': {
      return (
        <DynamicSection
          name={`${name}`}
          sectionName={section.sectionName}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
          icon={icon}
        >
          {(section?.categories ?? []).map((category, index) => {
            return (
              <DiscountedCashFlowCategory
                key={category.clientId ?? `${name}.categories.${index}`}
                name={`${name}.categories.${index}`}
                property={property}
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
    case 'expenses': {
      return (
        <DynamicSection
          name={`${name}`}
          sectionName={section.sectionName}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
          icon={icon}
        >
          {(section?.categories ?? []).map((category, index) => {
            return (
              <DiscountedCashFlowCategory
                key={category.clientId ?? `${name}.categories.${index}`}
                name={`${name}.categories.${index}`}
                property={property}
                totalNumberOfYears={totalNumberOfYears}
                section={section}
                category={category}
                color={color}
              />
            );
          })}
        </DynamicSection>
      );
    }
    case 'summary': {
      return <SummarySection name={name} totalNumberOfYears={totalNumberOfYears} />;
    }
    case 'directSummary': {
      return <DirectCashFlowSummarySection name={name} totalNumberOfYears={totalNumberOfYears} />;
    }
  }
}

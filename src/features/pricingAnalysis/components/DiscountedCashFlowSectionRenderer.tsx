import { DynamicSection } from '@features/pricingAnalysis/components/dcfSections/DynamicSection.tsx';
import type { DCFSectionFormType } from '@features/pricingAnalysis/schemas/dcfForm.ts';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { DiscountedCashFlowCategory } from '@features/pricingAnalysis/components/DiscountedCashFlowCategory.tsx';
import { SummarySection } from './dcfSections/SummarySection';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';
import type { DCFSection } from '../types/dcf';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  section: DCFSection;
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
  const { fields } = useFieldArray({ name: `${name}.categories` });
  const rules: DerivedFieldRule<unknown>[] = useMemo(() => {
    return Array.from({ length: totalNumberOfYears }).flatMap((_, idx) => {
      return [
        {
          targetPath: `${name}.totalSectionValues.${idx}`,
          deps: [`${name}.categories`],
          compute: ({ getValues }) => {
            const categories = getValues(`${name}.categories`) ?? [];
            const totalCategoryValue = categories.reduce((prev, curr) => {
              return prev + Number(curr.totalCategoryValues?.[idx] ?? 0);
            }, 0);
            return Number(totalCategoryValue);
          },
        },
      ];
    });
  }, [fields]);
  useDerivedFields({ rules });

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
  }
}

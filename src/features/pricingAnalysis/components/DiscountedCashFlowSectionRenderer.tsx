import { DynamicSection } from '@features/pricingAnalysis/components/dcfSections/DynamicSection.tsx';
import type { DCFSectionFormType } from '@features/pricingAnalysis/schemas/dcfForm.ts';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import { DiscountedCashFlowCategory } from '@features/pricingAnalysis/components/DiscountedCashFlowCategory.tsx';
import { SummarySection } from './dcfSections/SummarySection';
import { useDerivedFields, type DerivedFieldRule } from '../adapters/useDerivedFieldArray';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useMemo } from 'react';

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
          name={`${name}`}
          sectionName={section.sectionName}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
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

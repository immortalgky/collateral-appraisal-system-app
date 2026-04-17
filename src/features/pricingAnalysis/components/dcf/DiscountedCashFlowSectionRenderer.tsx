import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { SectionSummaryDCF } from './dcfSections/SectionSummaryDCF';
import type { DCFSection } from '../../types/dcf';
import { SectionSummaryDirectCashFlow } from './dcfSections/SectionSummaryDirectCashFlow';
import { SectionIncome } from './dcfSections/SectionIncome';
import { SectionExpense } from './dcfSections/SectionExpense';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
  isReadOnly?: boolean;
}
export function DiscountedCashFlowSectionRenderer({
  name,
  properties,
  section,
  totalNumberOfYears,
  icon,
  color,
  isReadOnly,
}: DiscountedCashFlowSectionRendererProps) {
  switch (section.sectionType) {
    case 'income': {
      return (
        <SectionIncome
          name={`${name}`}
          section={section}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
          icon={icon}
          properties={properties}
          isReadOnly={isReadOnly}
        />
      );
    }
    case 'expenses': {
      return (
        <SectionExpense
          name={`${name}`}
          section={section}
          totalNumberOfYears={totalNumberOfYears}
          color={color}
          icon={icon}
          properties={properties}
          isReadOnly={isReadOnly}
        />
      );
    }
    case 'summaryDCF': {
      return <SectionSummaryDCF name={name} totalNumberOfYears={totalNumberOfYears} isReadOnly={isReadOnly} />;
    }
    case 'summaryDirect': {
      return <SectionSummaryDirectCashFlow name={name} totalNumberOfYears={totalNumberOfYears} isReadOnly={isReadOnly} />;
    }
  }
}

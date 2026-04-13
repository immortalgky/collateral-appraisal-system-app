import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { SectionSummaryDCF } from './dcfSections/SectionSummaryDCF';
import type { DCFSection, DCFSummarySection, DirectSummarySection } from '../../types/dcf';
import { SectionSummaryDirectCashFlow } from './dcfSections/SectionSummaryDirectCashFlow';
import { SectionIncome } from './dcfSections/SectionIncome';
import { SectionExpense } from './dcfSections/SectionExpense';

interface DiscountedCashFlowSectionRendererProps {
  name: string;
  properties: Record<string, unknown>[];
  section: DCFSection | DCFSummarySection | DirectSummarySection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
}
export function DiscountedCashFlowSectionRenderer({
  name,
  properties,
  section,
  totalNumberOfYears,
  icon,
  color,
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
        />
      );
    }
    case 'summaryDCF': {
      return <SectionSummaryDCF name={name} totalNumberOfYears={totalNumberOfYears} />;
    }
    case 'summaryDirect': {
      return <SectionSummaryDirectCashFlow name={name} totalNumberOfYears={totalNumberOfYears} />;
    }
  }
}

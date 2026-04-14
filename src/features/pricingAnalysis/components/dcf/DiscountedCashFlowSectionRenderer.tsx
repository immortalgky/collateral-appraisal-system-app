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
  isReadOnly: boolean;
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
  const props = {
    name: name,
    section: section,
    totalNumberOfYears: totalNumberOfYears,
    color: color,
    icon: icon,
    properties: properties,
    isReadOnly: isReadOnly,
  };
  switch (section.sectionType) {
    case 'income': {
      return <SectionIncome {...props} />;
    }
    case 'expenses': {
      return <SectionExpense {...props} />;
    }
    case 'summaryDCF': {
      return <SectionSummaryDCF {...props} />;
    }
    case 'summaryDirect': {
      return <SectionSummaryDirectCashFlow {...props} />;
    }
  }
}

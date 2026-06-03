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
  onStructuralChange?: () => void;
  incomeAnalysisId?: string;
  hostMethodId?: string;
  marketSurveys?: import('@/features/pricingAnalysis/schemas').MarketComparableDetailType[];
}
export function DiscountedCashFlowSectionRenderer({
  name,
  properties,
  section,
  totalNumberOfYears,
  icon,
  color,
  isReadOnly,
  onStructuralChange,
  incomeAnalysisId,
  hostMethodId,
  marketSurveys,
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
          onStructuralChange={onStructuralChange}
          incomeAnalysisId={incomeAnalysisId}
          hostMethodId={hostMethodId}
          marketSurveys={marketSurveys}
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
          onStructuralChange={onStructuralChange}
        />
      );
    }
    case 'summaryDCF': {
      return (
        <SectionSummaryDCF
          name={name}
          totalNumberOfYears={totalNumberOfYears}
          isReadOnly={isReadOnly}
        />
      );
    }
    case 'summaryDirect': {
      return (
        <SectionSummaryDirectCashFlow
          name={name}
          totalNumberOfYears={totalNumberOfYears}
          isReadOnly={isReadOnly}
        />
      );
    }
  }
}

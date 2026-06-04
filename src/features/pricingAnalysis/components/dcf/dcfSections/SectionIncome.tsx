import type { DCFSection } from '@/features/pricingAnalysis/types/dcf';
import { DynamicSection } from './DynamicSection';
import type { SectionColor } from '../DiscountedCashFlowTable';
import { DiscountedCashFlowCategoryRenderer } from '@features/pricingAnalysis/components/dcf/DiscountedCashFlowCategoryRenderer.tsx';

interface SectionIncomeProps {
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
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}

export function SectionIncome({
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
  ensureIncomeAnalysisId,
}: SectionIncomeProps) {
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
            onStructuralChange={onStructuralChange}
            incomeAnalysisId={incomeAnalysisId}
            hostMethodId={hostMethodId}
            marketSurveys={marketSurveys}
            ensureIncomeAnalysisId={ensureIncomeAnalysisId}
          />
        );
      })}
    </DynamicSection>
  );
}

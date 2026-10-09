import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { directComparisonPath } from '../adapters/directComparisonFieldPath';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { DirectComparisonScoringSection } from './DirectComparisonScoringSection';
import { SurveySelectionSection } from '@features/pricingAnalysis/components/SurveySelectionSection.tsx';
import { DirectComparisonAdjustAppraisalPriceSection } from '@features/pricingAnalysis/components/DirectComparisonAdjustAppraisalPriceSection.tsx';
import { ValueRangeCard } from '@features/pricingAnalysis/components/WQSValueRangeCard.tsx';
import { MethodTabs } from './MethodTabs';

interface DirectComparisonProps {
  isCostApproach: boolean;
  property: Record<string, unknown>;
  buildingCost?: Record<string, unknown>[];
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
  manualSubject?: boolean;
}

export const DirectComparisonForm = ({
  isCostApproach,
  property,
  buildingCost,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
  manualSubject,
}: DirectComparisonProps) => {
  const fieldPath = directComparisonPath;
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const hasComparables = comparativeMarketSurveys.length > 0;

  // Lifted out of SurveySelectionSection, same reasoning as WQSForm.tsx: the mock
  // puts "ซ่อนแถวว่าง" and "+ เพิ่มตลาด" in the tab strip's own toolbar (MethodTabs'
  // `tools` slot), a sibling of this tab's `content` rather than something inside
  // it, so the state they drive has to live here rather than down in the section.
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [isMarketSelectionOpen, setIsMarketSelectionOpen] = useState(false);

  return (
    <MethodTabs
      tabs={[
        {
          id: 'data',
          label: (
            <>
              {t('methodTabs.data')}
              {comparativeMarketSurveys.length > 0 && (
                <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-medium text-gray-500">
                  {comparativeMarketSurveys.length} {t('comparativeAnalysis.marketCountUnit')}
                </span>
              )}
            </>
          ),
          tools: hasComparables && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={hideEmptyRows}
                  onChange={e => setHideEmptyRows(e.target.checked)}
                  className="size-3.5 rounded border-gray-300 text-primary focus:ring-primary/30"
                />
                {t('comparativeAnalysis.hideEmptyRows')}
              </label>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsMarketSelectionOpen(true)}
                  className="h-6 px-2.5 text-[11.5px] font-medium text-primary border border-primary/40 rounded-md cursor-pointer hover:bg-primary/5 hover:border-primary/60 transition-colors"
                >
                  {t('comparativeAnalysis.addMarket')}
                </button>
              )}
              <span
                className="hidden 2xl:inline text-[10px] text-gray-400 whitespace-nowrap"
                title={t('comparativeAnalysis.scrollHint')}
              >
                {t('comparativeAnalysis.scrollHint')}
              </span>
            </>
          ),
          content: (
            <SurveySelectionSection
              template={template}
              allFactors={allFactors}
              property={property}
              marketSurveys={marketSurveys}
              comparativeMarketSurveys={comparativeMarketSurveys}
              fieldPath={fieldPath}
              onSelectComparativeMarketSurvey={onSelectComparativeMarketSurvey}
              manualSubject={manualSubject}
              hideEmptyRows={hideEmptyRows}
              isMarketSelectionOpen={isMarketSelectionOpen}
              onOpenMarketSelection={() => setIsMarketSelectionOpen(true)}
              onCloseMarketSelection={() => setIsMarketSelectionOpen(false)}
            />
          ),
        },
        {
          id: 'calc',
          label: t('methodTabs.calc'),
          // Same wheel-scroll affordance as the data tab — mirrors WQSForm.tsx's calc tab.
          tools: hasComparables && (
            <span
              className="hidden 2xl:inline text-[10px] text-gray-400 whitespace-nowrap"
              title={t('comparativeAnalysis.scrollHint')}
            >
              {t('comparativeAnalysis.scrollHint')}
            </span>
          ),
          // No heading here — the mock's calc tab table sits flush under the tab strip;
          // "การคำนวณราคาประเมิน" didn't exist in the mock (same removal as WQSForm.tsx's
          // calc tab, user: "header หัวตารางเช่น 'การคำนวณราคาประเมิน' ยังไม่ได้เอาออก").
          content: hasComparables && (
            <DirectComparisonScoringSection
              property={property}
              template={template}
              comparativeSurveys={comparativeMarketSurveys}
            />
          ),
        },
        {
          id: 'summary',
          label: t('methodTabs.summary'),
          // No heading here either — same removal, same reasoning.
          //
          // Wrapped rather than bare so this tab gets the same 14px/16px inset WQS's summary
          // already has (`.summary`, mock:578, applied in WQSAdjustFinalValueSection.tsx).
          // MethodTabs' shared tab body carries no padding of its own for any tab, so without
          // this the card sat flush against the tab edges while WQS's floated — the two
          // methods' summary tabs differed for no stated reason.
          //
          // Equal-width columns, not a wide card plus a narrow sidebar — the mock's two
          // cards are the same width, 16px apart, and heights stay content-driven and
          // top-aligned (the grid's default alignment). Same wrapper WQS's summary uses.
          content: hasComparables && (
            <div className="grid grid-cols-2 items-start gap-[16px] py-[14px] px-[16px]">
              <DirectComparisonAdjustAppraisalPriceSection
                property={property}
                buildingCost={buildingCost}
                isCostApproach={isCostApproach}
              />
              <ValueRangeCard method="DC" />
            </div>
          ),
        },
      ]}
    />
  );
};

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { AdjustFinalValueSection } from './WQSAdjustFinalValueSection';
import { SurveySelectionSection } from './SurveySelectionSection';
import { WQSScoringSection } from '@/features/pricingAnalysis/components/WQSScoringSection';
import { WQSRSQSection } from './WQSRSQSection';
import { MethodTabs } from './MethodTabs';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { wqsFieldPath } from '../adapters/wqsFieldPath';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

interface WQSProps {
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
export const WQSForm = ({
  isCostApproach,
  property,
  buildingCost,
  marketSurveys,
  comparativeMarketSurveys,
  template,
  allFactors,
  onSelectComparativeMarketSurvey,
  manualSubject,
}: WQSProps) => {
  const fieldPath = wqsFieldPath;
  const { t } = useTranslation('pricingAnalysis');
  const isReadOnly = usePageReadOnly();
  const hasComparables = comparativeMarketSurveys.length > 0;

  // Lifted out of SurveySelectionSection: the mock puts "ซ่อนแถวว่าง" and
  // "+ เพิ่มตลาด" in the tab strip's own toolbar (MethodTabs' `tools` slot), a sibling
  // of this tab's `content` rather than something inside it — so the state they drive
  // has to live here, one level up, with a single source of truth for both places.
  const [hideEmptyRows, setHideEmptyRows] = useState(false);
  const [isMarketSelectionOpen, setIsMarketSelectionOpen] = useState(false);
  // Regression panel — a right-hand panel now (mock), toggled from the calc tab's own
  // toolbar instead of always rendering inline below the scoring table.
  const [isRegressionOpen, setIsRegressionOpen] = useState(true);

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
          // WQS-specific label — the mock calls this tab "คำนวณคะแนน" for WQS but
          // "ปรับราคา" for SAG/DC, so it can't share `methodTabs.calc` with them.
          label: t('methodTabs.wqsCalc'),
          // Same wheel-scroll affordance as the data tab — the mock gates this on the
          // tab not being "summary", not on being the data tab specifically, and the
          // calc tab's scoring table scrolls horizontally the same way.
          tools: hasComparables && (
            <span
              className="hidden 2xl:inline text-[10px] text-gray-400 whitespace-nowrap"
              title={t('comparativeAnalysis.scrollHint')}
            >
              {t('comparativeAnalysis.scrollHint')}
            </span>
          ),
          // After the column-nav pagination, not before it — mock's renderSteps() puts
          // the Regression button after navHtml().
          toolsAfterNav: hasComparables && (
            <button
              type="button"
              onClick={() => setIsRegressionOpen(o => !o)}
              aria-pressed={isRegressionOpen}
              className={clsx(
                'h-6 px-2.5 text-[11.5px] font-medium rounded-md border transition-colors',
                isRegressionOpen
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50',
              )}
            >
              {t('wqs.regression.title')}
            </button>
          ),
          content: hasComparables && (
            // Regression moved from "always inline below the table" to a right-hand
            // panel (mock) — toggled via the tools button above, closable from its own
            // ✕. `items-stretch` (not `items-start`) so the panel stretches to the
            // table's height and reads as welded to it, per the mock's fingerprint
            // (table and panel share the same y, same flex row, no gap). No intervening
            // wrapper divs around either child — WQSScoringSection's and
            // WQSRSQSection's own root elements are the direct flex children, which is
            // what the mock's "same immediate flex parent" shape actually requires;
            // measured nesting depth was the root cause of the old 49px vertical offset.
            <div className="flex flex-1 min-h-0 items-stretch gap-4">
              {/* No heading here — the mock's calc tab table sits flush under the tab
                  strip with nothing above it; this "Calculation of Appraisal Value"
                  heading doesn't exist in the mock at all (measured gap: mock 0px,
                  ours 54px, and this block was most of it). */}
              <WQSScoringSection
                comparativeSurveys={comparativeMarketSurveys}
                template={template}
              />
              {isRegressionOpen && (
                <WQSRSQSection
                  comparativeSurveys={comparativeMarketSurveys}
                  onClose={() => setIsRegressionOpen(false)}
                />
              )}
            </div>
          ),
        },
        {
          id: 'summary',
          label: t('methodTabs.summary'),
          content: hasComparables && (
            // No heading here either — the card below already has its own h4
            // (`wqs.summary.adjustFinalValueTitle`); this duplicated it.
            <AdjustFinalValueSection
              property={property}
              buildingCost={buildingCost}
              isCostApproach={isCostApproach}
            />
          ),
        },
      ]}
    />
  );
};

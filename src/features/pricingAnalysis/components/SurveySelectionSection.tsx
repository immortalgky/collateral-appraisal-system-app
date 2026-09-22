import { useState } from 'react';
import type { FactorDataType, MarketComparableDetailType, TemplateDetailType } from '../schemas';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { ComparativeFactorTable } from './ComparativeFactorTable';
import { MarketSurveySelectionModal } from './MarketSurveySelectionModal';

interface SurveySelectionSectionProps {
  property: Record<string, unknown>;
  marketSurveys: MarketComparableDetailType[];
  comparativeMarketSurveys: MarketComparableDetailType[];
  template?: TemplateDetailType;
  allFactors: FactorDataType[];
  fieldPath: Record<string, any>;
  onSelectComparativeMarketSurvey: (surveys: MarketComparableDetailType[]) => void;
  manualSubject?: boolean;
  /**
   * All four optional — controlled by `WQSForm`, which lifted this state so its own
   * tab-strip toolbar (`MethodTabs`'s `tools` slot, matching the mock's control
   * position) and this section stay in sync. `SaleAdjustmentGridForm`/
   * `DirectComparisonForm` don't have that toolbar yet (their turn hasn't come), so
   * when omitted this component falls back to managing the same state itself — the
   * table's own inline "+" header button still opens the modal, `hideEmptyRows` just
   * has no checkbox to flip it, same as before this feature existed for them.
   */
  hideEmptyRows?: boolean;
  isMarketSelectionOpen?: boolean;
  onOpenMarketSelection?: () => void;
  onCloseMarketSelection?: () => void;
}
export function SurveySelectionSection({
  template,
  allFactors,
  property,
  marketSurveys,
  comparativeMarketSurveys,
  fieldPath,
  onSelectComparativeMarketSurvey,
  manualSubject,
  hideEmptyRows = false,
  isMarketSelectionOpen: isMarketSelectionOpenProp,
  onOpenMarketSelection,
  onCloseMarketSelection,
}: SurveySelectionSectionProps) {
  const isReadOnly = usePageReadOnly();
  const [localMarketSelectionOpen, setLocalMarketSelectionOpen] = useState(false);
  const isMarketSelectionOpen = isMarketSelectionOpenProp ?? localMarketSelectionOpen;
  const openMarketSelection = onOpenMarketSelection ?? (() => setLocalMarketSelectionOpen(true));
  const closeMarketSelection = onCloseMarketSelection ?? (() => setLocalMarketSelectionOpen(false));

  return (
    <div className="flex flex-col gap-4">
      {/* No section heading here — the "ข้อมูลเปรียบเทียบ" tab label above already is
          the heading (compact-layout redesign); a second one just wasted a row. */}
      <div>
        <div className="flex flex-col gap-2">
          {/* "Add Comparative Data" used to be a standalone button above the table;
              it's now the table's own "+" column header (compact-layout redesign) —
              see ComparativeFactorTable's onAddComparative prop. The toolbar's
              "+ เพิ่มตลาด" button (in the tab strip, owned by WQSForm) is a second entry
              point to the same modal, matching the mock. */}
          <ComparativeFactorTable
            comparativeMarketSurveys={comparativeMarketSurveys}
            property={property}
            allFactors={allFactors}
            template={template}
            fieldPath={fieldPath}
            manualSubject={manualSubject}
            hideEmptyRows={hideEmptyRows}
            onAddComparative={openMarketSelection}
            onRemoveComparative={survey =>
              onSelectComparativeMarketSurvey(
                comparativeMarketSurveys.filter(s => s.id !== survey.id),
              )
            }
          />
        </div>
        <MarketSurveySelectionModal
          isOpen={isMarketSelectionOpen}
          surveys={marketSurveys}
          comparativeSurveys={comparativeMarketSurveys}
          onSelect={onSelectComparativeMarketSurvey}
          onCancel={closeMarketSelection}
          readOnly={isReadOnly}
        />
      </div>
    </div>
  );
}

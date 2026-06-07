/**
 * MarketReferenceModal
 *
 * Top-level modal that hosts:
 *  - MarketReferenceList (list view, default)
 *  - MarketReferenceMethodPanel (drill-down when user opens a reference)
 *
 * Props are generic enough to serve all 5 field contexts.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { Icon } from '@/shared/components';
import { MarketReferenceList } from './MarketReferenceList';
import { MarketReferenceMethodPanel } from './MarketReferenceMethodPanel';
import { useGetComparativeAnalysisTemplates } from '@features/templateManagement/api/comparativeTemplate';
import type { ReferenceDto } from '../api/references';
import type { PricingAnalysisSubjectType } from '../api/references';
import type { MarketComparableDetailType } from '../schemas';
import type { TemplateDtoType } from '@/shared/schemas/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MarketReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectType: PricingAnalysisSubjectType;
  anchorId: string;
  anchorRefKey?: string | null;
  hostMethodId?: string | null;
  /** Called when user clicks "Use this value". When omitted, the apply button is hidden. */
  onApplyValue?: (value: number) => void;
  /** Market surveys for the comparable selection modal */
  marketSurveys: MarketComparableDetailType[];
  /** Template list for WQS/SAG/DC */
  templateList: TemplateDtoType[] | undefined;
  /** Subject property for auto-fill column (machinery/land) */
  subjectProperty?: Record<string, unknown>;
  /** For room-type unmatched detection: the current display label of the anchor */
  currentAnchorLabel?: string;
  readOnly?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MarketReferenceModal({
  isOpen,
  onClose,
  subjectType,
  anchorId,
  anchorRefKey,
  hostMethodId,
  onApplyValue,
  marketSurveys,
  templateList,
  subjectProperty,
  currentAnchorLabel,
  readOnly,
}: MarketReferenceModalProps) {
  const { t } = useTranslation('pricingAnalysis');
  const [openedRef, setOpenedRef] = useState<ReferenceDto | null>(null);

  // Some entry points (notably the DCF / room-income reference flow) don't thread the WQS/SAG/DC
  // comparative template list down to here and pass `undefined`, leaving the in-panel Template
  // dropdown permanently empty. Fall back to fetching it directly — same cached query, so callers
  // that already provide it pay nothing extra.
  const { data: fetchedTemplateList = [] } = useGetComparativeAnalysisTemplates(
    isOpen && !(templateList && templateList.length > 0),
  );
  const resolvedTemplateList =
    templateList && templateList.length > 0 ? templateList : fetchedTemplateList;

  const handleClose = () => {
    setOpenedRef(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ease-linear data-closed:opacity-0"
      />
      <div className="fixed inset-0 overflow-y-auto">
        <div className="flex min-h-full items-start justify-center p-4 pt-16">
          <DialogPanel
            transition
            className="w-full max-w-4xl bg-white rounded-xl shadow-xl overflow-hidden transition-all duration-300 ease-out data-closed:opacity-0 data-closed:scale-95"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
                  <Icon name="chart-bar" className="size-3.5" />
                </div>
                <h2 className="text-base font-semibold text-gray-900">
                  {t('marketRef.modalTitle')}
                </h2>
                {anchorRefKey && (
                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    {anchorRefKey}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <Icon name="xmark" style="regular" className="size-5" />
              </button>
            </div>

            {/* Body */}
            <div
              className="px-6 py-5 overflow-y-auto"
              style={{ maxHeight: 'calc(90vh - 120px)' }}
            >
              {openedRef ? (
                <MarketReferenceMethodPanel
                  pricingAnalysisId={openedRef.pricingAnalysisId}
                  subjectType={openedRef.subjectType}
                  marketSurveys={marketSurveys}
                  templateList={resolvedTemplateList}
                  subjectProperty={subjectProperty}
                  onBack={() => setOpenedRef(null)}
                />
              ) : (
                <MarketReferenceList
                  subjectType={subjectType}
                  anchorId={anchorId}
                  anchorRefKey={anchorRefKey}
                  hostMethodId={hostMethodId}
                  onOpenReference={ref => setOpenedRef(ref)}
                  onApplyValue={onApplyValue ? value => {
                    onApplyValue(value);
                    handleClose();
                  } : undefined}
                  readOnly={readOnly}
                  currentAnchorLabel={currentAnchorLabel}
                />
              )}
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
}

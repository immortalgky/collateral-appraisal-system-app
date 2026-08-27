import clsx from 'clsx';
import { Button, Icon, Toggle } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { Textarea } from '@/shared/components/inputs';
import { PricingAnalysisApproachAccordion } from './PricingAnalysisApproachAccordion';
import type { ViewLayout } from './PricingAnalysisMethodCard';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PricingAnalysisConfigType } from '../../schemas';
import type { ManualCostBreakdownContext } from '../../types/selection';
import { useState, useCallback, useEffect, useRef } from 'react';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const VIEW_LAYOUT_KEY = 'pricing-analysis-view-layout';

function getStoredLayout(): ViewLayout {
  try {
    const stored = localStorage.getItem(VIEW_LAYOUT_KEY);
    if (stored === 'grid' || stored === 'list') return stored;
  } catch {
    /* ignore */
  }
  return 'grid';
}

interface DeleteConfirmState {
  isOpen: boolean;
  hasData: boolean;
  isDeleting: boolean;
  confirmDelete: () => void;
  cancelDelete: () => void;
}

interface PricingAnalysisApproachMethodSelectorProps {
  state: SelectionState;
  isSystemCalculation: string;
  onSystemCalculationChange: (check: boolean) => void;
  onEnterEdit: () => void;
  onEditModeSave: () => void;
  onCancelEditMode: () => void;
  onSummaryModeSave: (
    pdfFiles: File[],
    remark: string,
  ) =>
    | { success: boolean; failedFileNames: string[] }
    | Promise<{ success: boolean; failedFileNames: string[] }>;
  isSummarySaving?: boolean;
  onToggleMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCalculationMethod: (arg: { approachType: string; methodType: string }) => void;

  onSelectCandidateMethod: (arg: { approachType: string; methodType: string }) => void;
  onSelectCandidateApproach: (approachType: string) => void;
  onToggleMethodCalcMode?: (arg: { approachType: string; methodType: string }) => void;

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  pricingConfiguration?: PricingAnalysisConfigType[];
  deleteConfirm?: DeleteConfirmState;
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  toggleCalcModeConfirm?: {
    isOpen: boolean;
    pending: { approachType: string; methodType: string } | null;
    message: string;
    confirmToggle: () => void;
    cancelToggle: () => void;
    isToggling: boolean;
  };
  /** Present only for the Cost approach in manual mode — see ManualCostBreakdown. */
  manualCostBreakdown?: ManualCostBreakdownContext;
  onRequestRemoveDocument?: (documentEntryId: string, fileName?: string | null) => void;
  removeDocumentConfirm?: {
    isOpen: boolean;
    pending: { documentEntryId: string; fileName?: string | null } | null;
    confirmRemove: () => void;
    cancelRemove: () => void;
    isRemoving: boolean;
  };
}

export const PricingAnalysisApproachMethodSelector = ({
  state,
  isSystemCalculation,
  onSystemCalculationChange,
  onEnterEdit,
  onCancelEditMode,
  onToggleMethod,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
  onToggleMethodCalcMode,
  onSummaryModeSave,
  isSummarySaving = false,

  onAddMethod,
  onDeleteMethod,
  pricingConfiguration,
  deleteConfirm,
  onManualValueSync,
  toggleCalcModeConfirm,
  manualCostBreakdown,
  onRequestRemoveDocument,
  removeDocumentConfirm,
}: PricingAnalysisApproachMethodSelectorProps) => {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('pricingAnalysis');
  const [viewLayout, setViewLayout] = useState<ViewLayout>(getStoredLayout);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [remark, setRemark] = useState(() => state.remark ?? '');

  useEffect(() => {
    setRemark(state.remark ?? '');
  }, [state.remark]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleViewLayoutChange = useCallback((layout: ViewLayout) => {
    setViewLayout(layout);
    try {
      localStorage.setItem(VIEW_LAYOUT_KEY, layout);
    } catch {
      /* ignore */
    }
  }, []);

  // Build a lookup of config methods per approach type
  const configMethodsByApproach = new Map(
    (pricingConfiguration ?? []).map(conf => [conf.approachType, conf.methods]),
  );

  const isEditing = state.viewMode === 'editing';

  const isManualMode = isSystemCalculation !== 'System';

  const hasManualMethod = (state.summarySelected ?? []).some(appr =>
    appr.methods.some(m => m.isIncluded && !m.useSystemCalc),
  );
  const requiresManualEvidence = isManualMode || hasManualMethod;

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      {/* Calculation Mode Banner */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <Icon
            name={isManualMode ? 'pen-field' : 'microchip'}
            style="solid"
            className="size-5 text-primary"
          />
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isManualMode ? t('calculationMode.manual') : t('calculationMode.system')}
            </p>
            <p className="text-xs text-gray-400">
              {isManualMode ? t('calculationMode.manualDesc') : t('calculationMode.systemDesc')}
            </p>
          </div>
        </div>
        {!isReadOnly && (
          <Toggle
            size="sm"
            options={[t('calculationMode.manualToggle'), t('calculationMode.systemToggle')]}
            checked={isSystemCalculation === 'System'}
            onChange={onSystemCalculationChange}
            disabled={isSummarySaving}
          />
        )}
      </div>

      {/* Section header with Edit button — shared by both modes */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          {isEditing ? t('approaches.editing') : t('approaches.title')}
        </span>
        {!isReadOnly && (
          <button
            type="button"
            disabled={isSummarySaving}
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium',
              isSummarySaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
              isEditing
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'text-primary border border-primary/30 hover:bg-primary/5',
            )}
            onClick={() => {
              if (isEditing) {
                onCancelEditMode();
              } else {
                onEnterEdit();
              }
            }}
          >
            <Icon
              name={isEditing ? 'check' : 'pen-to-square'}
              style={isEditing ? 'solid' : 'regular'}
              className="size-3.5"
            />
            {isEditing ? t('approaches.doneButton') : t('approaches.editButton')}
          </button>
        )}
      </div>

      {/* Inline edit view — shared by both modes */}
      {isEditing && (
        <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {state.editDraft?.map(appr => (
            <PricingAnalysisApproachAccordion
              key={appr.id}
              viewMode={state.viewMode}
              approach={appr}
              onToggleMethod={onToggleMethod}
              onSelectCalculationMethod={onSelectCalculationMethod}
              onSelectCandidateApproach={onSelectCandidateApproach}
              onSelectCandidateMethod={onSelectCandidateMethod}
              onAddMethod={onAddMethod}
              onDeleteMethod={onDeleteMethod}
              configMethods={configMethodsByApproach.get(appr.approachType)}
            />
          ))}

          {/* Delete confirmation */}
          {deleteConfirm && (
            <ConfirmDialog
              isOpen={deleteConfirm.isOpen}
              onClose={deleteConfirm.cancelDelete}
              onConfirm={deleteConfirm.confirmDelete}
              title={t('approaches.deleteMethod')}
              message={
                deleteConfirm.hasData
                  ? t('approaches.deleteHasData')
                  : t('approaches.deleteConfirm')
              }
              confirmText={t('footer.save')}
              variant={deleteConfirm.hasData ? 'danger' : 'warning'}
              isLoading={deleteConfirm.isDeleting}
            />
          )}
        </div>
      )}

      {/* Summary view */}
      {!isEditing && (
        <div className="flex flex-col w-full h-full min-h-0 gap-4">
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2">
            {state.summarySelected?.map(appr => (
              <PricingAnalysisApproachAccordion
                key={appr.id}
                viewMode="summary"
                viewLayout={viewLayout}
                approach={{
                  ...appr,
                  methods: appr.methods.filter(method => method.isIncluded),
                }}
                onToggleMethod={onToggleMethod}
                onSelectCalculationMethod={onSelectCalculationMethod}
                onSelectCandidateApproach={onSelectCandidateApproach}
                onSelectCandidateMethod={onSelectCandidateMethod}
                onViewLayoutChange={handleViewLayoutChange}
                isManualMode={isManualMode}
                onManualValueSync={onManualValueSync}
                onToggleMethodCalcMode={onToggleMethodCalcMode}
                manualCostBreakdown={manualCostBreakdown}
                disabled={isSummarySaving}
              />
            ))}
          </div>

          {/* Manual evidence: shown when the analysis is Manual, or when any individual
              method has been overridden to manual. */}
          {requiresManualEvidence && (
            <div className="flex flex-col gap-4">
              {/* Attached documents — already persisted (state.documents, loaded on INIT).
                  Visible read-only even when the page is read-only; removal is not. */}
              {(state.documents?.length ?? 0) > 0 && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-gray-600">
                    {t('approaches.attachedDocuments')}
                  </label>
                  <ul className="flex flex-col gap-1.5">
                    {state.documents!.map(doc => (
                      <li
                        key={doc.id}
                        className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-2 text-gray-700 truncate hover:text-primary cursor-pointer"
                          disabled={!doc.documentId}
                          onClick={() =>
                            window.open(
                              `${API_BASE_URL}/documents/${doc.documentId}/download?download=false`,
                              '_blank',
                            )
                          }
                          title={t('approaches.openPdf')}
                        >
                          <Icon
                            name="file-pdf"
                            style="solid"
                            className="size-4 text-red-500 shrink-0"
                          />
                          <span className="truncate underline underline-offset-2">
                            {doc.fileName ?? t('approaches.untitledDocument')}
                          </span>
                        </button>
                        {!isReadOnly && onRequestRemoveDocument && (
                          <button
                            type="button"
                            disabled={isSummarySaving}
                            className={clsx(
                              'text-gray-400 hover:text-red-500',
                              isSummarySaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                            )}
                            onClick={() => onRequestRemoveDocument(doc.id, doc.fileName)}
                          >
                            <Icon name="xmark" style="solid" className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!isReadOnly && (
                <>
                  {/* PDF File Uploader */}
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-600">
                      {t('approaches.manualUploadPdf')}
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      disabled={isSummarySaving}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) setPdfFiles(prev => [...prev, file]);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={isSummarySaving}
                      className={clsx(
                        'flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-primary rounded-xl bg-gray-50 text-sm text-primary hover:bg-gray-100 hover:border-gray-400 transition-colors',
                        isSummarySaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                      )}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Icon name="file-pdf" style="regular" className="size-4" />
                      {t('approaches.manualUploadClick')}
                    </button>
                    {pdfFiles.length > 0 && (
                      <ul className="flex flex-col gap-1.5">
                        {pdfFiles.map((file, idx) => (
                          <li
                            key={`${file.name}-${idx}`}
                            className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 text-sm"
                          >
                            <button
                              type="button"
                              className="flex items-center gap-2 text-gray-700 truncate hover:text-primary cursor-pointer"
                              onClick={() => {
                                const url = URL.createObjectURL(file);
                                window.open(url, '_blank');
                              }}
                              title={t('approaches.openPdf')}
                            >
                              <Icon
                                name="file-pdf"
                                style="solid"
                                className="size-4 text-red-500 shrink-0"
                              />
                              <span className="truncate underline underline-offset-2">
                                {file.name}
                              </span>
                            </button>
                            <button
                              type="button"
                              disabled={isSummarySaving}
                              className={clsx(
                                'text-gray-400 hover:text-red-500',
                                isSummarySaving
                                  ? 'cursor-not-allowed opacity-60'
                                  : 'cursor-pointer',
                              )}
                              onClick={() => setPdfFiles(prev => prev.filter((_, i) => i !== idx))}
                            >
                              <Icon name="xmark" style="solid" className="size-3.5" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Remark Textarea */}
                  <Textarea
                    label={t('approaches.manualRemark')}
                    rows={3}
                    placeholder={t('approaches.manualRemarkPlaceholder')}
                    value={remark}
                    onChange={e => setRemark(e.target.value)}
                    showCharCount={true}
                    disabled={isSummarySaving}
                  />
                </>
              )}
            </div>
          )}

          <div className="flex flex-col items-end justify-end gap-2">
            <div className="border border-t border-gray-200 w-full"></div>
            <Button
              type="button"
              disabled={isSummarySaving || isReadOnly}
              isLoading={isSummarySaving}
              onClick={async () => {
                const { success, failedFileNames } = await onSummaryModeSave(pdfFiles, remark);
                if (success) {
                  setPdfFiles([]);
                  // remark is left as-is — it now reflects what was just saved, and will
                  // resync from the server once the post-save detail refetch lands.
                } else {
                  // Only keep files that actually failed — successfully uploaded+attached
                  // files must not be retried on the next Save click.
                  setPdfFiles(prev => prev.filter(file => failedFileNames.includes(file.name)));
                }
              }}
            >
              {t('footer.save')}
            </Button>
          </div>
        </div>
      )}

      {removeDocumentConfirm && (
        <ConfirmDialog
          isOpen={removeDocumentConfirm.isOpen}
          onClose={removeDocumentConfirm.cancelRemove}
          onConfirm={removeDocumentConfirm.confirmRemove}
          title={t('approaches.removeDocumentTitle')}
          message={t('approaches.removeDocumentMessage', {
            fileName: removeDocumentConfirm.pending?.fileName ?? t('approaches.untitledDocument'),
          })}
          confirmText={t('confirm.confirmText')}
          variant="danger"
          isLoading={removeDocumentConfirm.isRemoving}
        />
      )}

      {toggleCalcModeConfirm && (
        <ConfirmDialog
          isOpen={toggleCalcModeConfirm.isOpen}
          onClose={toggleCalcModeConfirm.cancelToggle}
          onConfirm={toggleCalcModeConfirm.confirmToggle}
          message={toggleCalcModeConfirm.message}
          confirmText={t('confirm.confirmText')}
          variant="warning"
          isLoading={toggleCalcModeConfirm.isToggling}
        />
      )}
    </div>
  );
};

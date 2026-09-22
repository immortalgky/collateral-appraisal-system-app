import clsx from 'clsx';
import { Button, Icon } from '@/shared/components';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import { Textarea } from '@/shared/components/inputs';
import { PricingAnalysisApproachAccordion } from './PricingAnalysisApproachAccordion';
import { PricingAnalysisMethodBoard } from './PricingAnalysisMethodBoard';
import { MethodTopBarPortal } from '../MethodTopBarPortal';
import type { SelectionState } from '@features/pricingAnalysis/store/selectionReducer';
import type { PricingAnalysisConfigType, MarketComparableDetailType } from '../../schemas';
import type { ManualCostBreakdownContext, MethodRole } from '../../types/selection';
import type { PropertyGroupItemDto } from '@features/appraisal/api';
import type { MethodKey } from '../../hooks/useSelectionActions';
import { useContext, useEffect, useRef, useState } from 'react';
import { ServerDataCtx } from '../../store/selectionContext';
import { COST_APPROACH_TYPE } from '../../types/selection';
import {
  blocksSave,
  costSelectionIssues,
  requiredComponents,
} from '../../utils/costRequiredComponents';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useTranslation } from 'react-i18next';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

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

  onAddMethod?: (arg: { approachType: string; methodType: string }) => void;
  /** Adds one or more methods in one go — see PricingAnalysisMethodBoard's per-approach
   *  AddMethodPopover, which reuses the top bar's handler. */
  onAddMethods?: (picks: MethodKey[]) => Promise<{ succeeded: MethodKey[]; failed: MethodKey[] }>;
  onDeleteMethod?: (arg: { approachType: string; methodType: string }) => void;
  pricingConfiguration?: PricingAnalysisConfigType[];
  deleteConfirm?: DeleteConfirmState;
  onManualValueSync?: (arg: {
    approachType: string;
    methodType: string;
    value: number;
    methodId?: string;
  }) => void;
  /** Present only for the Cost approach in manual mode — see ManualCostBreakdown. */
  manualCostBreakdown?: ManualCostBreakdownContext;
  onSelectMethodRole?: (arg: {
    approachType: string;
    methodType: string;
    role: MethodRole;
  }) => void;
  onManualNoteSync?: (arg: {
    approachType: string;
    methodType: string;
    remark: string;
    methodId?: string;
  }) => void;
  onRequestRemoveDocument?: (documentEntryId: string, fileName?: string | null) => void;
  removeDocumentConfirm?: {
    isOpen: boolean;
    pending: { documentEntryId: string; fileName?: string | null } | null;
    confirmRemove: () => void;
    cancelRemove: () => void;
    isRemoving: boolean;
  };
  /** ข้อมูลอ้างอิง — folded into the board's table as its last group of rows. Undefined for
   *  model subjects (the old standalone GroupReferencesSection never rendered there either). */
  references?: {
    pricingAnalysisId: string;
    groupMethods: Array<{ id?: string; methodType: string; label: string }>;
    groupProperties: PropertyGroupItemDto[];
    marketSurveys: MarketComparableDetailType[];
  };
}

export const PricingAnalysisApproachMethodSelector = ({
  state,
  isSystemCalculation,
  onSelectCalculationMethod,

  onSelectCandidateMethod,
  onSelectCandidateApproach,
  onSummaryModeSave,
  isSummarySaving = false,

  onAddMethod,
  onAddMethods,
  onDeleteMethod,
  pricingConfiguration,
  deleteConfirm,
  onManualValueSync,
  onSelectMethodRole,
  onManualNoteSync,
  manualCostBreakdown,
  onRequestRemoveDocument,
  removeDocumentConfirm,
  references,
}: PricingAnalysisApproachMethodSelectorProps) => {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation(['pricingAnalysis', 'common']);
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [remark, setRemark] = useState(() => state.remark ?? '');

  useEffect(() => {
    setRemark(state.remark ?? '');
  }, [state.remark]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build a lookup of config methods per approach type
  const configMethodsByApproach = new Map(
    (pricingConfiguration ?? []).map(conf => [conf.approachType, conf.methods]),
  );

  const isEditing = state.viewMode === 'editing';

  // Save is blocked while the Cost approach's ticks would produce a wrong total — the same
  // condition the board's formula row already warns about, read from the one shared
  // implementation so the red banner and this button can never disagree.
  //
  // Only the two conditions that make a total WRONG or undefined block: a component counted by
  // two methods (the group's value comes out inflated) and a ticked method with no role (nothing
  // can be said about what it contributes). A component nobody covers yet, or a method not yet
  // calculated, are ordinary mid-work states — blocking those would stop an appraiser saving
  // partway through, which is not what was asked for.
  const serverData = useContext(ServerDataCtx);
  const costApproach = (state.summarySelected ?? []).find(
    appr => appr.approachType === COST_APPROACH_TYPE,
  );
  const costIssues = costSelectionIssues(
    costApproach?.methods ?? [],
    requiredComponents(serverData?.groupDetail?.properties ?? []),
  );
  const isSaveBlocked = blocksSave(costIssues);

  const isManualMode = isSystemCalculation !== 'System';

  return (
    <div className="flex flex-col overflow-hidden gap-4 h-full">
      {/* Inline edit view — decides which methods exist on each approach */}
      {isEditing && (
        <div className="flex flex-col gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
          {state.editDraft?.map(appr => (
            <PricingAnalysisApproachAccordion
              key={appr.id}
              viewMode="editing"
              approach={appr}
              onAddMethod={onAddMethod}
              onDeleteMethod={onDeleteMethod}
              configMethods={configMethodsByApproach.get(appr.approachType)}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation — shared by the editing list above and the board below */}
      {deleteConfirm && (
        <ConfirmDialog
          isOpen={deleteConfirm.isOpen}
          onClose={deleteConfirm.cancelDelete}
          onConfirm={deleteConfirm.confirmDelete}
          title={t('approaches.deleteMethod')}
          message={
            deleteConfirm.hasData ? t('approaches.deleteHasData') : t('approaches.deleteConfirm')
          }
          confirmText={t('common:actions.delete')}
          variant={deleteConfirm.hasData ? 'danger' : 'warning'}
          isLoading={deleteConfirm.isDeleting}
        />
      )}

      {/* Summary view — the approach/method board (table) */}
      {!isEditing && (
        <div className="flex flex-col w-full h-full min-h-0 gap-4">
          {/* The rail (mock's .sideL, mock:277) is a sibling of this selector, not a child of
              it — see PricingAnalysisAccordion, which renders both. This is the board, plus
              the documents card below it (mock:3390 `selScroller.innerHTML = boardHtml() +
              docsHtml()`) — both share this one scroller so the card scrolls into view with
              the board instead of competing with it for a fixed slice of the column height. */}
          <div className="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4">
            <PricingAnalysisMethodBoard
              approaches={(state.summarySelected ?? []).map(appr => ({
                ...appr,
                methods: appr.methods.filter(method => method.isIncluded),
              }))}
              onSelectCalculationMethod={onSelectCalculationMethod}
              onSelectCandidateMethod={onSelectCandidateMethod}
              onSelectCandidateApproach={onSelectCandidateApproach}
              onAddMethods={onAddMethods}
              onDeleteMethod={onDeleteMethod}
              configMethodsByApproach={configMethodsByApproach}
              pricingConfiguration={pricingConfiguration}
              onManualValueSync={onManualValueSync}
              onSelectMethodRole={onSelectMethodRole}
              onManualNoteSync={onManualNoteSync}
              manualCostBreakdown={manualCostBreakdown}
              disabled={isSummarySaving}
              references={references}
            />

            {/* Analysis-level supporting documents & remark (mock:3270 docsHtml) — always
                visible, not gated on manual mode, so evidence can be attached before any
                method switches to manual entry. Keyed on PricingAnalysisId, shared by every
                method on this analysis, unlike the per-method note in the board's rows. */}
            {/* Not a card: the board above it isn't one either, so the frame + filled header
                read as a second, competing panel rather than the tail of this one. Heading and
                body sit directly on the page instead. */}
            <div className="shrink-0">
              <h4 className="m-0 py-[8px] text-[12.5px] font-semibold text-gray-800">
                {t('approaches.documentsCardTitle')}
                <span className="ml-1 text-[10.5px] font-normal text-gray-400">
                  {t('approaches.documentsCardSubtitle')}
                </span>
              </h4>
              <div className="flex flex-col gap-[8px]">
                {/* Attached documents — already persisted (state.documents, loaded on INIT).
                    Visible read-only even when the page is read-only; removal is not. */}
                {/* Chips, not full-width rows: an attachment is a short label, so a row per file
                    left a long empty gutter and pushed the × to the far side of the screen, away
                    from the name it belongs to. Wrapping inline-sized chips keeps each one as
                    wide as its own filename and fits several per line. */}
                {(state.documents?.length ?? 0) > 0 && (
                  <ul className="flex flex-wrap items-center gap-1.5">
                    {state.documents!.map(doc => (
                      <li
                        key={doc.id}
                        // max-w caps the outlier: one very long filename would otherwise stretch
                        // its chip across the whole line and undo the point of chipping them.
                        className="flex items-center gap-1.5 max-w-full min-w-0 px-2.5 py-1 bg-gray-50 rounded-full border border-gray-200 text-[12px]"
                      >
                        <button
                          type="button"
                          className="flex items-center gap-1.5 min-w-0 text-gray-700 truncate hover:text-primary cursor-pointer"
                          disabled={!doc.documentId}
                          onClick={() =>
                            window.open(
                              `${API_BASE_URL}/documents/${doc.documentId}/download?download=false`,
                              '_blank',
                            )
                          }
                          // The filename, not "open PDF": it is truncated inside the chip, so the
                          // tooltip is the only place a long name can still be read in full.
                          title={doc.fileName ?? t('approaches.openPdf')}
                        >
                          <Icon
                            name="file-pdf"
                            style="solid"
                            className="size-3.5 text-red-500 shrink-0"
                          />
                          <span className="truncate">
                            {doc.fileName ?? t('approaches.untitledDocument')}
                          </span>
                        </button>
                        {!isReadOnly && onRequestRemoveDocument && (
                          <button
                            type="button"
                            disabled={isSummarySaving}
                            className={clsx(
                              'shrink-0 text-gray-400 hover:text-red-500',
                              isSummarySaving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
                            )}
                            onClick={() => onRequestRemoveDocument(doc.id, doc.fileName)}
                          >
                            <Icon name="xmark" style="solid" className="size-3" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
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
                                onClick={() =>
                                  setPdfFiles(prev => prev.filter((_, i) => i !== idx))
                                }
                              >
                                <Icon name="xmark" style="solid" className="size-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Discoverability hint (mock:3275) — shown only while no method has
                      actually switched to manual entry yet, so the card doesn't nag once
                      it's in active use. */}
                    {!isManualMode && (
                      <div className="text-[12px] text-gray-400">
                        {t('approaches.noManualMethodYet')}
                      </div>
                    )}

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
            </div>
          </div>

          {/* Portaled into the top bar's shared "actions" slot (mock:1030-1032) — see
              MethodTopBarPortal.tsx. That slot is only ever occupied by one thing at a
              time: this board unmounts whenever a WQS/SAG/DC method takes over the bar
              (see the `!topBarBadge` guard around PricingAnalysisAccordion in
              PricingAnalysisPage), so there is no second Save button to keep in sync —
              this is still the one button, just rendered elsewhere in the DOM. Its
              pdfFiles/remark draft stays in this component's own state either way. */}
          <MethodTopBarPortal slot="actions">
            <Button
              type="button"
              disabled={isSummarySaving || isReadOnly || isSaveBlocked}
              isLoading={isSummarySaving}
              // Says WHY it's disabled. A greyed-out button with no explanation is the version
              // of this that sends people hunting; the board's own red banner names the
              // offending methods, and this points at it.
              title={isSaveBlocked ? t('board.formula.saveBlocked') : undefined}
              className="h-[28px]! px-[12px]! py-0! text-[12.5px]! rounded-[7px]!"
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
              leftIcon={<Icon name="check" style="solid" className="size-3" />}
            >
              {t('footer.save')}
            </Button>
          </MethodTopBarPortal>
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
          confirmText={t('common:actions.delete')}
          variant="danger"
          isLoading={removeDocumentConfirm.isRemoving}
        />
      )}
    </div>
  );
};

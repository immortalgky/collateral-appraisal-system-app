import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import DataErrorState from '@/shared/components/DataErrorState';
import { useGetAppraisalDocuments } from '@/features/appraisal/api/appraisalDocuments';
import {
  ActionDropdown,
  DocumentFileRow,
  formatUploadDateTime,
} from '@/features/appraisal/components/documentShared';
import { useViewDocument } from '@/features/request/api/documents';
import type { AppraisalDocumentFile } from '@/features/appraisal/types/appraisalDocuments';
import { useGetCorrectionContext } from '../api/appraisalDataCorrection';
import {
  hasNewSummaryFile,
  latestSummaryFile,
  type Regeneration,
  SUMMARY_TYPE_CODES,
  summaryFileIds,
} from '../utils/documentCorrection';
import { documentTypeName } from '@/features/appraisal/utils/valuationDocuments';
import DocumentActionDialog, { type DocumentDialogState } from './DocumentActionDialog';

interface DocumentCorrectionPaneProps {
  appraisalId: string;
  /** Owned by the page so it survives switching rail entries while a job runs. */
  regeneration: Regeneration | null;
  onRegenerationChange: (next: Regeneration | null) => void;
}

const DocumentCorrectionPane = ({
  appraisalId,
  regeneration: regen,
  onRegenerationChange: setRegen,
}: DocumentCorrectionPaneProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  // DocumentFileRow is typed against the appraisal namespace (its "uploaded by" label).
  const { t: tAppraisal } = useTranslation('appraisal');
  const { data, isLoading, isError, error, refetch } = useGetAppraisalDocuments(appraisalId);
  const viewDocument = useViewDocument();
  const {
    data: source,
    isLoading: sourceLoading,
    isError: sourceError,
  } = useGetCorrectionContext(appraisalId);
  const externalSystem = source?.externalSystem ?? null;

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<DocumentDialogState | null>(null);

  const types = data?.types ?? [];
  const polling = regen?.status === 'polling';

  const handleToggleType = (code: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleView = (file: AppraisalDocumentFile) => {
    if (!file.documentId) return;
    // The size decides whether this opens inline or downloads — see MAX_INLINE_VIEW_BYTES.
    viewDocument(file.documentId, file.fileSizeBytes, file.fileName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only when there is nothing to show: a failed background/poll refetch keeps the cached list
  // (and any open dialog) on screen instead of swapping the whole pane for an error.
  if (isError && !data) {
    return (
      <DataErrorState
        variant="inline"
        title={t('documents.loadFailed')}
        message={(error as Error)?.message}
        onRetry={() => refetch()}
      />
    );
  }

  const latest = latestSummaryFile(types);
  const latestBy = latest?.uploadedByName ?? latest?.uploadedBy;
  const stripText = polling
    ? t('documents.strip.busy')
    : latest
      ? [t('documents.strip.latest', { at: formatUploadDateTime(latest.uploadedAt) }), latestBy]
          .filter(Boolean)
          .join(' · ')
      : t('documents.strip.none');
  // Self-clearing: once the file does turn up (say after a manual refresh) the warning goes away.
  const showTimeout = regen?.status === 'timeout' && !hasNewSummaryFile(regen.baselineIds, types);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pb-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="min-w-0 text-base font-semibold text-gray-900 truncate">
          {t('documents.title')}
        </h2>
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={types.length === 0}
          onClick={() => setDialog({ kind: 'attach', typeCode: types[0]?.code ?? '' })}
        >
          <Icon style="solid" name="plus" className="size-3.5 mr-1.5" />
          {t('documents.attach')}
        </Button>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Regenerate / notify strip — the way to have the source system collect again. */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3 bg-primary/5 border-b border-gray-100">
          <div className="min-w-0 flex-1 basis-64">
            <p className="text-sm font-medium text-gray-900">{t('documents.strip.title')}</p>
            <p className="text-xs text-gray-500">{stripText}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            isLoading={polling}
            // The dialog words itself by whether a source system exists; wait until that is known. A failed
            // lookup is not "no source": regenerating then would silently skip notifying it.
            disabled={sourceLoading || sourceError}
            onClick={() => {
              // The poll's baseline is this list's summary files; refresh it first so a file that
              // arrived since the last fetch (e.g. after a timeout) is not mistaken for the new one.
              void refetch();
              setDialog({ kind: 'regenerate' });
            }}
          >
            {polling ? t('documents.strip.regenerating') : t('documents.strip.regenerate')}
          </Button>
          {externalSystem && (
            // Not while a job runs: it would tell the source system to collect before the new
            // summary is attached, and the job may notify again when it finishes.
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={polling}
              onClick={() => setDialog({ kind: 'notify' })}
            >
              <Icon style="solid" name="paper-plane" className="size-3.5 mr-1.5" />
              {t('documents.strip.notify', { system: externalSystem })}
            </Button>
          )}
        </div>
        {showTimeout && (
          <div
            role="status"
            className="px-6 py-2.5 bg-amber-50 border-b border-gray-100 text-xs text-amber-700"
          >
            {regen.notifyExternal
              ? t('documents.strip.timeoutNotified')
              : t('documents.strip.timeout')}
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {types.map(type => {
            const isExpanded = expandedTypes.has(type.code);
            const isGenerating = polling && SUMMARY_TYPE_CODES.includes(type.code);
            return (
              <div key={type.code}>
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => handleToggleType(type.code)}
                  className={clsx(
                    'w-full px-6 py-3.5 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors',
                    isExpanded && 'bg-gray-50/50',
                  )}
                >
                  <Icon
                    name={isExpanded ? 'chevron-down' : 'chevron-right'}
                    className="text-gray-400 text-sm flex-shrink-0"
                  />
                  <span className="min-w-0 flex-1 text-sm font-medium text-gray-900 truncate">
                    {documentTypeName(type, i18n.language)}
                  </span>
                  {isGenerating ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full whitespace-nowrap">
                      <Icon name="spinner" style="solid" className="size-3 animate-spin" />
                      {t('documents.generating')}
                    </span>
                  ) : type.totalFiles > 0 ? (
                    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
                      {t('documents.fileCount', { count: type.totalFiles })}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full whitespace-nowrap">
                      {t('documents.noFile')}
                    </span>
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-4 pl-[3.25rem] flex flex-col gap-2">
                    {type.files.length > 0 && (
                      <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
                        {type.files.map(file => (
                          <div
                            key={file.id}
                            className="px-3 py-2.5 hover:bg-gray-50/60 transition-colors"
                          >
                            <DocumentFileRow
                              fileName={file.fileName}
                              documentId={file.documentId}
                              mimeType={file.mimeType}
                              fileSizeBytes={file.fileSizeBytes}
                              uploadedAt={file.uploadedAt}
                              uploadedBy={file.uploadedBy}
                              uploadedByName={file.uploadedByName}
                              onView={() => handleView(file)}
                              t={tAppraisal}
                              actions={
                                <ActionDropdown
                                  isEditable
                                  onView={() => handleView(file)}
                                  onEdit={() =>
                                    setDialog({ kind: 'replace', typeCode: type.code, file })
                                  }
                                  onDelete={() =>
                                    setDialog({ kind: 'delete', typeCode: type.code, file })
                                  }
                                  labels={{
                                    view: t('documents.menu.view'),
                                    edit: t('documents.menu.replace'),
                                    delete: t('documents.menu.delete'),
                                  }}
                                />
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() => setDialog({ kind: 'attach', typeCode: type.code })}
                        className="inline-flex items-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:border-primary transition-colors"
                      >
                        <Icon name="plus" className="text-xs" />
                        {t('documents.attachFile')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {dialog && (
        <DocumentActionDialog
          appraisalId={appraisalId}
          state={dialog}
          types={types}
          externalSystem={externalSystem}
          onClose={() => setDialog(null)}
          onRegenerated={notifyExternal =>
            setRegen({
              baselineIds: summaryFileIds(types),
              startedAt: Date.now(),
              notifyExternal,
              status: 'polling',
            })
          }
        />
      )}
    </div>
  );
};

export default DocumentCorrectionPane;

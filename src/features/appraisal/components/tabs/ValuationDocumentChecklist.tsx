import { useCallback, useRef, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import Icon from '@shared/components/Icon';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import DataErrorState from '@/shared/components/DataErrorState';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalContext } from '../../context/AppraisalContext';
import { ActionDropdown, DocumentFileRow } from '../documentShared';
import {
  useAttachAppraisalDocument,
  useGetAppraisalDocuments,
  useRemoveAppraisalDocument,
} from '@features/appraisal/api';
import {
  createUploadSession,
  useUploadDocument,
  useViewDocument,
} from '@features/request/api/documents';
import { useAsyncReportJob } from '@features/reportGeneration/hooks/useAsyncReportJob';
import { useAuthStore } from '@features/auth/store';
import type { AppraisalDocumentFile, AppraisalDocumentType } from '../../types/appraisalDocuments';

const VAL_DOC_CATEGORY = 'VAL_DOC';
const VAL_REPORT_CATEGORY = 'VAL_REPORT';

// System-generated report types available from the checklist — code → report job key.
// appraisal-summary is a composite report; the job itself handles combining D042/D043.
const REPORT_TYPE_BY_CODE: Record<string, string> = {
  D001: 'appraisal-book',
  D042: 'appraisal-summary',
  D043: 'appraisal-summary',
};

const isAllowedChecklistFile = (file: File) => /\.(jpe?g|png|pdf)$/i.test(file.name);

// Type-count badge shown on each accordion row header — same green/amber palette as
// StatusBadge (documentShared.tsx), so "has files"/"no files" reads consistently across
// the whole Documents page.
const TypeBadge = ({ count, t }: { count: number; t: TFunction<'appraisal'> }) =>
  count > 0 ? (
    <span className="px-2 py-0.5 bg-green-50 text-green-700 text-xs font-semibold rounded-full whitespace-nowrap">
      {t('valuationDocuments.fileCount', { count })}
    </span>
  ) : (
    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full whitespace-nowrap">
      {t('valuationDocuments.noFile')}
    </span>
  );

export const ValuationDocumentChecklist = () => {
  const readOnly = usePageReadOnly();
  const { t, i18n } = useTranslation('appraisal');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;
  const currentUser = useAuthStore(state => state.user);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetAppraisalDocuments(appraisalId);

  const attachDocument = useAttachAppraisalDocument();
  const removeDocument = useRemoveAppraisalDocument();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const viewDocument = useViewDocument();
  const { trigger: triggerReportJob } = useAsyncReportJob();

  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; fileName: string | null } | null>(
    null,
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeCodeRef = useRef<string | null>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const types = data?.types ?? [];
  const totalTypes = data?.totalTypes ?? 0;
  const typesWithFiles = data?.typesWithFiles ?? 0;
  const completionPct = totalTypes > 0 ? Math.round((typesWithFiles / totalTypes) * 100) : 0;

  const handleToggleType = (code: string) => {
    setExpandedTypes(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleExpandAll = () => setExpandedTypes(new Set(types.map(ty => ty.code)));
  const handleCollapseAll = () => setExpandedTypes(new Set());

  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) return uploadSessionIdRef.current;
    if (sessionPromiseRef.current) return sessionPromiseRef.current;

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(err => {
        sessionPromiseRef.current = null;
        throw err;
      });

    return sessionPromiseRef.current;
  }, []);

  const handleAttachClick = (code: string) => {
    pendingTypeCodeRef.current = code;
    fileInputRef.current?.click();
  };

  const handleFilesSelected = useCallback(
    async (fileList: FileList) => {
      const code = pendingTypeCodeRef.current;
      if (!code || !appraisalId) return;

      const files = Array.from(fileList);
      const validFiles = files.filter(isAllowedChecklistFile);
      const invalidCount = files.length - validFiles.length;

      if (invalidCount > 0) {
        toast.error(t('toasts.invalidDocumentFileType'));
      }
      if (validFiles.length === 0) return;

      let successCount = 0;
      for (const file of validFiles) {
        try {
          const sessionId = await getOrCreateSession();
          const uploadResult = await uploadDocument({
            uploadSessionId: sessionId,
            file,
            documentType: code,
            documentCategory: VAL_DOC_CATEGORY,
          });

          await attachDocument.mutateAsync({
            appraisalId,
            body: {
              documentTypeCode: code,
              documentId: uploadResult.documentId,
              fileName: file.name,
              mimeType: file.type || null,
              fileSizeBytes: file.size,
              uploadedByName: currentUser?.name ?? null,
            },
          });
          successCount += 1;
        } catch (err) {
          console.error('Checklist document attach failed:', err);
          toast.error(t('toasts.fileUploadFailed'));
        }
      }

      if (successCount > 0) {
        toast.success(t('toasts.filesUploaded'));
      }
    },
    [appraisalId, attachDocument, currentUser, getOrCreateSession, t, uploadDocument],
  );

  const handleView = (file: AppraisalDocumentFile) => {
    if (!file.documentId) return;
    viewDocument(file.documentId);
  };

  const handleRemoveClick = (file: AppraisalDocumentFile) => {
    setDeleteConfirm({ id: file.id, fileName: file.fileName ?? null });
  };

  // System-generated report types (category VAL_REPORT) — enqueues the real async report job
  // and opens the resulting PDF in a new tab (autoOpen: true), same as ReportPreviewTab's
  // "Generate final PDF" button.
  const handleGenerateReport = (code: string) => {
    if (!appraisalId) return;
    const reportTypeKey = REPORT_TYPE_BY_CODE[code];
    if (!reportTypeKey) return;
    void triggerReportJob(reportTypeKey, appraisalId, { autoOpen: true });
  };

  const handleConfirmRemove = () => {
    if (!appraisalId || !deleteConfirm) return;
    removeDocument.mutate(
      { appraisalId, id: deleteConfirm.id },
      {
        onSuccess: () => {
          toast.success(t('toasts.documentRemoved'));
          setDeleteConfirm(null);
        },
        onError: () => toast.error(t('toasts.documentRemoveFailed')),
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <DataErrorState
        variant="inline"
        title={t('valuationDocuments.loadFailed')}
        message={(error as Error)?.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Board header */}
      <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Icon name="file-lines" className="text-gray-400" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('valuationDocuments.boardTitle')}
            </h3>
            <span className="text-xs text-gray-400">{t('valuationDocuments.typesCount', { count: totalTypes })}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 min-w-[160px]">
              <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all duration-300',
                    completionPct === 100 ? 'bg-green-500' : 'bg-primary',
                  )}
                  style={{ width: `${completionPct}%` }}
                />
              </div>
              <span className="text-xs text-gray-500 whitespace-nowrap">
                {t('valuationDocuments.progress', { uploaded: typesWithFiles, total: totalTypes })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
              >
                {t('valuationDocuments.expandAll')}
              </button>
              <button
                type="button"
                onClick={handleCollapseAll}
                className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-800 hover:bg-white/50 rounded-lg transition-colors"
              >
                {t('valuationDocuments.collapseAll')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accordion rows */}
      <div className="divide-y divide-gray-100">
        {types.map((type: AppraisalDocumentType) => {
          const isExpanded = expandedTypes.has(type.code);
          // Show one locale-appropriate name only — no code alongside it.
          const displayName = i18n.language.startsWith('th') ? (type.nameTh ?? type.name) : type.name;
          return (
            <div key={type.code}>
              <div
                className={clsx(
                  'px-6 py-3.5 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors',
                  isExpanded && 'bg-gray-50/50',
                )}
                onClick={() => handleToggleType(type.code)}
              >
                <Icon
                  name={isExpanded ? 'chevron-down' : 'chevron-right'}
                  className="text-gray-400 text-sm transition-transform flex-shrink-0"
                />
                <div className="min-w-0 flex-1 flex items-baseline gap-2">
                  <span className="text-sm font-medium text-gray-900 truncate">{displayName}</span>
                </div>
                <TypeBadge count={type.totalFiles} t={t} />
              </div>

              {isExpanded && (
                <div className="px-6 pb-4 pl-[3.25rem]">
                  <div className="flex flex-col gap-2">
                    {type.files.length > 0 && (
                      <div className="border border-gray-100 rounded-lg divide-y divide-gray-100 overflow-hidden">
                        {type.files.map(file => (
                          <div key={file.id} className="px-3 py-2.5 hover:bg-gray-50/60 transition-colors">
                            <DocumentFileRow
                              fileName={file.fileName}
                              documentId={file.documentId}
                              mimeType={file.mimeType}
                              fileSizeBytes={file.fileSizeBytes}
                              uploadedAt={file.uploadedAt}
                              uploadedBy={file.uploadedBy}
                              uploadedByName={file.uploadedByName}
                              onView={() => handleView(file)}
                              t={t}
                              actions={
                                <ActionDropdown
                                  onView={() => handleView(file)}
                                  onDelete={() => handleRemoveClick(file)}
                                  isEditable={!readOnly}
                                />
                              }
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleAttachClick(type.code)}
                          className="inline-flex items-center gap-1.5 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 hover:border-primary transition-colors"
                        >
                          <Icon name="plus" className="text-xs" />
                          {t('valuationDocuments.attach')}
                        </button>
                      )}
                      {type.category === VAL_REPORT_CATEGORY && REPORT_TYPE_BY_CODE[type.code] && (
                        <button
                          type="button"
                          onClick={() => handleGenerateReport(type.code)}
                          disabled={!appraisalId}
                          className="inline-flex items-center gap-1.5 border border-primary/30 rounded-lg px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Icon name="file-export" className="text-xs" />
                          {t('valuationDocuments.generate')}
                        </button>
                      )}
                    </div>
                    {readOnly && type.files.length === 0 && (
                      <p className="text-xs text-gray-400 italic py-2">{t('valuationDocuments.empty')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {types.length === 0 && (
          <div className="px-6 py-8 text-center text-sm text-gray-400">
            {t('valuationDocuments.noTypes')}
          </div>
        )}
      </div>

      {/* Hidden file input, shared across rows via pendingTypeCodeRef */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        multiple
        onClick={e => {
          (e.target as HTMLInputElement).value = '';
        }}
        onChange={e => {
          if (e.target.files) void handleFilesSelected(e.target.files);
        }}
        className="hidden"
      />

      {/* Remove confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmRemove}
        title={t('valuationDocuments.deleteDialog.title')}
        message={t('valuationDocuments.deleteDialog.message')}
        confirmText={t('valuationDocuments.deleteDialog.confirm')}
        variant="danger"
        isLoading={removeDocument.isPending}
      />
    </section>
  );
};

export default ValuationDocumentChecklist;

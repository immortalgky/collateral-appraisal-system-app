import { useCallback, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import DataErrorState from '@/shared/components/DataErrorState';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useAppraisalContext } from '../../context/AppraisalContext';
import DocumentListView from '@/features/request/components/documentCard/DocumentListView';
import type { TypeRow } from '@/features/request/utils/documentList';
import {
  useAttachAppraisalDocument,
  useGetAppraisalDocuments,
  useRemoveAppraisalDocument,
  useUpdateAppraisalDocumentNotes,
} from '@features/appraisal/api';
import {
  createUploadSession,
  useUploadDocument,
  useViewDocument,
} from '@features/request/api/documents';
import { useAsyncReportJob } from '@features/reportGeneration/hooks/useAsyncReportJob';
import { useAuthStore } from '@features/auth/store';
import type { UploadedDocument } from '@/features/request/types/document';
import { valuationSection } from '../../utils/checklistDocuments';
import {
  documentTypeName,
  isAllowedValuationDocumentFile,
  VAL_DOC_CATEGORY,
  VALUATION_DOCUMENT_ACCEPT,
} from '../../utils/valuationDocuments';

const VAL_REPORT_CATEGORY = 'VAL_REPORT';

// System-generated report types available from the checklist — code → report job key.
// appraisal-summary is a composite report; the job itself handles combining D042/D043.
const REPORT_TYPE_BY_CODE: Record<string, string> = {
  D001: 'appraisal-book',
  D042: 'appraisal-summary',
  D043: 'appraisal-summary',
};

/** `allowGenerate` is false where the list is only a reference (the embedded checklist). */
export const ValuationDocumentChecklist = ({
  allowGenerate = true,
}: {
  allowGenerate?: boolean;
}) => {
  const readOnly = usePageReadOnly();
  const { t, i18n } = useTranslation('appraisal');
  const { t: tCommon } = useTranslation('common');
  const { appraisal } = useAppraisalContext();
  const appraisalId = appraisal?.appraisalId;
  const currentUser = useAuthStore(state => state.user);

  const { data, isLoading, isError, error, refetch } = useGetAppraisalDocuments(appraisalId);

  const attachDocument = useAttachAppraisalDocument();
  const removeDocument = useRemoveAppraisalDocument();
  const updateNotes = useUpdateAppraisalDocumentNotes();
  const { mutateAsync: uploadDocument } = useUploadDocument();
  const viewDocument = useViewDocument();
  const { trigger: triggerReportJob } = useAsyncReportJob();

  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    fileName: string | null;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingTypeCodeRef = useRef<string | null>(null);
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  const types = useMemo(() => data?.types ?? [], [data]);
  const typeByCode = useMemo(() => new Map(types.map(type => [type.code, type])), [types]);
  const sections = useMemo(
    () =>
      types.length > 0
        ? [valuationSection(types, i18n.language, t('valuationDocuments.boardTitle'))]
        : [],
    [types, i18n.language, t],
  );

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
      const validFiles = files.filter(isAllowedValuationDocumentFile);
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

  const handleView = (doc: UploadedDocument) => {
    if (!doc.documentId) return;
    // The size decides whether this opens inline or downloads — see MAX_INLINE_VIEW_BYTES.
    viewDocument(doc.documentId, doc.fileSizeBytes, doc.fileName);
  };

  const handleSaveNotes = (doc: UploadedDocument, notes: string) => {
    if (!appraisalId || !doc.id) return;
    updateNotes.mutate(
      { appraisalId, id: doc.id, body: { notes: notes.trim() || null } },
      {
        onSuccess: () => toast.success(t('valuationDocuments.checklist.noteSaved')),
        onError: () => toast.error(t('valuationDocuments.checklist.noteSaveFailed')),
      },
    );
  };

  // System-generated report types (category VAL_REPORT) — enqueues the real async report job
  // and opens the resulting PDF in a new tab (autoOpen: true), same as ReportPreviewTab's
  // "Generate final PDF" button.
  const handleGenerateReport = (row: TypeRow) => {
    if (!appraisalId) return;
    const reportTypeKey = REPORT_TYPE_BY_CODE[row.documentType];
    if (!reportTypeKey) return;
    void triggerReportJob(reportTypeKey, appraisalId, { autoOpen: true });
  };

  const canGenerate = (row: TypeRow) =>
    typeByCode.get(row.documentType)?.category === VAL_REPORT_CATEGORY &&
    !!REPORT_TYPE_BY_CODE[row.documentType];

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
    <>
      <DocumentListView
        title={t('valuationDocuments.boardTitle')}
        icon="file-lines"
        sections={sections}
        typeName={(code, displayName) => {
          const type = typeByCode.get(code);
          return type ? documentTypeName(type, i18n.language) : displayName || code;
        }}
        editable={!readOnly}
        onView={handleView}
        onUpload={readOnly ? undefined : row => handleAttachClick(row.documentType)}
        onSaveNotes={readOnly ? undefined : handleSaveNotes}
        onRemove={
          readOnly
            ? undefined
            : doc => {
                if (doc.id) setDeleteConfirm({ id: doc.id, fileName: doc.fileName });
              }
        }
        onGenerate={allowGenerate ? handleGenerateReport : undefined}
        canGenerate={canGenerate}
        headerExtra={
          <span>
            {t('valuationDocuments.checklist.typesWithFiles', {
              done: data?.typesWithFiles ?? 0,
              total: data?.totalTypes ?? 0,
            })}
          </span>
        }
        flat
        allTypesToggleKey="appraisal.documentChecklist.valuationAllTypes"
        showSource={false}
        emptyLabel={t('valuationDocuments.checklist.valuationEmpty')}
      />

      {/* Hidden file input, shared across rows via pendingTypeCodeRef (nothing to attach read-only) */}
      {!readOnly && (
        <input
          ref={fileInputRef}
          type="file"
          accept={VALUATION_DOCUMENT_ACCEPT}
          multiple
          onClick={e => {
            (e.target as HTMLInputElement).value = '';
          }}
          onChange={e => {
            if (e.target.files) void handleFilesSelected(e.target.files);
          }}
          className="hidden"
        />
      )}

      {/* Remove confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmRemove}
        title={t('valuationDocuments.deleteDialog.title')}
        message={t('valuationDocuments.deleteDialog.message')}
        confirmText={t('valuationDocuments.deleteDialog.confirm')}
        cancelText={tCommon('actions.cancel')}
        variant="danger"
        isLoading={removeDocument.isPending}
      />
    </>
  );
};

export default ValuationDocumentChecklist;

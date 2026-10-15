import { useId, useRef, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Dropdown from '@/shared/components/inputs/Dropdown';
import UploadArea from '@/shared/components/inputs/UploadArea';
import Textarea from '@/shared/components/inputs/Textarea';
import { createUploadSession, useUploadDocument } from '@/features/request/api/documents';
import type {
  AppraisalDocumentFile,
  AppraisalDocumentType,
} from '@/features/appraisal/types/appraisalDocuments';
import {
  useCorrectAppraisalDocuments,
  useNotifyExternalSystem,
  useRegenerateAppraisalSummary,
} from '../api/appraisalDataCorrection';
import {
  documentTypeName,
  isAllowedValuationDocumentFile,
  VAL_DOC_CATEGORY,
  VALUATION_DOCUMENT_ACCEPT,
} from '@/features/appraisal/utils/valuationDocuments';
import { readApiError } from '../utils/readApiError';

const MAX_REASON_LENGTH = 4000;

export type DocumentDialogState =
  | { kind: 'attach'; typeCode: string }
  | { kind: 'replace'; typeCode: string; file: AppraisalDocumentFile }
  | { kind: 'delete'; typeCode: string; file: AppraisalDocumentFile }
  | { kind: 'regenerate' }
  | { kind: 'notify' };

interface DocumentActionDialogProps {
  appraisalId: string;
  state: DocumentDialogState;
  types: AppraisalDocumentType[];
  /** Name of the external system that raised the request; null when it was created here. */
  externalSystem: string | null;
  onClose: () => void;
  /**
   * The regeneration request was accepted (202); the caller starts waiting for the new file.
   * `notifyExternal` is what was sent, so the caller can say whether the source system was told.
   */
  onRegenerated: (notifyExternal: boolean) => void;
}

/**
 * One dialog for the five document actions — attach, replace, delete, regenerate summary, notify
 * the source system. They differ only in which of type / file / callouts they show; the reason is
 * required in all of them. Mount it per open (`state` is not watched for change) so the fields
 * start empty.
 */
const DocumentActionDialog = ({
  appraisalId,
  state,
  types,
  externalSystem,
  onClose,
  onRegenerated,
}: DocumentActionDialogProps) => {
  const { t, i18n } = useTranslation('appraisalDataCorrection');
  const id = useId();
  const correct = useCorrectAppraisalDocuments();
  const regenerate = useRegenerateAppraisalSummary();
  const notify = useNotifyExternalSystem();
  const { mutateAsync: uploadDocument } = useUploadDocument();

  const [typeCode, setTypeCode] = useState(state.kind === 'attach' ? state.typeCode : '');
  const [file, setFile] = useState<File | null>(null);
  const [reason, setReason] = useState('');
  // Checked by default: regenerating exists to make the source system collect the new report.
  const [notifyExternal, setNotifyExternal] = useState(true);
  const [uploading, setUploading] = useState(false);
  // Errors stay hidden until the first submit so an untouched form does not open in red.
  const [submitted, setSubmitted] = useState(false);
  // `busy` lags a tick between the upload finishing and the mutation reporting pending; this ref
  // closes that gap so a double click cannot upload and attach the same file twice.
  const inFlight = useRef(false);
  // A retry after the correction call failed re-links the file already uploaded instead of
  // uploading it again and leaving the first copy orphaned in the document store.
  const uploaded = useRef<{ file: File; code: string; documentId: string } | null>(null);

  const needsFile = state.kind === 'attach' || state.kind === 'replace';
  const busy = uploading || correct.isPending || regenerate.isPending || notify.isPending;
  const reasonMissing = submitted && !reason.trim();
  const fileInvalid = submitted && needsFile && (!file || !isAllowedValuationDocumentFile(file));
  const system = externalSystem ?? '';

  const copy = {
    attach: {
      title: t('documents.dialog.attach.title'),
      submit: t('documents.dialog.attach.submit'),
    },
    replace: {
      title: t('documents.dialog.replace.title'),
      submit: t('documents.dialog.replace.submit'),
    },
    delete: {
      title: t('documents.dialog.delete.title'),
      submit: t('documents.dialog.delete.submit'),
    },
    regenerate: {
      title: t('documents.dialog.regenerate.title'),
      submit: t('documents.dialog.regenerate.submit'),
    },
    notify: {
      title: t('documents.dialog.notify.title', { system }),
      submit: t('documents.dialog.notify.submit', { system }),
    },
  }[state.kind];

  const rowTypeCode = state.kind === 'replace' || state.kind === 'delete' ? state.typeCode : null;
  const rowType = types.find(ty => ty.code === rowTypeCode);

  const showError = (error: unknown, fallback: string) => {
    const { errorCode, detail } = readApiError(error as Error);
    toast.error(
      errorCode === 'APPRAISAL_NOT_COMPLETED'
        ? t('detail.appraisalNotCompleted')
        : errorCode === 'NO_EXTERNAL_SOURCE'
          ? t('documents.toast.noExternalSource')
          : detail || fallback,
    );
  };

  // Upload first: the correction endpoint links an existing document, it does not accept bytes.
  const upload = async (target: File, code: string) => {
    const { sessionId } = await createUploadSession();
    const result = await uploadDocument({
      uploadSessionId: sessionId,
      file: target,
      documentType: code,
      documentCategory: VAL_DOC_CATEGORY,
    });
    return result.documentId;
  };

  const submitRegenerate = async (trimmedReason: string) => {
    // Without a source system there is nothing to notify, whatever the checkbox last held.
    const shouldNotify = !!externalSystem && notifyExternal;
    try {
      await regenerate.mutateAsync({
        appraisalId,
        reason: trimmedReason,
        notifyExternal: shouldNotify,
      });
    } catch (error) {
      showError(error, t('documents.toast.regenerateFailed'));
      return;
    }
    toast(t('documents.toast.regenerateQueued'));
    onRegenerated(shouldNotify);
    onClose();
  };

  const submitNotify = async (trimmedReason: string) => {
    try {
      await notify.mutateAsync({ appraisalId, reason: trimmedReason });
    } catch (error) {
      showError(error, t('documents.toast.notifyFailed'));
      return;
    }
    toast.success(t('documents.toast.notified', { system }));
    onClose();
  };

  const submitCorrection = async (trimmedReason: string) => {
    if (state.kind === 'regenerate' || state.kind === 'notify') return;
    const addCode = state.kind === 'attach' ? typeCode : state.typeCode;

    let documentId: string | null = null;
    if (needsFile && file && uploaded.current?.file === file && uploaded.current.code === addCode) {
      documentId = uploaded.current.documentId;
    } else if (needsFile && file) {
      setUploading(true);
      try {
        documentId = await upload(file, addCode);
        uploaded.current = { file, code: addCode, documentId };
      } catch (error) {
        console.error('Document correction upload failed:', error);
        // The upload hook puts the reason (file too large, screen closed) in apiError.detail.
        showError(error, t('documents.toast.uploadFailed'));
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      await correct.mutateAsync({
        appraisalId,
        data: {
          reason: trimmedReason,
          removeId: state.kind === 'attach' ? null : state.file.id,
          add: documentId ? { documentTypeCode: addCode, documentId } : null,
        },
      });
    } catch (error) {
      showError(error, t('documents.toast.correctionFailed'));
      return;
    }
    toast.success(
      state.kind === 'attach'
        ? t('documents.toast.attached')
        : state.kind === 'replace'
          ? t('documents.toast.replaced')
          : t('documents.toast.deleted'),
    );
    onClose();
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const trimmedReason = reason.trim();
    if (!trimmedReason) return;
    if (needsFile && (!file || !isAllowedValuationDocumentFile(file))) return;
    if (state.kind === 'attach' && !typeCode) return;
    if (inFlight.current) return;

    inFlight.current = true;
    void (
      state.kind === 'regenerate'
        ? submitRegenerate(trimmedReason)
        : state.kind === 'notify'
          ? submitNotify(trimmedReason)
          : submitCorrection(trimmedReason)
    ).finally(() => {
      inFlight.current = false;
    });
  };

  const handleClose = () => {
    if (!busy) onClose();
  };

  return (
    <Modal isOpen onClose={handleClose} title={copy.title} size="md">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {state.kind === 'regenerate' && (
          <>
            <p className="text-sm text-gray-600">{t('documents.dialog.regenerate.intro')}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>{t('documents.dialog.regenerate.useWhen1')}</li>
              <li>{t('documents.dialog.regenerate.useWhen2')}</li>
            </ul>
          </>
        )}

        {state.kind === 'notify' && (
          <>
            <p className="text-sm text-gray-600">
              {t('documents.dialog.notify.intro', { system })}
            </p>
            <p className="text-xs text-gray-500">{t('documents.dialog.notify.note')}</p>
          </>
        )}

        {state.kind === 'attach' && (
          <Dropdown
            label={t('documents.dialog.typeLabel')}
            required
            value={typeCode}
            onChange={(value: string) => setTypeCode(value)}
            options={types.map(ty => ({
              value: ty.code,
              label: documentTypeName(ty, i18n.language),
            }))}
            // Codes (D005…) mean nothing to the admin; show the type name only.
            showValuePrefix={false}
          />
        )}

        {(state.kind === 'replace' || state.kind === 'delete') && (
          <div className="space-y-1 rounded-lg bg-gray-50 px-3 py-2 text-xs">
            <div className="text-gray-500">
              {rowType ? documentTypeName(rowType, i18n.language) : state.typeCode}
            </div>
            <div
              className={
                state.kind === 'replace'
                  ? 'text-gray-400 line-through'
                  : 'font-medium text-gray-900'
              }
            >
              {state.file.fileName}
            </div>
          </div>
        )}

        {state.kind === 'delete' && (
          <div className="flex gap-2.5 rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
            <Icon style="solid" name="triangle-exclamation" className="mt-0.5 size-4 shrink-0" />
            <p>{t('documents.dialog.delete.warning')}</p>
          </div>
        )}

        {needsFile && (
          <div>
            <p className="block text-sm font-medium text-gray-700 mb-1">
              {t('documents.dialog.fileLabel')} <span className="text-danger">*</span>
            </p>
            <UploadArea
              accept={VALUATION_DOCUMENT_ACCEPT}
              supportedText="JPG, PNG, PDF"
              disabled={busy}
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
            {file && (
              <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <Icon style="solid" name="file" className="size-4 shrink-0 text-gray-400" />
                <span className="min-w-0 truncate">{file.name}</span>
              </div>
            )}
            {fileInvalid && (
              <p className="mt-1 text-xs text-red-600">{t('documents.dialog.fileInvalid')}</p>
            )}
          </div>
        )}

        <Textarea
          id={`${id}-reason`}
          label={t('documents.dialog.reasonLabel')}
          required
          rows={3}
          maxLength={MAX_REASON_LENGTH}
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder={t('documents.dialog.reasonPlaceholder')}
          error={reasonMissing ? t('documents.dialog.reasonRequired') : undefined}
        />

        {state.kind === 'replace' && (
          <p className="text-sm text-gray-600">{t('documents.dialog.replace.note')}</p>
        )}

        {state.kind === 'regenerate' &&
          (externalSystem ? (
            <div className="flex items-start gap-2 text-sm text-gray-700">
              <input
                id={`${id}-notify`}
                type="checkbox"
                checked={notifyExternal}
                onChange={e => setNotifyExternal(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600"
              />
              <div>
                <label htmlFor={`${id}-notify`} className="font-medium">
                  {t('documents.dialog.regenerate.notifyLabel', { system })}
                </label>
                <p className="text-xs text-gray-500">
                  {t('documents.dialog.regenerate.notifyHint', { system })}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t('documents.dialog.regenerate.noSource')}</p>
          ))}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={handleClose} disabled={busy}>
            {t('documents.dialog.cancel')}
          </Button>
          <Button
            variant={state.kind === 'delete' ? 'danger' : 'primary'}
            type="submit"
            isLoading={busy}
          >
            {copy.submit}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default DocumentActionDialog;

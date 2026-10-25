import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FileInput from '@/shared/components/inputs/FileInput';
import { fileTypeIcon } from '@/shared/utils/fileTypeIcon';
import { useDownloadDocument, useViewDocument } from '@/features/request/api/documents';
import {
  useGetMeetingDocuments,
  useGenerateMeetingDocument,
  useRemoveMeetingDocument,
} from '../api/meetings';
import { useMeetingDocumentUpload } from '../hooks/useMeetingDocumentUpload';
import type { MeetingDocumentDto } from '../api/types';

const formatCreated = (iso?: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export interface PickedDocument {
  id: string;
  name: string;
}

interface MeetingDocumentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  /**
   * Selection mode: adds a checkbox column + Confirm footer so the modal can be used
   * as an attachment picker. Without it, it's the full document-management modal.
   */
  selectable?: boolean;
  /** Initially selected document ids (selectable mode). */
  selectedIds?: string[];
  /** Called with the picked documents on Confirm (selectable mode). */
  onConfirm?: (selected: PickedDocument[]) => void;
}

const MeetingDocumentsDialog = ({
  isOpen,
  onClose,
  meetingId,
  selectable = false,
  selectedIds = [],
  onConfirm,
}: MeetingDocumentsDialogProps) => {
  const { t } = useTranslation('meeting');
  const { data: documents = [], isLoading } = useGetMeetingDocuments(
    isOpen ? meetingId : undefined,
  );
  const generate = useGenerateMeetingDocument();
  const removeDocument = useRemoveMeetingDocument();
  const download = useDownloadDocument();
  const viewDocument = useViewDocument();
  const { uploading, uploadAndLink } = useMeetingDocumentUpload(meetingId);

  const [checked, setChecked] = useState<Set<string>>(() => new Set(selectedIds));

  useEffect(() => {
    if (isOpen) setChecked(new Set(selectedIds));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (docId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleDownload = (doc: MeetingDocumentDto) => {
    download.mutate(doc.documentId, {
      onSuccess: ({ blob, fileName }) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName ?? doc.fileName;
        a.click();
        URL.revokeObjectURL(url);
      },
      onError: () => toast.error(t('documents.downloadFailed')),
    });
  };

  const handleRemove = (doc: MeetingDocumentDto) => {
    removeDocument.mutate(
      { meetingId, documentId: doc.documentId },
      {
        onSuccess: () => {
          toast.success(t('documents.removed'));
          setChecked(prev => {
            const next = new Set(prev);
            next.delete(doc.documentId);
            return next;
          });
        },
        onError: () => toast.error(t('documents.removeFailed')),
      },
    );
  };

  const handleGenerate = (documentType: 'Invitation' | 'Minute') => {
    generate.mutate(
      { meetingId, body: { documentType } },
      {
        onSuccess: doc => {
          toast.success(t('documents.generated'));
          // Auto-select the freshly generated doc when picking attachments.
          if (selectable) setChecked(prev => new Set([...prev, doc.documentId]));
        },
        onError: () => toast.error(t('documents.generateFailed')),
      },
    );
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const linked = await uploadAndLink(e);
    if (linked && selectable) setChecked(prev => new Set([...prev, linked.documentId]));
  };

  const handleConfirm = () => {
    const picked = documents
      .filter(d => checked.has(d.documentId))
      .map(d => ({ id: d.documentId, name: d.fileName }));
    onConfirm?.(picked);
    onClose();
  };

  const isBusy = generate.isPending || uploading;

  // Oldest first; documents without a createdAt sort last.
  const sortedDocuments = [...documents].sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : Infinity;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : Infinity;
    return ta - tb;
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={selectable ? t('documents.pickerTitle') : t('documents.title')}
      size="2xl"
    >
      <div className="flex flex-col gap-4">
        {/* Generate / upload actions */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-(--palette-gray-600)">
            {t('documents.generate')}:
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            isLoading={generate.isPending && generate.variables?.body.documentType === 'Invitation'}
            onClick={() => handleGenerate('Invitation')}
            leftIcon={<Icon name="file-pdf" style="solid" className="size-3.5 text-red-500" />}
          >
            {t('documents.invitation')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            isLoading={generate.isPending && generate.variables?.body.documentType === 'Minute'}
            onClick={() => handleGenerate('Minute')}
            leftIcon={
              <Icon
                name="file-lines"
                style="solid"
                className="size-3.5 text-blue-600 dark:text-blue-400"
              />
            }
          >
            {t('documents.minutes')}
          </Button>

          <div className="ml-auto">
            <FileInput
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={handleUpload}
              disabled={isBusy}
              multiple={false}
            >
              {isDragging => (
                <span
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    isDragging
                      ? 'border-primary bg-primary/5 text-(--palette-primary-text)'
                      : 'border-(--palette-line-strong) text-(--palette-ink) hover:bg-(--palette-surface-2)',
                    isBusy ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  {uploading ? (
                    <Icon name="spinner" style="solid" className="size-3.5 animate-spin" />
                  ) : (
                    <Icon name="arrow-up-from-bracket" style="solid" className="size-3.5" />
                  )}
                  {t('documents.uploadNew')}
                </span>
              )}
            </FileInput>
          </div>
        </div>

        {selectable && (
          <p className="-mt-1 text-sm text-(--palette-gray-500)">{t('documents.pickerHint')}</p>
        )}

        {/* Document list */}
        <div className="overflow-hidden rounded-xl border border-(--palette-line)">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-(--palette-gray-400)">
              <Icon name="spinner" style="solid" className="mr-2 size-5 animate-spin" />
              <span className="text-sm">{t('documents.loading')}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-(--palette-surface-3)">
                <Icon name="file" style="regular" className="size-5 text-(--palette-gray-400)" />
              </div>
              <span className="text-sm text-(--palette-gray-500)">{t('documents.empty')}</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-(--palette-line) bg-(--palette-surface-2)/70">
                <tr className="text-xs tracking-wide text-(--palette-gray-500)">
                  {selectable && <th className="text-xs w-10 py-2.5 pl-4 font-semibold" />}
                  <th className="text-xs px-4 py-2.5 text-left font-semibold">
                    {t('documents.colFileName')}
                  </th>
                  <th className="text-xs px-4 py-2.5 text-center font-semibold">
                    {t('documents.colType')}
                  </th>
                  <th className="text-xs px-4 py-2.5 text-center font-semibold">
                    {t('documents.colSource')}
                  </th>
                  <th className="text-xs px-4 py-2.5 text-left font-semibold">
                    {t('documents.colCreated')}
                  </th>
                  <th className="text-xs px-4 py-2.5 text-center font-semibold">
                    {t('documents.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--palette-line-soft)">
                {sortedDocuments.map(doc => {
                  const icon = fileTypeIcon(doc.fileName);
                  const isChecked = checked.has(doc.documentId);
                  return (
                    <tr
                      key={doc.id}
                      className={clsx(
                        'transition-colors',
                        selectable && isChecked ? 'bg-primary/5' : 'hover:bg-(--palette-surface-2)',
                      )}
                    >
                      {selectable && (
                        <td className="py-3 pl-4">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggle(doc.documentId)}
                            className="size-4 rounded border-(--palette-line-strong) text-(--palette-primary-text) focus:ring-primary/40"
                            aria-label={`Select ${doc.fileName}`}
                          />
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Icon
                            name={icon.name}
                            style="solid"
                            className={clsx('size-5 shrink-0', icon.className)}
                          />
                          <span className="block max-w-[220px] truncate font-medium text-(--palette-ink)">
                            {doc.fileName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-(--palette-gray-600)">
                        {doc.documentType}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={clsx(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            doc.source === 'Generated'
                              ? 'bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-300'
                              : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
                          )}
                        >
                          {doc.source}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-(--palette-gray-500)">
                        {formatCreated(doc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              viewDocument(doc.documentId, doc.fileSizeBytes, doc.fileName)
                            }
                            className="rounded-md p-1.5 text-(--palette-gray-400) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-primary-text)"
                            title={t('documents.view')}
                          >
                            <Icon name="eye" style="solid" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownload(doc)}
                            className="rounded-md p-1.5 text-(--palette-gray-400) transition-colors hover:bg-(--palette-surface-3) hover:text-(--palette-primary-text)"
                            title={t('documents.download')}
                          >
                            <Icon name="download" style="solid" className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemove(doc)}
                            disabled={removeDocument.isPending}
                            className="rounded-md p-1.5 text-(--palette-gray-400) transition-colors hover:bg-(--palette-req-wash) hover:text-(--palette-danger) disabled:opacity-40"
                            title={t('documents.remove')}
                          >
                            <Icon name="trash" style="solid" className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="-mx-6 -mb-4 mt-1 flex items-center justify-between border-t border-(--palette-line-soft) bg-(--palette-surface-2)/50 px-6 py-4">
          {selectable ? (
            <span className="text-xs font-medium text-(--palette-gray-400)">
              {t('documents.pickerSelected', { count: checked.size })}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              {t('buttons.cancel')}
            </Button>
            {selectable && (
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={isBusy || checked.size === 0}
              >
                {t('documents.pickerConfirm')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default MeetingDocumentsDialog;

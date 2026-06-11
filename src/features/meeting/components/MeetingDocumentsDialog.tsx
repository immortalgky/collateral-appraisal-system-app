import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FileInput from '@/shared/components/inputs/FileInput';
import { useDownloadDocument } from '@/features/request/api/documents';
import {
  useGetMeetingDocuments,
  useGenerateMeetingDocument,
  useRemoveMeetingDocument,
} from '../api/meetings';
import { useMeetingDocumentUpload } from '../hooks/useMeetingDocumentUpload';
import type { MeetingDocumentDto } from '../api/types';

interface MeetingDocumentsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
}

const MeetingDocumentsDialog = ({ isOpen, onClose, meetingId }: MeetingDocumentsDialogProps) => {
  const { t } = useTranslation('meeting');
  const { data: documents = [], isLoading } = useGetMeetingDocuments(isOpen ? meetingId : undefined);
  const generate = useGenerateMeetingDocument();
  const removeDocument = useRemoveMeetingDocument();
  const download = useDownloadDocument();
  const { uploading, uploadAndLink } = useMeetingDocumentUpload(meetingId);

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
        onSuccess: () => toast.success(t('documents.removed')),
        onError: () => toast.error(t('documents.removeFailed')),
      },
    );
  };

  const handleGenerate = (documentType: 'Invitation' | 'Minute') => {
    generate.mutate(
      { meetingId, body: { documentType } },
      {
        onSuccess: () => toast.success(t('documents.generated')),
        onError: () => toast.error(t('documents.generateFailed')),
      },
    );
  };

  const isBusy = generate.isPending || uploading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documents.title')} size="lg">
      <div className="flex flex-col gap-4">
        {/* Generate buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-600">{t('documents.generate')}:</span>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            isLoading={generate.isPending && generate.variables?.body.documentType === 'Invitation'}
            onClick={() => handleGenerate('Invitation')}
          >
            <Icon name="file-pdf" style="solid" className="size-3.5 mr-1.5" />
            {t('documents.invitation')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            isLoading={generate.isPending && generate.variables?.body.documentType === 'Minute'}
            onClick={() => handleGenerate('Minute')}
          >
            <Icon name="file-lines" style="solid" className="size-3.5 mr-1.5" />
            {t('documents.minutes')}
          </Button>

          <div className="ml-auto">
            <FileInput
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
              onChange={uploadAndLink}
              disabled={isBusy}
              multiple={false}
            >
              {(isDragging) => (
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors font-medium
                    ${isDragging ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-300 hover:bg-gray-50 text-gray-700'}
                    ${isBusy ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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

        {/* Document list */}
        <div className="border border-gray-200 rounded-md overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Icon name="spinner" style="solid" className="size-5 animate-spin mr-2" />
              <span className="text-sm">{t('documents.loading')}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex items-center justify-center py-10 text-gray-400">
              <Icon name="file" style="regular" className="size-5 mr-2" />
              <span className="text-sm">{t('documents.empty')}</span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('documents.colFileName')}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('documents.colType')}
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-gray-600">
                    {t('documents.colSource')}
                  </th>
                  <th className="px-4 py-2.5 text-right font-medium text-gray-600">
                    {t('documents.colActions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-gray-900 truncate max-w-[200px] block">
                        {doc.fileName}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {doc.documentType}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
                          ${doc.source === 'Generated' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}
                      >
                        {doc.source}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDownload(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
                          title={t('documents.download')}
                        >
                          <Icon name="arrow-down-to-bracket" style="solid" className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(doc)}
                          disabled={removeDocument.isPending}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors disabled:opacity-40"
                          title={t('documents.remove')}
                        >
                          <Icon name="trash" style="solid" className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex justify-end pt-1 border-t border-gray-100">
          <Button variant="ghost" onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default MeetingDocumentsDialog;

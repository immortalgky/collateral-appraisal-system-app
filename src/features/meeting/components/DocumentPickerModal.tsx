import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import FileInput from '@/shared/components/inputs/FileInput';
import { useGetMeetingDocuments } from '../api/meetings';
import { useMeetingDocumentUpload } from '../hooks/useMeetingDocumentUpload';
import type { MeetingDocumentDto } from '../api/types';

export interface PickedDocument {
  id: string;
  name: string;
}

interface DocumentPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  meetingId: string;
  /** Initially selected document ids */
  selectedIds?: string[];
  onConfirm: (selected: PickedDocument[]) => void;
}

const DocumentPickerModal = ({
  isOpen,
  onClose,
  meetingId,
  selectedIds = [],
  onConfirm,
}: DocumentPickerModalProps) => {
  const { t } = useTranslation('meeting');
  const { data: documents = [], isLoading } = useGetMeetingDocuments(isOpen ? meetingId : undefined);
  const { uploading, uploadAndLink } = useMeetingDocumentUpload(meetingId);

  const [checked, setChecked] = useState<Set<string>>(() => new Set(selectedIds));

  useEffect(() => {
    if (isOpen) setChecked(new Set(selectedIds));
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggle = (docId: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(docId)) next.delete(docId);
      else next.add(docId);
      return next;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const linked = await uploadAndLink(e);
    if (linked) {
      // auto-select the newly uploaded document
      setChecked(prev => new Set([...prev, linked.documentId]));
    }
  };

  const handleConfirm = () => {
    const picked = documents
      .filter((d: MeetingDocumentDto) => checked.has(d.documentId))
      .map((d: MeetingDocumentDto) => ({ id: d.documentId, name: d.fileName }));
    onConfirm(picked);
    onClose();
  };

  const isBusy = uploading;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('documents.pickerTitle')} size="md">
      <div className="flex flex-col gap-3">
        {/* Upload new */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">{t('documents.pickerHint')}</p>
          <FileInput
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            onChange={handleFileChange}
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

        {/* Document list */}
        <div className="border border-gray-200 rounded-md overflow-hidden max-h-72 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Icon name="spinner" style="solid" className="size-4 animate-spin mr-2" />
              <span className="text-sm">{t('documents.loading')}</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 gap-2">
              <Icon name="file" style="regular" className="size-6" />
              <span className="text-sm">{t('documents.empty')}</span>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {documents.map((doc: MeetingDocumentDto) => (
                <li key={doc.id}>
                  <label className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checked.has(doc.documentId)}
                      onChange={() => handleToggle(doc.documentId)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <Icon name="file" style="regular" className="size-4 text-gray-400 shrink-0" />
                    <span className="text-sm text-gray-900 flex-1 truncate">{doc.fileName}</span>
                    <span className="text-xs text-gray-400 shrink-0">{doc.documentType}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="text-xs text-gray-400">
          {t('documents.pickerSelected', { count: checked.size })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('buttons.cancel')}
          </Button>
          <Button size="sm" onClick={handleConfirm} disabled={isBusy}>
            {t('documents.pickerConfirm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentPickerModal;

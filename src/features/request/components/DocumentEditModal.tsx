import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Textarea from '@/shared/components/inputs/Textarea';
import type { UploadedDocument } from '../types/document';
import { useGetDocumentTypes, getDocumentTypeName } from '../api/documentTypes';

interface DocumentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: UploadedDocument;
  onSave: (updatedDocument: UploadedDocument) => void;
}

const DocumentEditModal: React.FunctionComponent<DocumentEditModalProps> = ({
  isOpen,
  onClose,
  document,
  onSave,
}) => {
  const { t } = useTranslation(['request', 'common']);
  const [notes, setNotes] = useState(document.notes || '');
  const { data: documentTypes = [] } = useGetDocumentTypes();

  const handleSave = () => {
    onSave({
      ...document,
      notes: notes.trim() || null,
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setNotes(document.notes || '');
    onClose();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={t('documentEdit.modalTitle')} size="md">
      <div className="space-y-4">
        {/* Read-only information */}
        <div className="bg-(--palette-surface-2) p-4 rounded-lg space-y-3">
          {/* File preview section */}
          <div className="flex items-center gap-3 pb-3 border-b border-(--palette-line)">
            {(() => {
              const extension = document.fileName?.split('.').pop()?.toLowerCase();
              if (extension === 'pdf') {
                return (
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-500/20 rounded-lg flex items-center justify-center">
                    <Icon
                      name="file-pdf"
                      style="solid"
                      className="w-6 h-6 text-(--palette-danger)"
                    />
                  </div>
                );
              }
              if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) {
                return (
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <Icon
                      name="file-image"
                      style="solid"
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
                    />
                  </div>
                );
              }
              return (
                <div className="w-12 h-12 bg-(--palette-surface-3) rounded-lg flex items-center justify-center">
                  <Icon name="file" style="solid" className="w-6 h-6 text-(--palette-gray-500)" />
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-(--palette-ink) truncate">
                {document.fileName}
              </p>
              <p className="text-xs text-(--palette-gray-500)">{formatDate(document.uploadedAt)}</p>
            </div>
          </div>

          {/* Document details */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-(--palette-gray-600) font-medium">
              {t('documentEdit.documentType')}
            </span>
            <span className="col-span-2 text-(--palette-ink)">
              {document.documentType
                ? getDocumentTypeName(documentTypes, document.documentType)
                : t('documentEdit.unknownType')}
            </span>
          </div>
          {document.uploadedByName && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-(--palette-gray-600) font-medium">
                {t('documentEdit.uploadedBy')}
              </span>
              <span className="col-span-2 text-(--palette-ink)">{document.uploadedByName}</span>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <Textarea
            id="notes"
            label={t('documentEdit.notes')}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder={t('documentEdit.notesPlaceholder')}
            maxLength={4000}
            showCharCount
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" onClick={handleSave}>
            {t('documentEdit.saveChanges')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentEditModal;

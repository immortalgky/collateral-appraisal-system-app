import { useState } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import type { UploadedDocument } from '../types/document';
import { getDocumentTypeInfo } from '../types/document';

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
  const [set, setSet] = useState(document.set ?? 1);
  const [notes, setNotes] = useState(document.documentDescription || '');

  const handleSave = () => {
    onSave({
      ...document,
      set,
      documentDescription: notes.trim() || null,
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setSet(document.set ?? 1);
    setNotes(document.documentDescription || '');
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
    <Modal isOpen={isOpen} onClose={handleCancel} title="Edit Document Details" size="md">
      <div className="space-y-4">
        {/* Read-only information */}
        <div className="bg-gray-50 p-4 rounded-lg space-y-3">
          {/* File preview section */}
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200">
            {(() => {
              const extension = document.fileName?.split('.').pop()?.toLowerCase();
              if (extension === 'pdf') {
                return (
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <Icon name="file-pdf" style="solid" className="w-6 h-6 text-red-600" />
                  </div>
                );
              }
              if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) {
                return (
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Icon name="file-image" style="solid" className="w-6 h-6 text-blue-600" />
                  </div>
                );
              }
              return (
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Icon name="file" style="solid" className="w-6 h-6 text-gray-500" />
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{document.fileName}</p>
              <p className="text-xs text-gray-500">{formatDate(document.uploadedAt)}</p>
            </div>
          </div>

          {/* Document details */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Document Type:</span>
            <span className="col-span-2 text-gray-900">
              {document.documentType
                ? getDocumentTypeInfo(document.documentType)?.displayName || document.documentType
                : 'Unknown'}
            </span>
          </div>
          {document.uploadedByName && (
            <div className="grid grid-cols-3 gap-2 text-sm">
              <span className="text-gray-600 font-medium">Uploaded By:</span>
              <span className="col-span-2 text-gray-900">{document.uploadedByName}</span>
            </div>
          )}
        </div>

        {/* Editable fields */}
        <div className="space-y-4">
          <div>
            <label htmlFor="set" className="block text-sm font-medium text-gray-700 mb-1">
              Set Number
            </label>
            <input
              id="set"
              type="number"
              min="1"
              value={set}
              onChange={e => setSet(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default DocumentEditModal;

import { useState } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import type { UploadedDocument } from '../types/document';

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
  const [set, setSet] = useState(document.set);
  const [comment, setComment] = useState(document.comment || '');

  const handleSave = () => {
    onSave({
      ...document,
      set,
      comment: comment.trim() || null,
    });
    onClose();
  };

  const handleCancel = () => {
    // Reset to original values
    setSet(document.set);
    setComment(document.comment || '');
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
        <div className="bg-gray-50 p-4 rounded-lg space-y-2">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Document Type:</span>
            <span className="col-span-2 text-gray-900">{document.docType}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-600 font-medium">File Name:</span>
            <span className="col-span-2 text-gray-900">{document.fileName}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <span className="text-gray-600 font-medium">Date Uploaded:</span>
            <span className="col-span-2 text-gray-900">{formatDate(document.uploadDate)}</span>
          </div>
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
            <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
              Comment
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={3}
              placeholder="Add a comment..."
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

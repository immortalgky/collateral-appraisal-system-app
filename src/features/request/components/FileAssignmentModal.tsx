import { useState, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import type { UploadDocumentResponse } from '../api';
import {
  MOCK_REQUEST_DOCUMENTS,
  MOCK_TITLE_DOCUMENTS,
  type DocumentTypeInfo,
} from '../types/document';

interface FileAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  uploadedFiles: (UploadDocumentResponse & { file: File })[];
  onAssign: (assignments: FileAssignment[]) => void;
}

interface FileAssignment {
  documentId: string;
  file: File;
  fileName: string;
  uploadDate: string;
  filePath: string;
  entityType: 'request' | 'title';
  entityIndex: number;
  docType: string;
  set: number;
  comment: string;
}

const FileAssignmentModal: React.FunctionComponent<FileAssignmentModalProps> = ({
  isOpen,
  onClose,
  uploadedFiles,
  onAssign,
}) => {
  const { watch } = useFormContext();
  const titles = watch('titles') || [];

  const [assignments, setAssignments] = useState<Record<string, Partial<FileAssignment>>>({});

  // Reset assignments when uploadedFiles changes
  useEffect(() => {
    if (uploadedFiles.length > 0) {
      const initialAssignments = uploadedFiles.reduce(
        (acc, file) => ({
          ...acc,
          [file.documentId]: {
            documentId: file.documentId,
            file: file.file,
            fileName: file.fileName,
            uploadDate: file.uploadDate,
            filePath: file.filePath,
            entityType: 'request' as const,
            entityIndex: -1,
            docType: MOCK_REQUEST_DOCUMENTS[0]?.type || '', // Default to first document type
            set: 1,
            comment: '',
          },
        }),
        {},
      );
      setAssignments(initialAssignments);
    }
  }, [uploadedFiles]);

  const updateAssignment = (
    documentId: string,
    field: keyof FileAssignment,
    value: string | number,
  ) => {
    setAssignments(prev => ({
      ...prev,
      [documentId]: {
        ...prev[documentId],
        [field]: value,
      },
    }));
  };

  const getAvailableDocumentTypes = (entityType: 'request' | 'title'): DocumentTypeInfo[] => {
    return entityType === 'request' ? MOCK_REQUEST_DOCUMENTS : MOCK_TITLE_DOCUMENTS;
  };

  const isValidAssignment = (assignment: Partial<FileAssignment>): assignment is FileAssignment => {
    return !!(
      assignment.documentId &&
      assignment.docType &&
      assignment.docType.trim() !== '' &&
      assignment.entityType !== undefined &&
      assignment.entityIndex !== undefined &&
      assignment.set &&
      assignment.set > 0 &&
      assignment.file &&
      assignment.fileName &&
      assignment.uploadDate
      // Note: filePath is not required here because in the new flow,
      // files haven't been uploaded yet when this validation runs
    );
  };

  const allAssigned = uploadedFiles.length > 0 && Object.values(assignments).every(isValidAssignment);

  const handleAssign = () => {
    const validAssignments = Object.values(assignments).filter(isValidAssignment);
    onAssign(validAssignments);
    onClose();
  };

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getFilePreview = (fileName: string, file?: File) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Show image thumbnail for image files
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '') && file) {
      const imageUrl = URL.createObjectURL(file);
      return (
        <img
          src={imageUrl}
          alt={fileName}
          className="w-12 h-12 object-cover rounded border border-gray-200"
          onLoad={() => URL.revokeObjectURL(imageUrl)}
        />
      );
    }

    if (extension === 'pdf') {
      return <Icon name="file-pdf" style="solid" className="w-10 h-10 text-red-500" />;
    }
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '')) {
      return <Icon name="file-image" style="solid" className="w-10 h-10 text-blue-500" />;
    }
    return <Icon name="file" style="solid" className="w-10 h-10 text-gray-500" />;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Assign Documents"
      size="2xl"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          Assign each uploaded file to a document slot. Select the entity and document type for
          each file.
        </p>

        {/* File list table */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  File
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Entity
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Document Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  <div className="flex items-center gap-1">
                    <span>Set</span>
                    <div className="group relative">
                      <Icon
                        name="circle-question"
                        style="regular"
                        className="w-3.5 h-3.5 text-gray-400 cursor-help"
                      />
                      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        Set number for multiple copies of the same document
                        <div className="absolute left-1/2 -translate-x-1/2 top-full border-4 border-transparent border-t-gray-800" />
                      </div>
                    </div>
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Comment
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {uploadedFiles.map(file => {
                const assignment = assignments[file.documentId];
                const availableTypes = getAvailableDocumentTypes(
                  assignment?.entityType || 'request',
                );

                return (
                  <tr key={file.documentId} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFilePreview(file.fileName, file.file)}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatFileSize(file.file.size)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={
                          assignment?.entityType === 'request'
                            ? 'request'
                            : `title-${assignment?.entityIndex}`
                        }
                        onChange={e => {
                          const value = e.target.value;
                          if (value === 'request') {
                            updateAssignment(file.documentId, 'entityType', 'request');
                            updateAssignment(file.documentId, 'entityIndex', -1);
                          } else {
                            const index = parseInt(value.split('-')[1]);
                            updateAssignment(file.documentId, 'entityType', 'title');
                            updateAssignment(file.documentId, 'entityIndex', index);
                          }
                          // Reset docType when entity changes
                          updateAssignment(file.documentId, 'docType', '');
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="request">Request</option>
                        {titles.map((_: any, index: number) => (
                          <option key={index} value={`title-${index}`}>
                            Title {index + 1}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={assignment?.docType || ''}
                        onChange={e => updateAssignment(file.documentId, 'docType', e.target.value)}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select type...</option>
                        {availableTypes.map(type => (
                          <option key={type.type} value={type.type}>
                            {type.displayName}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min="1"
                        value={assignment?.set || 1}
                        onChange={e =>
                          updateAssignment(file.documentId, 'set', parseInt(e.target.value) || 1)
                        }
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={assignment?.comment || ''}
                        onChange={e => updateAssignment(file.documentId, 'comment', e.target.value)}
                        placeholder="Optional"
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Warning if not all assigned */}
        {!allAssigned && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <Icon name="triangle-exclamation" style="solid" className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-yellow-800">
              Please select an entity and document type for all files.
            </span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAssign} disabled={!allAssigned}>
            Assign to Form
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FileAssignmentModal;

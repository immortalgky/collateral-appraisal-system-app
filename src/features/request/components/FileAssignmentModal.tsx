import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext } from 'react-hook-form';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import type { UploadDocumentResponse } from '../api';
import { useGetDocumentTypes } from '../api/documentTypes';

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
  comment: string;
}

const FileAssignmentModal: React.FunctionComponent<FileAssignmentModalProps> = ({
  isOpen,
  onClose,
  uploadedFiles,
  onAssign,
}) => {
  const { t } = useTranslation(['request', 'common']);
  const { watch } = useFormContext();
  const titles = watch('titles') || [];
  const requestNumber = watch('requestNumber');
  const { data: documentTypes = [], isLoading: isLoadingTypes } = useGetDocumentTypes();

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
            docType: '', // No default - user must select
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

  const getAvailableDocumentTypes = () => {
    return documentTypes;
  };

  const isValidAssignment = (assignment: Partial<FileAssignment>): assignment is FileAssignment => {
    return !!(
      (
        assignment.documentId &&
        assignment.docType &&
        assignment.docType.trim() !== '' &&
        assignment.entityType !== undefined &&
        assignment.entityIndex !== undefined &&
        assignment.file &&
        assignment.fileName &&
        assignment.uploadDate
      )
      // Note: filePath is not required here because in the new flow,
      // files haven't been uploaded yet when this validation runs
    );
  };

  const allAssigned =
    uploadedFiles.length > 0 && Object.values(assignments).every(isValidAssignment);

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
      title={t('fileAssignment.modalTitle')}
      size="2xl"
      showCloseButton={false}
    >
      <div className="space-y-4">
        <p className="text-sm text-gray-600">{t('fileAssignment.description')}</p>

        {/* File list table */}
        <div className="max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
          <table className="w-full">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  {t('fileAssignment.columnFile')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  {t('fileAssignment.columnEntity')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  {t('fileAssignment.columnDocumentType')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  {t('fileAssignment.columnNotes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {uploadedFiles.map(file => {
                const assignment = assignments[file.documentId];
                const availableTypes = getAvailableDocumentTypes();

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
                        <option value="request">{requestNumber || 'This request'}</option>
                        {titles.map((title: any, index: number) => (
                          <option key={index} value={`title-${index}`}>
                            {title?.titleNumber || `Title ${index + 1}`}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={assignment?.docType || ''}
                        onChange={e => {
                          updateAssignment(file.documentId, 'docType', e.target.value);
                        }}
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">
                          {isLoadingTypes
                            ? t('fileAssignment.loadingTypes')
                            : t('fileAssignment.selectType')}
                        </option>
                        {availableTypes.map(type => (
                          <option key={type.code} value={type.code}>
                            {type.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={assignment?.comment || ''}
                        onChange={e => updateAssignment(file.documentId, 'comment', e.target.value)}
                        placeholder={t('fileAssignment.notesPlaceholder')}
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
            <span className="text-sm text-yellow-800">{t('fileAssignment.warningSelectAll')}</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="primary" onClick={handleAssign} disabled={!allAssigned}>
            {t('fileAssignment.assignToForm')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default FileAssignmentModal;

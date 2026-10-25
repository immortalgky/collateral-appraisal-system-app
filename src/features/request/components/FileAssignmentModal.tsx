import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormContext, useWatch } from 'react-hook-form';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { Dropdown } from '@/shared/components/inputs';
import type { UploadDocumentResponse } from '../api';
import { formatFileSize } from '@/shared/utils/formatUtils';
import { documentTypeLabel, useGetDocumentTypes } from '../api/documentTypes';
import { useTitleLabel } from '../hooks/useTitleLabel';
import { pickCarryForwardTitles } from '../utils/carryForward';

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
  const { control } = useFormContext();
  // useWatch re-renders this dialog alone; `watch` would re-render the whole page on every keystroke
  const titles = useWatch({ control, name: 'titles', compute: pickCarryForwardTitles }) || [];
  const titleLabels = useTitleLabel();
  const labels = isOpen ? titleLabels(titles) : [];
  const { data: documentTypes = [], isLoading: isLoadingTypes } = useGetDocumentTypes('SUBMIT_DOC');

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

  const getFilePreview = (fileName: string, file?: File) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    // Show image thumbnail for image files
    if (['png', 'jpg', 'jpeg', 'gif'].includes(extension || '') && file) {
      const imageUrl = URL.createObjectURL(file);
      return (
        <img
          src={imageUrl}
          alt={fileName}
          className="w-12 h-12 object-cover rounded border border-(--palette-line)"
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
    return <Icon name="file" style="solid" className="w-10 h-10 text-(--palette-gray-500)" />;
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
        <p className="text-sm text-(--palette-gray-600)">{t('fileAssignment.description')}</p>

        {/* File list table */}
        <div className="max-h-96 overflow-y-auto border border-(--palette-line) rounded-lg">
          <table className="w-full">
            <thead className="bg-(--palette-surface-2) sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-ink) uppercase">
                  {t('fileAssignment.columnFile')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-ink) uppercase">
                  {t('fileAssignment.columnEntity')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-ink) uppercase">
                  {t('fileAssignment.columnDocumentType')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-(--palette-ink) uppercase">
                  {t('fileAssignment.columnNotes')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--palette-line)">
              {uploadedFiles.map(file => {
                const assignment = assignments[file.documentId];
                const availableTypes = getAvailableDocumentTypes();

                return (
                  <tr key={file.documentId} className="hover:bg-(--palette-surface-2)">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {getFilePreview(file.fileName, file.file)}
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-medium text-(--palette-ink) truncate">
                            {file.fileName}
                          </span>
                          <span className="text-xs text-(--palette-gray-500)">
                            {formatFileSize(file.file.size)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Dropdown
                        showValuePrefix={false}
                        options={[
                          { value: 'request', label: t('moveDocument.requestLevelLabel') },
                          ...titles.map((_title: unknown, index: number) => ({
                            value: `title-${index}`,
                            label: labels[index],
                          })),
                        ]}
                        value={
                          assignment?.entityType === 'request'
                            ? 'request'
                            : `title-${assignment?.entityIndex}`
                        }
                        onChange={value => {
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
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Dropdown
                        showValuePrefix={false}
                        disabled={isLoadingTypes}
                        placeholder={
                          isLoadingTypes
                            ? t('fileAssignment.loadingTypes')
                            : t('fileAssignment.selectType')
                        }
                        options={availableTypes.map(type => ({
                          value: type.code,
                          label: documentTypeLabel(type),
                        }))}
                        value={assignment?.docType || ''}
                        onChange={value => {
                          updateAssignment(file.documentId, 'docType', value);
                        }}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={assignment?.comment || ''}
                        onChange={e => updateAssignment(file.documentId, 'comment', e.target.value)}
                        placeholder={t('fileAssignment.notesPlaceholder')}
                        className="w-full px-2 py-1 text-sm border border-(--palette-line-strong) rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex items-center gap-2 p-3 bg-(--palette-warn-wash) border border-yellow-200 dark:border-yellow-500/30 rounded-lg">
            <Icon
              name="triangle-exclamation"
              style="solid"
              className="w-5 h-5 text-yellow-600 dark:text-yellow-400"
            />
            <span className="text-sm text-yellow-800 dark:text-yellow-300">
              {t('fileAssignment.warningSelectAll')}
            </span>
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

import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import type { TFunction } from 'i18next';
import {
  useFloating,
  useClick,
  useDismiss,
  useRole,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
} from '@floating-ui/react';
import Icon from '@shared/components/Icon';
import type { AppendixDocumentDto, DocumentItemDto } from '../types/documentChecklist';

// Presentational pieces + small pure helpers shared by RequestDocumentsSection (read-only
// request documents) and AppendixTab (editable appendix documents) — split out of what used
// to be a single combined tab so each section can load/error independently.

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/** Opens a request document or appendix document for viewing in a new browser tab. */
export const openDocumentViewer = (doc: DocumentItemDto | AppendixDocumentDto): void => {
  if ('documentId' in doc && doc.documentId) {
    window.open(`${API_BASE_URL}/documents/${doc.documentId}/download?download=false`, '_blank');
  } else if ('filePath' in doc) {
    const filePath = (doc as DocumentItemDto).filePath;
    if (filePath) window.open(filePath, '_blank');
  }
};

export const getFileIcon = (fileName: string | null): { name: string; color: string } => {
  if (!fileName) return { name: 'file', color: 'text-gray-400' };

  const name = fileName.toLowerCase();

  if (name.endsWith('.pdf')) {
    return { name: 'file-pdf', color: 'text-red-500' };
  }
  if (name.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
    return { name: 'file-image', color: 'text-blue-500' };
  }
  if (name.match(/\.(doc|docx)$/)) {
    return { name: 'file-word', color: 'text-blue-600' };
  }
  if (name.match(/\.(xls|xlsx)$/)) {
    return { name: 'file-excel', color: 'text-green-600' };
  }
  return { name: 'file', color: 'text-gray-500' };
};

/** Date + time (locale-aware) — used for the meta-line "uploaded" timestamp across all three
 * Documents-page sections (Request Documents, Valuation Documents, Appendix). */
// dd/MM/yyyy HH:mm (24-hour), e.g. "19/07/2026 14:39".
export const formatUploadDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatFileSize = (bytes: number | null | undefined): string => {
  if (bytes == null || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** True when a file should render as an image thumbnail rather than a file-type icon tile. */
export const isImageDocument = (
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): boolean => {
  if (mimeType) return mimeType.startsWith('image/');
  return /\.(jpe?g|png|gif|webp)$/i.test(fileName ?? '');
};

/** Short file-type label for the meta line — prefers the extension, falls back to mime type. */
export const getFileTypeLabel = (
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
  fileExtension: string | null | undefined,
): string => {
  const ext = (fileExtension ?? fileName?.split('.').pop() ?? '').replace(/^\./, '');
  if (ext && ext.length <= 5) return ext.toUpperCase();
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType?.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() ?? 'IMAGE';
  return '';
};

export const getCollateralTypeIcon = (code: string | null | undefined): string => {
  switch (code) {
    case 'L':
      return 'mountain-sun';
    case 'B':
      return 'building';
    case 'LB':
      return 'city';
    case 'U':
      return 'building-user';
    case 'VEH':
      return 'car';
    case 'MAC':
      return 'gear';
    case 'LSL':
      return 'file-contract';
    case 'LS':
      return 'file-signature';
    case 'LSB':
      return 'file-signature';
    case 'LSU':
      return 'file-contract';
    case 'VES':
      return 'ship';
    default:
      return 'folder';
  }
};

// Status Badge Component
export const StatusBadge = ({ hasFile }: { hasFile: boolean }) => (
  <span
    className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
      hasFile ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700',
    )}
  >
    <span className={clsx('w-1.5 h-1.5 rounded-full', hasFile ? 'bg-green-500' : 'bg-amber-500')} />
    {hasFile ? 'Uploaded' : 'Pending'}
  </span>
);

// Progress Bar Component
export const ProgressBar = ({ uploaded, total }: { uploaded: number; total: number }) => {
  const percentage = total > 0 ? (uploaded / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-300',
            percentage === 100 ? 'bg-green-500' : 'bg-primary',
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {uploaded}/{total}
      </span>
    </div>
  );
};

// Action Dropdown Component
//
// Renders its menu through a floating-ui portal (to document.body), NOT as a CSS-absolute
// child of the trigger button — the trigger normally sits inside a `rounded-2xl overflow-hidden`
// section card (used to clip header background gradients to the rounded corners), which was
// clipping/hiding the old absolutely-positioned menu. Portaling escapes that ancestor entirely,
// and `flip`/`shift` middleware keeps the menu in the viewport near the trigger.
export const ActionDropdown = ({
  onView,
  onEdit,
  onDelete,
  isEditable = false,
}: {
  onView?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isEditable?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [offset(4), flip(), shift({ padding: 8 })],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps()}
        type="button"
        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
      >
        <Icon name="ellipsis-vertical" className="text-sm" />
      </button>

      {isOpen && (
        <FloatingPortal>
          <FloatingFocusManager context={context} modal={false}>
            <div
              ref={refs.setFloating}
              style={floatingStyles}
              {...getFloatingProps()}
              className="z-50 bg-white rounded-lg shadow-lg border border-gray-100 py-1 min-w-[140px]"
            >
              {onView && (
                <button
                  type="button"
                  onClick={() => {
                    onView();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="eye" className="text-gray-400" />
                  View
                </button>
              )}
              {isEditable && onEdit && (
                <button
                  type="button"
                  onClick={() => {
                    onEdit();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="pen-to-square" className="text-gray-400" />
                  Edit
                </button>
              )}
              {isEditable && onDelete && (
                <button
                  type="button"
                  onClick={() => {
                    onDelete();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Icon name="trash" className="text-red-400" />
                  Delete
                </button>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </>
  );
};

// Empty State Component
export const EmptyUploadState = ({
  onUpload,
  isDragging,
}: {
  onUpload: () => void;
  isDragging?: boolean;
}) => (
  <div
    onClick={onUpload}
    className={clsx(
      'flex flex-col items-center justify-center py-8 cursor-pointer transition-all duration-200 rounded-xl',
      isDragging ? 'bg-primary/5 scale-[1.02] shadow-lg shadow-primary/10' : 'hover:bg-gray-50',
    )}
  >
    <div
      className={clsx(
        'w-14 h-14 rounded-full flex items-center justify-center mb-3 transition-all duration-200',
        isDragging ? 'bg-primary/10 text-primary animate-bounce' : 'bg-gray-100 text-gray-400',
      )}
    >
      <Icon name="cloud-arrow-up" className="text-2xl" />
    </div>
    <p
      className={clsx(
        'text-sm font-medium mb-1 transition-colors',
        isDragging ? 'text-primary' : 'text-gray-600',
      )}
    >
      {isDragging ? 'Drop files here' : 'Click to upload'}
    </p>
    <p className="text-xs text-gray-400">or drag and drop files</p>
  </div>
);

// ==================== Unified file row ====================
//
// [ leading 40px tile ] [ filename (link) + meta line ] [ trailing actions ]
//
// Shared by RequestDocumentsSection, ValuationDocumentChecklist and AppendixTab so every
// uploaded-file row across the Documents page has the same anatomy. The meta line shows
// whatever is available, joined by " · ": file type · size · date uploaded · uploaded by.

interface DocumentFileRowProps {
  fileName: string | null | undefined;
  documentId?: string | null;
  mimeType?: string | null;
  fileExtension?: string | null;
  fileSizeBytes?: number | null;
  uploadedAt?: string | null;
  uploadedByName?: string | null;
  uploadedBy?: string | null;
  /** Renders the filename as a clickable link when provided; plain text otherwise. */
  onView?: () => void;
  /** Trailing controls (badges, ActionDropdown, etc.) — composed by the caller per section. */
  actions?: ReactNode;
  /** Extra content under the meta line (e.g. Request Documents' notes remark). */
  footer?: ReactNode;
  t: TFunction<'appraisal'>;
  className?: string;
}

export const DocumentFileRow = ({
  fileName,
  documentId,
  mimeType,
  fileExtension,
  fileSizeBytes,
  uploadedAt,
  uploadedByName,
  uploadedBy,
  onView,
  actions,
  footer,
  t,
  className,
}: DocumentFileRowProps) => {
  const icon = getFileIcon(fileName ?? null);
  const thumbnailUrl =
    isImageDocument(fileName, mimeType) && documentId
      ? `${API_BASE_URL}/documents/${documentId}/download?download=false&size=large`
      : null;

  const uploadedByLabel = uploadedByName ?? uploadedBy;
  const metaParts = [
    getFileTypeLabel(fileName, mimeType, fileExtension),
    formatFileSize(fileSizeBytes),
    formatUploadDateTime(uploadedAt),
    uploadedByLabel ? t('valuationDocuments.uploadedBy', { name: uploadedByLabel }) : null,
  ].filter((v): v is string => !!v);

  return (
    <div className={clsx('flex items-start gap-3', className)}>
      {/* Leading tile: image thumbnail when the file is an image, else the file-type icon */}
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-gray-100 overflow-hidden">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={fileName || 'Document'}
            className="w-10 h-10 object-cover"
            onError={e => {
              const target = e.currentTarget;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                parent.innerHTML = `<span class="${icon.color} text-lg"><i class="fa-solid fa-${icon.name}"></i></span>`;
              }
            }}
          />
        ) : (
          <Icon name={icon.name} className={clsx('text-base', icon.color)} />
        )}
      </div>

      {/* Filename + meta line + optional footer */}
      <div className="min-w-0 flex-1">
        {onView ? (
          <button
            type="button"
            onClick={onView}
            className="text-sm text-primary hover:text-primary-700 hover:underline truncate block max-w-full text-left"
            title={fileName || 'Untitled document'}
          >
            {fileName || 'Untitled document'}
          </button>
        ) : (
          <p className="text-sm font-medium text-gray-900 truncate">{fileName || 'Untitled document'}</p>
        )}
        {metaParts.length > 0 && (
          <p className="text-xs text-gray-500 truncate">{metaParts.join(' · ')}</p>
        )}
        {footer}
      </div>

      {/* Trailing actions */}
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};

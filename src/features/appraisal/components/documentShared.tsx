import { formatFileSize as formatBytes } from '@shared/utils/formatUtils';
import type { AppendixDocumentDto, DocumentItemDto } from '../types/documentChecklist';

// Small pure helpers for the Document Checklist page's documents: opening a file, and what the
// meta line says about one (type, size, date, who). The lists themselves are drawn by the shared
// document card (request/components/documentCard).

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

/** The size as the shared formatter writes it, or '' when the file has none (the meta line leaves it out). */
export const formatFileSize = (bytes: number | null | undefined): string =>
  bytes == null || bytes <= 0 ? '' : formatBytes(bytes);

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
  // The name's suffix only when the name has a dot: a bare "memo" is not an extension.
  const nameExt = fileName?.includes('.') ? fileName.split('.').pop() : '';
  const ext = (fileExtension || nameExt || '').replace(/^\./, '');
  if (ext && ext.length <= 5) return ext.toUpperCase();
  if (mimeType === 'application/pdf') return 'PDF';
  if (mimeType?.startsWith('image/')) return mimeType.split('/')[1]?.toUpperCase() ?? 'IMAGE';
  return '';
};

/** What a document file row shows about a file, with its fallbacks in one place. */
export const getFileMeta = (
  file: {
    fileName?: string | null;
    mimeType?: string | null;
    fileExtension?: string | null;
    fileSizeBytes?: number | null;
    uploadedAt?: string | null;
    uploadedByName?: string | null;
    uploadedBy?: string | null;
  },
  untitledLabel: string,
) => ({
  name: file.fileName || untitledLabel,
  typeLabel: getFileTypeLabel(file.fileName, file.mimeType, file.fileExtension),
  size: formatFileSize(file.fileSizeBytes),
  uploadedAt: formatUploadDateTime(file.uploadedAt),
  // `||`: an empty name must not block the code.
  uploadedBy: file.uploadedByName || file.uploadedBy || '',
});

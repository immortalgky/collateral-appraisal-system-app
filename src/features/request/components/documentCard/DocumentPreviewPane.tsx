import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Textarea from '@/shared/components/inputs/Textarea';
import { formatFileSize } from '@/shared/utils/formatUtils';
import { thumbnailUrl } from '@/features/appraisal/utils/marketComparableFormat';
import type { UploadedDocument } from '../../types/document';
import { fileKind, isFollowUp } from '../../utils/documentList';
import FileBadgeIcon from './FileBadgeIcon';

interface DocumentPreviewPaneProps {
  /** The selected file, or null for the empty state. */
  doc: UploadedDocument | null;
  typeName: string;
  documentType: string;
  /** Section the file sits in ("This request", a title number). */
  location: string;
  /** Previous-appraisal number when the file was carried from it. */
  carriedFrom: string | null;
  /** Delete reads "Don't use this file". */
  dontUse: boolean;
  editable: boolean;
  onClose: () => void;
  /**
   * `side` is the sticky pane next to the list. `drawer` is the same content inside a slide-over,
   * which brings its own frame, title and close button.
   */
  variant?: 'side' | 'drawer';
  /** The "Source" line (own, requested by an appraiser, previous appraisal). Defaults to true. */
  showSource?: boolean;
  /** The "Notes" block. Defaults to true; a list whose files have no notes turns it off. */
  showNotes?: boolean;
  /** The file's row key (`getDocKey`), which the notes editor is remounted on. */
  docKey?: string;
  onView: (doc: UploadedDocument) => void;
  /** Each of these is left out where the list does not offer it (the Document Checklist page). */
  onSaveNotes?: (doc: UploadedDocument, notes: string) => void;
  onEdit?: (doc: UploadedDocument) => void;
  /** The text of the edit button. */
  editLabel?: string;
  onReplace?: (doc: UploadedDocument) => void;
  onMove?: (doc: UploadedDocument) => void;
  onDelete?: (doc: UploadedDocument) => void;
}

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '';
  const date = new Date(value);
  return (
    date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  );
};

const NotesEditor = ({
  doc,
  onSave,
}: {
  doc: UploadedDocument;
  onSave: (doc: UploadedDocument, notes: string) => void;
}) => {
  const { t } = useTranslation('request');
  const [draft, setDraft] = useState(doc.notes ?? '');
  const dirty = draft.trim() !== (doc.notes ?? '').trim();
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2">
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        placeholder={t('docCard.pane.notesPlaceholder')}
        aria-label={t('docCard.pane.notes')}
        className="min-w-0"
      />
      {dirty && (
        <div>
          <Button type="button" size="sm" variant="outline" onClick={() => onSave(doc, draft)}>
            {t('docCard.pane.saveNotes')}
          </Button>
        </div>
      )}
    </div>
  );
};

/** A blob URL for a file that is still on this machine, released when the file goes. */
const useLocalImageUrl = (file: File | undefined, enabled: boolean) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file || !enabled) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file, enabled]);
  return url;
};

/** Sticky side pane: preview, details and actions for the file picked in the list. */
const DocumentPreviewPane = ({
  doc,
  typeName,
  documentType,
  location,
  carriedFrom,
  dontUse,
  editable,
  onClose,
  variant = 'side',
  showSource = true,
  showNotes = true,
  docKey,
  onView,
  onSaveNotes,
  onEdit,
  editLabel,
  onReplace,
  onMove,
  onDelete,
}: DocumentPreviewPaneProps) => {
  const { t } = useTranslation('request');
  // While a file is on this machine (uploading, or replacing an earlier one) its own bytes are the
  // preview. The old documentId of a row being replaced must never be shown for the new file.
  const localImage = useLocalImageUrl(doc?.file, fileKind(doc?.fileName) === 'img');
  const drawer = variant === 'drawer';
  // The drawer is a grid: its one column must be `minmax(0,1fr)`. A bare `grid` has an `auto` track,
  // which is as wide as its widest child's max-content, so a large image (or a textarea's intrinsic
  // width) made the column wider than the drawer instead of the image shrinking to fit it.
  const shell = drawer
    ? 'grid grid-cols-[minmax(0,1fr)] gap-3'
    : 'sticky top-3 self-start overflow-hidden rounded-2xl border border-(--palette-line-soft) bg-(--palette-surface) shadow-sm';

  if (!doc) {
    return (
      <aside aria-label={t('docCard.pane.label')} className={shell}>
        <div className="grid aspect-[4/3] place-items-center bg-(--palette-surface-2) px-4 text-center text-sm text-(--palette-gray-500)">
          {t('docCard.pane.empty')}
        </div>
      </aside>
    );
  }

  const kind = fileKind(doc.fileName);
  const size = doc.file?.size ?? doc.fileSizeBytes ?? undefined;
  const source = isFollowUp(doc)
    ? t('docCard.pane.sourceFollowUp')
    : carriedFrom !== null
      ? t('docCard.pane.sourcePrev', { number: carriedFrom })
      : t('docCard.pane.sourceOwn');

  return (
    <aside aria-label={t('docCard.pane.label')} className={shell}>
      <div
        className={clsx(
          'relative grid aspect-[4/3] min-w-0 place-items-center border-(--palette-line) bg-(--palette-surface-2) p-3 text-center text-sm text-(--palette-gray-500)',
          drawer ? 'rounded-lg border' : 'border-b',
        )}
      >
        {kind === 'img' && (localImage || (doc.documentId && !doc.file && !doc.isUploading)) ? (
          <img
            src={localImage ?? thumbnailUrl(doc.documentId)}
            alt={doc.fileName ?? ''}
            className="max-h-full max-w-full rounded object-contain"
          />
        ) : (
          <div className="grid justify-items-center gap-1.5">
            <FileBadgeIcon fileName={doc.fileName} size="lg" />
            {kind === 'pdf' ? 'PDF' : kind === 'img' ? 'IMG' : ''}
          </div>
        )}
        {!drawer && (
          <button
            type="button"
            onClick={onClose}
            aria-label={t('docCard.pane.close')}
            className="absolute top-1.5 right-1.5 cursor-pointer rounded-full p-1 text-(--palette-gray-500) hover:bg-(--palette-line)"
          >
            <Icon name="xmark" style="solid" className="size-3" />
          </button>
        )}
      </div>
      <div className={clsx('grid min-w-0 grid-cols-[minmax(0,1fr)] gap-2', !drawer && 'px-4 py-3')}>
        {/* The drawer already titles itself with the file name */}
        {!drawer && (
          <h4 className="text-base font-semibold [overflow-wrap:anywhere]">{doc.fileName}</h4>
        )}
        <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-(--palette-gray-500)">{t('docCard.pane.fileType')}</dt>
          <dd className="text-(--palette-gray-600) [overflow-wrap:anywhere]">
            {documentType} · {typeName}
          </dd>
          <dt className="text-(--palette-gray-500)">{t('docCard.pane.location')}</dt>
          <dd className="text-(--palette-gray-600) [overflow-wrap:anywhere]">{location}</dd>
          {size != null && (
            <>
              <dt className="text-(--palette-gray-500)">{t('docCard.pane.size')}</dt>
              <dd className="text-(--palette-gray-600) tabular-nums">{formatFileSize(size)}</dd>
            </>
          )}
          <dt className="text-(--palette-gray-500)">{t('docCard.pane.uploaded')}</dt>
          <dd className="text-(--palette-gray-600) [overflow-wrap:anywhere]">
            {formatDateTime(doc.uploadedAt)}
            {(doc.uploadedByName || doc.uploadedBy) && ` · ${doc.uploadedByName || doc.uploadedBy}`}
          </dd>
          {showSource && (
            <>
              <dt className="text-(--palette-gray-500)">{t('docCard.pane.source')}</dt>
              <dd className="text-(--palette-gray-600)">{source}</dd>
            </>
          )}
        </dl>
        {showNotes && (
          <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1 text-sm text-(--palette-gray-600)">
            {t('docCard.pane.notes')}
            {editable && onSaveNotes ? (
              // Remounted per file, so a half-typed note never lands on another file.
              <NotesEditor key={docKey ?? doc.fileName} doc={doc} onSave={onSaveNotes} />
            ) : (
              <span className="whitespace-pre-wrap text-(--palette-gray-500)">
                {doc.notes?.trim() || t('docCard.pane.noNotes')}
              </span>
            )}
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Button type="button" size="sm" onClick={() => onView(doc)}>
            {t('docCard.pane.open')}
          </Button>
          {editable && !doc.isUploading && (
            <>
              {onEdit && (
                <Button type="button" size="sm" variant="outline" onClick={() => onEdit(doc)}>
                  {editLabel ?? t('docCard.pane.edit')}
                </Button>
              )}
              {onReplace && (
                <Button type="button" size="sm" variant="outline" onClick={() => onReplace(doc)}>
                  {t('docCard.pane.replace')}
                </Button>
              )}
              {onMove && (
                <Button type="button" size="sm" variant="outline" onClick={() => onMove(doc)}>
                  {t('docCard.pane.move')}
                </Button>
              )}
              {onDelete && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(doc)}
                  className={
                    dontUse ? 'text-violet-700 dark:text-violet-300' : 'text-(--palette-danger)'
                  }
                >
                  {dontUse ? t('docCard.pane.dontUse') : t('docCard.pane.delete')}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </aside>
  );
};

export default DocumentPreviewPane;

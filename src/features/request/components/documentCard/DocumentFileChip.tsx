import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import LoadingSpinner from '@/shared/components/LoadingSpinner';
import DocumentActionMenu from '../DocumentActionMenu';
import type { UploadedDocument } from '../../types/document';
import { isFollowUp } from '../../utils/documentList';
import FileBadgeIcon from './FileBadgeIcon';

interface DocumentFileChipProps {
  doc: UploadedDocument;
  selected: boolean;
  /** Previous-appraisal number when the file was carried from it (and the maker is still working). */
  carriedFrom: string | null;
  /** Delete reads "Don't use this file": it can be put back from the unused list. */
  dontUse: boolean;
  /** The text of the edit entry in the file's menu ("Notes" by default). */
  editLabel?: string;
  readOnly: boolean;
  onSelect: () => void;
  onView: (doc: UploadedDocument) => void;
  /** Each of these is left out where the list does not offer it (the Document Checklist page). */
  onEdit?: (doc: UploadedDocument) => void;
  onMove?: (doc: UploadedDocument) => void;
  onReplace?: (doc: UploadedDocument) => void;
  onDelete?: (doc: UploadedDocument) => void;
}

/** One file of a type: click to preview it in the side pane, ⋮ for its actions. */
const DocumentFileChip = ({
  doc,
  selected,
  carriedFrom,
  dontUse,
  editLabel,
  readOnly,
  onSelect,
  onView,
  onEdit,
  onMove,
  onReplace,
  onDelete,
}: DocumentFileChipProps) => {
  const { t } = useTranslation('request');
  const uploading = !!doc.isUploading;
  const hasNote = !!doc.notes?.trim();

  return (
    <span
      className={clsx(
        'inline-flex max-w-[20rem] items-center gap-1 rounded-md border bg-(--palette-surface) py-0.5 pr-1 pl-1.5 text-xs',
        selected ? 'border-primary bg-primary/5' : 'border-(--palette-line) hover:border-primary',
        uploading && 'opacity-60',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        title={
          carriedFrom !== null
            ? `${doc.fileName} · ${t('carryForward.badge', { number: carriedFrom })}`
            : (doc.fileName ?? undefined)
        }
        className="inline-flex min-w-0 cursor-pointer items-center gap-1.5"
      >
        {uploading ? (
          <LoadingSpinner size="sm" variant="default" />
        ) : (
          <FileBadgeIcon fileName={doc.fileName} />
        )}
        <span className="truncate">{doc.fileName}</span>
        {hasNote && (
          <span title={t('docCard.chip.hasNote')} className="shrink-0">
            <Icon name="note-sticky" style="solid" className="size-3 text-amber-500" />
          </span>
        )}
        {carriedFrom !== null && (
          <span className="shrink-0 rounded-full border border-violet-200 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-2 py-px text-xs font-medium text-violet-700 dark:text-violet-300">
            {t('carryForward.badgeShort')}
          </span>
        )}
        {isFollowUp(doc) && (
          <span className="shrink-0 rounded-full bg-blue-50 dark:bg-blue-500/10 px-2 py-px text-xs font-medium text-blue-700 dark:text-blue-300">
            {t('docCard.chip.followUp')}
          </span>
        )}
      </button>
      {uploading ? (
        <span className="px-1 text-xs text-(--palette-gray-500)">
          {t('docCard.chip.uploading')}
        </span>
      ) : readOnly ? (
        <DocumentActionMenu document={doc} onView={onView} size="sm" />
      ) : (
        <DocumentActionMenu
          document={doc}
          onView={onView}
          onEdit={onEdit}
          onMove={onMove}
          onReplace={onReplace}
          onDelete={onDelete}
          isCarried={dontUse}
          editLabel={editLabel}
          size="sm"
        />
      )}
    </span>
  );
};

export default DocumentFileChip;

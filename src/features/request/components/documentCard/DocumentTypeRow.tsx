import { useEffect, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { CHIP_LIMIT, CHIPS_WHEN_FOLDED, type TypeRow } from '../../utils/documentList';

interface DocumentTypeRowProps {
  row: TypeRow;
  /** The type's display name. */
  name: string;
  /** False in read-only: no checkbox and no upload actions. */
  editable: boolean;
  /** The row has a checkbox. Defaults to `editable`; a list without bulk actions turns it off. */
  hasCheckbox?: boolean;
  /** A required type without a file says "attach before submit". Defaults to true. */
  showMissingHint?: boolean;
  /** How many of the row's files are ticked. */
  selectedCount: number;
  onToggleSelect: (checked: boolean) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
  /** The chips to show (already folded to 3 when there are more than four). */
  chips: ReactNode;
  onUpload: () => void;
  /** Offers a "Generate" action (a system-generated document type). */
  onGenerate?: () => void;
  /** Generate is not possible now: the button is disabled and this is its tooltip. */
  generateDisabledReason?: string;
  /** Offers the appendix layout (columns per page): the value and its change. */
  layout?: number;
  onLayoutChange?: (columns: number) => void;
  /** Files dropped on the row. */
  onDropFiles?: (files: File[]) => void;
}

/** One document type: status dot, name, its files as chips, and the upload action. */
const DocumentTypeRow = ({
  row,
  name,
  editable,
  hasCheckbox = editable,
  showMissingHint = true,
  selectedCount,
  onToggleSelect,
  expanded,
  onToggleExpanded,
  chips,
  onUpload,
  onGenerate,
  generateDisabledReason,
  layout,
  onLayoutChange,
  onDropFiles,
}: DocumentTypeRowProps) => {
  const { t } = useTranslation('request');
  const [dragOver, setDragOver] = useState(false);
  const { files, status } = row;
  const missing = status === 'miss';
  const folded = files.length > CHIP_LIMIT && !expanded;

  const checkbox = useRef<HTMLInputElement>(null);
  // The same set the toggle acts on: a file still uploading can not be ticked
  const selectable = files.filter(f => !f.isUploading).length;
  const some = selectedCount > 0 && selectedCount < selectable;
  useEffect(() => {
    if (checkbox.current) checkbox.current.indeterminate = some;
  }, [some]);

  return (
    <div
      onDragOver={
        onDropFiles
          ? e => {
              if (!e.dataTransfer.types.includes('Files')) return;
              e.preventDefault();
              setDragOver(true);
            }
          : undefined
      }
      onDragLeave={onDropFiles ? () => setDragOver(false) : undefined}
      onDrop={
        onDropFiles
          ? e => {
              e.preventDefault();
              setDragOver(false);
              const files = Array.from(e.dataTransfer.files);
              if (files.length > 0) onDropFiles(files);
            }
          : undefined
      }
      className={clsx(
        'grid min-h-10 items-center gap-x-3 border-t border-(--palette-line-soft) px-4 py-2 hover:bg-(--palette-surface-2)',
        dragOver && 'bg-primary/5 ring-1 ring-primary/40 ring-inset',
        // The chips keep at least 140px; in a narrow list (below 560px, measured on the list, not
        // the window) the files drop to a second line under the name instead.
        hasCheckbox
          ? 'grid-cols-[20px_12px_minmax(160px,260px)_minmax(140px,1fr)_auto] @max-[560px]:grid-cols-[20px_12px_minmax(0,1fr)_auto]'
          : 'grid-cols-[12px_minmax(160px,260px)_minmax(140px,1fr)_auto] @max-[560px]:grid-cols-[12px_minmax(0,1fr)_auto]',
        missing && 'bg-(--palette-warn-wash) hover:bg-(--palette-warn-wash)',
      )}
    >
      {hasCheckbox && (
        <input
          ref={checkbox}
          type="checkbox"
          aria-label={t('docCard.row.selectRow', { name })}
          disabled={selectable === 0}
          checked={selectable > 0 && selectedCount === selectable}
          onChange={e => onToggleSelect(e.target.checked)}
          className="size-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed"
        />
      )}
      <span
        title={t(`docCard.status.${status}`)}
        className={clsx(
          'size-2 rounded-full',
          status === 'ok' ? 'bg-green-600' : missing ? 'bg-amber-500' : 'bg-gray-300',
        )}
      />
      <span className="min-w-0 text-sm font-medium">
        {/* Two lines at most, the whole name in the tooltip: a long type name must not take the
            width the file chips need */}
        <span className="flex items-start gap-0.5">
          <span className="line-clamp-2 break-words" title={name}>
            {name}
          </span>
          {row.required && (
            <span className="text-(--palette-danger)" title={t('docCard.kpi.required')}>
              *
            </span>
          )}
        </span>
        <small className="block text-xs font-normal text-(--palette-gray-500)">
          {row.documentType}
          {missing
            ? ` · ${t('docCard.row.noFile')}`
            : files.length > 0
              ? ` · ${t('docCard.row.files', { n: files.length })}`
              : ''}
        </small>
      </span>
      <span
        className={clsx(
          'flex min-w-0 flex-wrap items-center gap-1',
          '@max-[560px]:row-start-2 @max-[560px]:-col-end-1 @max-[560px]:py-1',
          hasCheckbox ? '@max-[560px]:col-start-3' : '@max-[560px]:col-start-2',
        )}
      >
        {chips}
        {folded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="cursor-pointer rounded-full border border-dashed border-(--palette-line-strong) px-2.5 py-0.5 text-sm text-(--palette-gray-600) hover:border-primary hover:text-(--palette-primary-text)"
          >
            {t('docCard.row.more', { n: files.length - CHIPS_WHEN_FOLDED })}
          </button>
        )}
        {files.length > CHIP_LIMIT && expanded && (
          <button
            type="button"
            onClick={onToggleExpanded}
            className="cursor-pointer text-sm text-(--palette-gray-500) underline underline-offset-2"
          >
            {t('docCard.row.fewer')}
          </button>
        )}
        {files.length === 0 && missing && showMissingHint && (
          <span className="text-sm text-(--palette-gray-500)">{t('docCard.row.mustAttach')}</span>
        )}
      </span>
      <span
        className={clsx(
          'flex items-center justify-end gap-1 whitespace-nowrap',
          '@max-[560px]:row-start-1',
          hasCheckbox ? '@max-[560px]:col-start-4' : '@max-[560px]:col-start-3',
        )}
      >
        {layout !== undefined && onLayoutChange && (
          <span
            role="group"
            aria-label={t('docCard.row.layout')}
            className="inline-flex items-center gap-1 rounded-md border border-(--palette-line) bg-(--palette-surface) px-1.5 py-0.5"
          >
            <span className="text-xs text-(--palette-gray-500)">{t('docCard.row.layout')}</span>
            {[1, 2, 3].map(columns => (
              <button
                key={columns}
                type="button"
                aria-pressed={layout === columns}
                aria-label={t('docCard.row.layoutColumns', { count: columns })}
                onClick={() => onLayoutChange(columns)}
                className={clsx(
                  'size-6 cursor-pointer rounded text-sm font-medium',
                  layout === columns
                    ? 'bg-primary text-white'
                    : 'text-(--palette-gray-500) hover:bg-(--palette-surface-3)',
                )}
              >
                {columns}
              </button>
            ))}
          </span>
        )}
        {onGenerate && (
          // A disabled button shows no tooltip of its own in every browser: the span carries it
          <span title={generateDisabledReason}>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              // A soft primary tint, the app's "add the first item" look. Disabled is plain grey:
              // the variant's own 50% fade would leave the tint showing.
              className={
                generateDisabledReason
                  ? 'bg-(--palette-surface-3)! text-(--palette-gray-400)! opacity-100!'
                  : 'bg-primary/10! text-(--palette-primary-text)! hover:bg-primary/15!'
              }
              leftIcon={<Icon style="solid" name="wand-magic-sparkles" className="text-xs" />}
              onClick={onGenerate}
              disabled={!!generateDisabledReason}
              title={generateDisabledReason}
            >
              {t('docCard.row.generate')}
            </Button>
          </span>
        )}
        {editable && (
          <Button
            type="button"
            size="sm"
            variant={missing ? 'warning' : 'ghost'}
            onClick={onUpload}
            aria-label={t('docCard.row.addFileLabel', { name })}
          >
            {missing ? t('docCard.row.upload') : t('docCard.row.addFile')}
          </Button>
        )}
      </span>
    </div>
  );
};

export default DocumentTypeRow;

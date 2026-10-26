import clsx from 'clsx';
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Input from '@/shared/components/Input';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { DocFilter } from '../../utils/documentList';

interface DocumentToolbarProps {
  query: string;
  onQuery: (query: string) => void;
  filter: DocFilter;
  onFilter: (filter: DocFilter) => void;
  /** Required types still without a file. */
  missingCount: number;
  /** Files an appraiser asked for. */
  followUpCount: number;
  /** Ticks or unticks every file that is on screen. Absent in read-only. */
  selectAll?: {
    checked: boolean;
    indeterminate: boolean;
    disabled: boolean;
    onChange: (checked: boolean) => void;
  };
  /** Left out while a search or filter is on: it decides which sections are open. */
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  /** Shows the empty optional types as rows instead of the "+ type" line. Absent where the list has no such switch. */
  allTypes?: { shown: boolean; onToggle: () => void };
  /** Collapse or show the side pane. Absent when the card is too narrow to have one. */
  previewToggle?: { shown: boolean; onToggle: () => void };
}

/** Search, filter chips and the "show every type" switch. */
const DocumentToolbar = ({
  query,
  onQuery,
  filter,
  onFilter,
  missingCount,
  followUpCount,
  selectAll,
  onExpandAll,
  onCollapseAll,
  allTypes,
  previewToggle,
}: DocumentToolbarProps) => {
  const { t } = useTranslation('request');
  const selectAllBox = useRef<HTMLInputElement>(null);
  const indeterminate = !!selectAll?.indeterminate;
  useEffect(() => {
    if (selectAllBox.current) selectAllBox.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const chip = (value: DocFilter, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => onFilter(value)}
      aria-pressed={filter === value}
      className={clsx(
        'cursor-pointer rounded-full border px-3 py-1 text-sm',
        filter === value
          ? 'border-primary bg-primary/10 font-semibold text-(--palette-primary-text)'
          : 'border-(--palette-line) bg-(--palette-surface) text-(--palette-gray-600) hover:border-(--palette-line-strong)',
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-(--palette-line-soft) bg-(--palette-surface-2) px-4 py-2.5">
      {selectAll && (
        <input
          ref={selectAllBox}
          type="checkbox"
          aria-label={t('docCard.toolbar.selectAll')}
          title={t('docCard.toolbar.selectAll')}
          checked={selectAll.checked}
          disabled={selectAll.disabled}
          onChange={e => selectAll.onChange(e.target.checked)}
          className="size-3.5 cursor-pointer accent-primary disabled:cursor-not-allowed"
        />
      )}
      {/* The shared input, so it looks like the page's other inputs. It filters the list, not the
          form, so it keeps working when the form is read-only. */}
      <FormReadOnlyContext.Provider value={false}>
        <Input
          type="search"
          value={query}
          onChange={e => onQuery(e.target.value)}
          placeholder={t('docCard.toolbar.search')}
          aria-label={t('docCard.toolbar.search')}
          leftIcon={<Icon name="magnifying-glass" style="regular" className="size-3.5" />}
          fullWidth={false}
          className="w-64"
        />
      </FormReadOnlyContext.Provider>
      {chip('all', t('docCard.toolbar.filterAll'))}
      {(missingCount > 0 || filter === 'miss') &&
        chip('miss', t('docCard.toolbar.filterMissing', { n: missingCount }))}
      {(followUpCount > 0 || filter === 'followup') &&
        chip('followup', t('docCard.toolbar.filterFollowUp', { n: followUpCount }))}
      <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1">
        {onExpandAll && (
          <button
            type="button"
            onClick={onExpandAll}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-(--palette-gray-600) hover:text-(--palette-ink)"
          >
            <Icon name="up-right-and-down-left-from-center" style="solid" className="size-3" />
            {t('documents.expandAll')}
          </button>
        )}
        {onCollapseAll && (
          <button
            type="button"
            onClick={onCollapseAll}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-(--palette-gray-600) hover:text-(--palette-ink)"
          >
            <Icon name="down-left-and-up-right-to-center" style="solid" className="size-3" />
            {t('documents.collapseAll')}
          </button>
        )}
        {allTypes && (
          <button
            type="button"
            onClick={allTypes.onToggle}
            aria-pressed={allTypes.shown}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-(--palette-gray-600) hover:text-(--palette-ink)"
          >
            <Icon name={allTypes.shown ? 'eye' : 'eye-slash'} style="regular" className="size-3" />
            {t('docCard.toolbar.showAllTypes')}
          </button>
        )}
        {previewToggle && (
          <button
            type="button"
            onClick={previewToggle.onToggle}
            aria-pressed={previewToggle.shown}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-(--palette-gray-600) hover:text-(--palette-ink)"
          >
            <Icon name="table-columns" style="regular" className="size-3" />
            {previewToggle.shown
              ? t('docCard.toolbar.hidePreview')
              : t('docCard.toolbar.showPreview')}
          </button>
        )}
      </span>
    </div>
  );
};

export default DocumentToolbar;

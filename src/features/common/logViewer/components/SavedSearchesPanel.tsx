import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';
import type { SavedLogSearch } from '../utils/savedSearches';

interface SavedSearchesPanelProps {
  savedSearches: SavedLogSearch[];
  currentQuery: string;
  currentHours: number | null;
  onApply: (search: SavedLogSearch) => void;
  onSave: (label: string) => void;
  onDelete: (id: string) => void;
}

const SavedSearchesPanel = ({
  savedSearches,
  currentQuery,
  currentHours,
  onApply,
  onSave,
  onDelete,
}: SavedSearchesPanelProps) => {
  const { t } = useTranslation('logAdmin');
  const [label, setLabel] = useState('');

  const canSave = currentQuery.trim().length > 0 && currentHours != null;

  const submitSave = () => {
    if (!label.trim() || !canSave) return;
    onSave(label.trim());
    setLabel('');
  };

  return (
    <div className="bg-(--palette-surface) rounded-xl border border-(--palette-line) shadow-sm p-4">
      <h2 className="text-base font-semibold text-(--palette-ink)">
        {t('sidebar.savedSearchesTitle')}
      </h2>
      <p className="text-xs text-(--palette-gray-500) mt-0.5">
        {t('sidebar.savedSearchesSubtitle')}
      </p>

      <div className="flex flex-col gap-1.5 mt-2.5">
        {savedSearches.map(search => (
          <div key={search.id} className="flex items-stretch gap-1">
            <button
              type="button"
              onClick={() => onApply(search)}
              className="flex-1 text-left rounded-lg border border-dashed border-(--palette-line) px-2.5 py-1.5 hover:border-primary transition-colors min-w-0"
            >
              <span className="block text-xs font-medium text-(--palette-ink) truncate">
                {search.label}
              </span>
              <code className="block text-[11px] text-(--palette-gray-400) truncate">
                {search.q || t('sidebar.savedSearchesNoQuery')}
              </code>
            </button>
            <button
              type="button"
              onClick={() => onDelete(search.id)}
              aria-label={t('sidebar.savedSearchesDelete')}
              className="px-1.5 text-(--palette-gray-300) hover:text-danger transition-colors"
            >
              <Icon name="trash" style="regular" className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-(--palette-line-soft)">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submitSave()}
          disabled={!canSave}
          placeholder={t('sidebar.savedSearchesSavePlaceholder')}
          className="min-w-0 flex-1 px-2.5 py-1.5 border border-(--palette-line) rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-(--palette-surface-2) disabled:text-(--palette-gray-300)"
        />
        <button
          type="button"
          onClick={submitSave}
          disabled={!canSave || !label.trim()}
          className="px-2.5 py-1.5 text-xs rounded-lg bg-primary text-primary-content hover:bg-primary/90 disabled:opacity-40"
        >
          {t('sidebar.savedSearchesSave')}
        </button>
      </div>
      {currentHours == null && (
        <p className="text-[11px] text-(--palette-gray-400) mt-1">
          {t('sidebar.savedSearchesCustomRangeHint')}
        </p>
      )}
    </div>
  );
};

export default SavedSearchesPanel;

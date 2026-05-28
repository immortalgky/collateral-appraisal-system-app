import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '@shared/components/Modal';
import Icon from '@shared/components/Icon';
import { getIconBgClass } from '@shared/components/icon-bg';
import { useMenuStore } from '@features/menuManagement/store';
import type { MenuTreeNode } from '@features/menuManagement/types';
import { isPinnable } from '../useFavorites';

interface FavoritesPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentIds: string[];
  onApply: (newIds: string[]) => void;
}

/** Build a filtered subtree preserving ancestor context. */
function filterTree(nodes: MenuTreeNode[], q: string, lang: string): MenuTreeNode[] {
  return nodes
    .map(node => {
      const filtered = filterTree(node.children, q, lang);
      const selfMatches = (node.labels[lang] ?? node.labels['en'] ?? '').toLowerCase().includes(q);
      if (selfMatches || filtered.length > 0) {
        return { ...node, children: filtered };
      }
      return null;
    })
    .filter((n): n is MenuTreeNode => n !== null);
}

interface TreeNodeRowProps {
  node: MenuTreeNode;
  checked: Set<string>;
  onToggle: (id: string) => void;
  lang: string;
  depth?: number;
}

function TreeNodeRow({ node, checked, onToggle, lang, depth = 0 }: TreeNodeRowProps) {
  const [expanded, setExpanded] = useState(true);
  const pinnable = isPinnable(node);
  const label = node.labels[lang] ?? node.labels['en'] ?? node.itemKey;
  const hasChildren = node.children.length > 0;

  return (
    <>
      <div
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
          pinnable ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
        }`}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
        onClick={pinnable ? () => onToggle(node.id) : undefined}
        onKeyDown={
          pinnable
            ? e => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onToggle(node.id);
                }
              }
            : undefined
        }
        role={pinnable ? 'button' : undefined}
        tabIndex={pinnable ? 0 : undefined}
      >
        {/* Expand/collapse for parents */}
        {hasChildren ? (
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setExpanded(v => !v);
            }}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 w-4"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            <Icon
              style="solid"
              name={expanded ? 'chevron-down' : 'chevron-right'}
              className="size-2.5"
            />
          </button>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Checkbox — only for pinnable nodes */}
        {pinnable ? (
          <input
            type="checkbox"
            checked={checked.has(node.id)}
            onChange={() => onToggle(node.id)}
            onClick={e => e.stopPropagation()}
            className="size-3.5 flex-shrink-0 accent-primary rounded border-gray-300 cursor-pointer"
          />
        ) : (
          <span className="size-3.5 flex-shrink-0" />
        )}

        {/* Icon */}
        <div
          className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${getIconBgClass(node.iconColor)}`}
        >
          <Icon
            name={node.iconName}
            style={node.iconStyle}
            className={`size-3 ${node.iconColor ?? 'text-gray-500'}`}
          />
        </div>

        {/* Label */}
        <span
          className={`text-xs flex-1 min-w-0 truncate ${
            pinnable ? 'text-gray-700 font-medium' : 'text-gray-500 font-semibold'
          }`}
        >
          {label}
        </span>

        {/* "Folder" badge for non-pinnable parents */}
        {!pinnable && hasChildren && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded flex-shrink-0">
            folder
          </span>
        )}
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map(child => (
            <TreeNodeRow
              key={child.id}
              node={child}
              checked={checked}
              onToggle={onToggle}
              lang={lang}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </>
  );
}

export function FavoritesPickerModal({
  isOpen,
  onClose,
  currentIds,
  onApply,
}: FavoritesPickerModalProps) {
  const { t, i18n } = useTranslation('common');
  const lang = i18n.language ?? 'en';
  const { main } = useMenuStore();

  const [search, setSearch] = useState('');
  const [checked, setChecked] = useState<Set<string>>(() => new Set(currentIds));

  // Sync checked state whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      setChecked(new Set(currentIds));
      setSearch('');
    }
  }, [isOpen, currentIds]);

  const q = search.toLowerCase().trim();
  const filteredMain = useMemo(() => (q ? filterTree(main, q, lang) : main), [main, q, lang]);

  function toggleId(id: string) {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleApply() {
    // Preserve existing order for items already in currentIds,
    // then append newly added items at the end.
    const existingKept = currentIds.filter(id => checked.has(id));
    const newlyAdded = [...checked].filter(id => !currentIds.includes(id));
    onApply([...existingKept, ...newlyAdded]);
    onClose();
  }

  function handleClose() {
    onClose();
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('favorites.picker.title')} size="md">
      {/* Search */}
      <div className="relative mb-4">
        <Icon
          style="solid"
          name="magnifying-glass"
          className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          placeholder={t('favorites.picker.searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-8 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-gray-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <Icon style="solid" name="xmark" className="size-3.5" />
          </button>
        )}
      </div>

      {/* Tree */}
      <div className="overflow-y-auto max-h-96 rounded-lg border border-gray-100">
        {filteredMain.length > 0 ? (
          <div className="py-1">
            {filteredMain.map(node => (
              <TreeNodeRow
                key={node.id}
                node={node}
                checked={checked}
                onToggle={toggleId}
                lang={lang}
              />
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">{t('status.noData')}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          {checked.size} {t('favorites.picker.selected')}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t('actions.cancel')}
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('actions.confirm')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

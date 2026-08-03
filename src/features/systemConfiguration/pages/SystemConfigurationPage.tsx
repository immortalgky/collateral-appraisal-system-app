import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  useListSystemConfigurations,
  useUpdateSystemConfiguration,
  type SystemConfigurationDto,
  type UpdateSystemConfigurationBody,
} from '../api/systemConfigurationAdmin';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

const UNCATEGORISED = '__uncategorised__';

// Backend seeds "int" | "decimal" | "bool"; anything else is treated as free text.
const normaliseType = (valueType: string | null | undefined) =>
  (valueType ?? '').trim().toLowerCase();

const isBool = (valueType: string | null | undefined) => normaliseType(valueType) === 'bool';
const isNumeric = (valueType: string | null | undefined) =>
  ['int', 'decimal', 'long', 'double'].includes(normaliseType(valueType));

// ──────────────────────────────────────────────────────────────────────────────
// Edit modal
// ──────────────────────────────────────────────────────────────────────────────

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: SystemConfigurationDto | null;
  onSave: (key: string, body: UpdateSystemConfigurationBody) => void;
  isSaving: boolean;
}

function EditModal({ isOpen, onClose, entry, onSave, isSaving }: EditModalProps) {
  const { t } = useTranslation('systemConfiguration');
  const [value, setValue] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    setValue(entry?.value ?? '');
    setDescription(entry?.description ?? '');
    setIsActive(entry?.isActive ?? true);
  }, [entry, isOpen]);

  if (!entry) return null;

  const handleSave = () => {
    // The stored value is always a string; validate it against the declared type
    // here so a bad value is caught before the reader parses it at runtime.
    if (isNumeric(entry.valueType)) {
      if (value.trim() === '' || Number.isNaN(Number(value))) {
        toast.error(t('validation.notANumber', { valueType: entry.valueType }));
        return;
      }
      if (normaliseType(entry.valueType) === 'int' && !Number.isInteger(Number(value))) {
        toast.error(t('validation.notAnInteger'));
        return;
      }
    }
    if (!isBool(entry.valueType) && !isNumeric(entry.valueType) && value.trim() === '') {
      toast.error(t('validation.valueRequired'));
      return;
    }

    onSave(entry.key, {
      value: isBool(entry.valueType) ? value : value.trim(),
      description: description.trim() || null,
      isActive,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('modal.title')} size="md">
      <div className="space-y-4 p-6">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{t('fields.key')}</p>
          <p className="font-mono text-sm text-gray-900">{entry.key}</p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.value')}
            <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-500">
              {entry.valueType}
            </span>
          </label>
          {isBool(entry.valueType) ? (
            <select value={value} onChange={e => setValue(e.target.value)} className={inputClass}>
              <option value="true">true</option>
              <option value="false">false</option>
            </select>
          ) : (
            <input
              type={isNumeric(entry.valueType) ? 'number' : 'text'}
              step={normaliseType(entry.valueType) === 'decimal' ? 'any' : undefined}
              value={value}
              onChange={e => setValue(e.target.value)}
              className={inputClass + (isNumeric(entry.valueType) ? '' : ' font-mono')}
            />
          )}
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.description')}
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            className={inputClass}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          {t('fields.isActive')}
        </label>
        <p className="text-xs text-gray-400">{t('hints.isActive')}</p>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" type="button" onClick={onClose}>
            {t('common:actions.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="button" onClick={handleSave} isLoading={isSaving}>
            {t('common:actions.save', { defaultValue: 'Save' })}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

const SystemConfigurationPage = () => {
  const { t } = useTranslation('systemConfiguration');
  const [editing, setEditing] = useState<SystemConfigurationDto | null>(null);
  const [search, setSearch] = useState('');
  const modal = useDisclosure();

  const { data: entries = [], isLoading } = useListSystemConfigurations();
  const update = useUpdateSystemConfiguration();

  const grouped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const matches = needle
      ? entries.filter(
          e =>
            e.key.toLowerCase().includes(needle) ||
            (e.description ?? '').toLowerCase().includes(needle),
        )
      : entries;

    const byCategory = new Map<string, SystemConfigurationDto[]>();
    for (const entry of matches) {
      const category = entry.category?.trim() || UNCATEGORISED;
      const bucket = byCategory.get(category);
      if (bucket) bucket.push(entry);
      else byCategory.set(category, [entry]);
    }
    return [...byCategory.entries()]
      .map(([category, rows]) => ({
        category,
        rows: [...rows].sort((a, b) => a.key.localeCompare(b.key)),
      }))
      .sort((a, b) => a.category.localeCompare(b.category));
  }, [entries, search]);

  const handleEdit = (entry: SystemConfigurationDto) => {
    setEditing(entry);
    modal.onOpen();
  };

  const handleSave = (key: string, body: UpdateSystemConfigurationBody) => {
    update.mutate(
      { key, body },
      {
        onSuccess: () => {
          toast.success(t('toasts.updated'));
          modal.onClose();
        },
        onError: (err: unknown) => {
          const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
          toast.error(detail || t('toasts.saveFailed'));
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
      </div>

      <div className="max-w-sm">
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('page.searchPlaceholder')}
          className={inputClass}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      ) : grouped.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          {search ? t('page.noMatches') : t('page.empty')}
        </p>
      ) : (
        grouped.map(({ category, rows }) => (
          <div
            key={category}
            className="overflow-x-auto rounded-lg border border-gray-200 bg-white"
          >
            <p className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase text-gray-500">
              {category === UNCATEGORISED ? t('page.uncategorised') : category}
            </p>
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <tbody className="divide-y divide-gray-100 bg-white">
                {rows.map(entry => (
                  <tr
                    key={entry.key}
                    className={entry.isActive ? 'hover:bg-gray-50' : 'bg-gray-50/60'}
                  >
                    <td className="px-4 py-3 align-top">
                      <p className="font-mono text-xs font-medium text-gray-900">{entry.key}</p>
                      {entry.description && (
                        <p className="mt-0.5 text-xs text-gray-500">{entry.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-mono text-sm text-gray-800">{entry.value}</span>
                      <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-400">
                        {entry.valueType}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {!entry.isActive && (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                          {t('status.inactive')}
                        </span>
                      )}
                    </td>
                    <td className="w-16 px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label={t('actions.edit')}
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}

      <EditModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        entry={editing}
        onSave={handleSave}
        isSaving={update.isPending}
      />
    </div>
  );
};

export default SystemConfigurationPage;

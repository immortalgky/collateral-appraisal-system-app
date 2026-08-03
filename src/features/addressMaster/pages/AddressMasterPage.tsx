import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import ConfirmDialog from '@shared/components/ConfirmDialog';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import {
  useCreateDistrict,
  useCreateProvince,
  useCreateSubDistrict,
  useDeleteDistrict,
  useDeleteProvince,
  useDeleteSubDistrict,
  useDistricts,
  useProvinces,
  useSubDistricts,
  useUpdateDistrict,
  useUpdateProvince,
  useUpdateSubDistrict,
  type AddressDataset,
} from '../api/addressMaster';

const inputClass =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none';

type Level = 'province' | 'district' | 'subDistrict';

const CODE_LENGTH: Record<Level, number> = { province: 2, district: 4, subDistrict: 6 };

/** Shape the edit dialog works with, flattened across the three levels. */
interface RowDraft {
  code: string;
  nameTh: string;
  nameEn: string;
  postcode: string;
}

const emptyDraft: RowDraft = { code: '', nameTh: '', nameEn: '', postcode: '' };

const apiDetail = (err: unknown) => (err as { apiError?: { detail?: string } })?.apiError?.detail;

// ──────────────────────────────────────────────────────────────────────────────
// Row editor
// ──────────────────────────────────────────────────────────────────────────────

interface RowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  level: Level;
  /** null = creating */
  editing: RowDraft | null;
  onSave: (draft: RowDraft) => void;
  isSaving: boolean;
}

function RowDialog({ isOpen, onClose, level, editing, onSave, isSaving }: RowDialogProps) {
  const { t } = useTranslation(['addressMaster', 'common']);
  const [draft, setDraft] = useState<RowDraft>(emptyDraft);

  useEffect(() => setDraft(editing ?? emptyDraft), [editing, isOpen]);

  const isEditing = editing !== null;
  const maxCode = CODE_LENGTH[level];

  const set = (key: keyof RowDraft) => (value: string) =>
    setDraft(prev => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!draft.code.trim()) {
      toast.error(t('validation.codeRequired'));
      return;
    }
    if (draft.code.trim().length > maxCode) {
      toast.error(t('validation.codeTooLong', { max: maxCode }));
      return;
    }
    if (!draft.nameTh.trim() || !draft.nameEn.trim()) {
      toast.error(t('validation.namesRequired'));
      return;
    }
    onSave({
      code: draft.code.trim(),
      nameTh: draft.nameTh.trim(),
      nameEn: draft.nameEn.trim(),
      postcode: draft.postcode.trim(),
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? t(`dialog.edit.${level}`) : t(`dialog.add.${level}`)}
      size="sm"
    >
      <div className="space-y-4 p-6">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">{t('fields.code')}</label>
          <input
            type="text"
            value={draft.code}
            maxLength={maxCode}
            // The code is the natural key that child rows and stored geocodes point at, so the
            // backend fixes it at creation.
            disabled={isEditing}
            onChange={e => set('code')(e.target.value)}
            className={inputClass + ' font-mono' + (isEditing ? ' bg-gray-50 text-gray-500' : '')}
          />
          <p className="mt-1 text-xs text-gray-400">
            {isEditing ? t('hints.codeImmutable') : t('hints.code', { max: maxCode })}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.nameTh')}
          </label>
          <input
            type="text"
            value={draft.nameTh}
            onChange={e => set('nameTh')(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('fields.nameEn')}
          </label>
          <input
            type="text"
            value={draft.nameEn}
            onChange={e => set('nameEn')(e.target.value)}
            className={inputClass}
          />
        </div>

        {level === 'subDistrict' && (
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              {t('fields.postcode')}
            </label>
            <input
              type="text"
              value={draft.postcode}
              maxLength={5}
              onChange={e => set('postcode')(e.target.value)}
              className={inputClass + ' font-mono'}
            />
            <p className="mt-1 text-xs text-gray-400">{t('hints.postcode')}</p>
          </div>
        )}

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
// Drill-down column
// ──────────────────────────────────────────────────────────────────────────────

interface ColumnRow {
  code: string;
  nameTh: string;
  nameEn: string;
  /** Rendered under the name — child count, or postcode for sub-districts. */
  meta?: string;
}

const RowLabel = ({ row }: { row: ColumnRow }) => (
  <>
    <p className="truncate text-sm text-gray-900">
      <span className="mr-1.5 font-mono text-xs text-gray-400">{row.code}</span>
      {row.nameTh}
    </p>
    <p className="truncate text-xs text-gray-400">
      {row.nameEn}
      {row.meta ? ` · ${row.meta}` : ''}
    </p>
  </>
);

interface ColumnProps {
  title: string;
  rows: ColumnRow[];
  isLoading: boolean;
  /** Null disables the whole column (its parent has not been picked yet). */
  selectedCode: string | null;
  onSelect?: (code: string) => void;
  onAdd: () => void;
  onEdit: (code: string) => void;
  onDelete: (code: string) => void;
  disabled: boolean;
  disabledHint: string;
  emptyHint: string;
}

function Column({
  title,
  rows,
  isLoading,
  selectedCode,
  onSelect,
  onAdd,
  onEdit,
  onDelete,
  disabled,
  disabledHint,
  emptyHint,
}: ColumnProps) {
  const { t } = useTranslation('addressMaster');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      r =>
        r.code.toLowerCase().includes(needle) ||
        r.nameTh.toLowerCase().includes(needle) ||
        r.nameEn.toLowerCase().includes(needle),
    );
  }, [rows, search]);

  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-gray-200 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <p className="text-xs font-semibold uppercase text-gray-500">
          {title}
          {!disabled && <span className="ml-1.5 text-gray-400">({rows.length})</span>}
        </p>
        <Button size="sm" variant="ghost" type="button" onClick={onAdd} disabled={disabled}>
          <Icon name="plus" style="solid" className="size-3.5" />
        </Button>
      </div>

      {disabled ? (
        <p className="px-3 py-6 text-center text-xs text-gray-400">{disabledHint}</p>
      ) : (
        <>
          <div className="border-b border-gray-100 p-2">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={t('search')}
              className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs outline-none focus:border-primary"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="spinner" style="solid" className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-gray-400">
              {rows.length === 0 ? emptyHint : t('noMatches')}
            </p>
          ) : (
            // Long lists (a province can hold hundreds of sub-districts) scroll inside the column.
            <ul className="min-h-0 flex-1 divide-y divide-gray-50 overflow-y-auto">
              {filtered.map(row => {
                const isSelected = selectedCode === row.code;
                return (
                  <li
                    key={row.code}
                    className={`group flex items-center gap-2 px-3 ${
                      isSelected ? 'bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* A real button so the drill-down is keyboard reachable; the last column
                        has no child level, so it renders as static text instead. */}
                    {onSelect ? (
                      <button
                        type="button"
                        onClick={() => onSelect(row.code)}
                        aria-current={isSelected}
                        className="min-w-0 flex-1 py-2 text-left"
                      >
                        <RowLabel row={row} />
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1 py-2">
                        <RowLabel row={row} />
                      </div>
                    )}
                    <div className="flex items-center gap-0.5 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => onEdit(row.code)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        aria-label={`${t('actions.edit')} ${row.code}`}
                      >
                        <Icon name="pen" style="solid" className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(row.code)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        aria-label={`${t('actions.delete')} ${row.code}`}
                      >
                        <Icon name="trash" style="solid" className="size-3" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Page
// ──────────────────────────────────────────────────────────────────────────────

const DATASETS: { value: AddressDataset; labelKey: 'title' | 'dopa' }[] = [
  { value: 'title', labelKey: 'title' },
  { value: 'dopa', labelKey: 'dopa' },
];

const AddressMasterPage = () => {
  const { t } = useTranslation(['addressMaster', 'common']);

  const [dataset, setDataset] = useState<AddressDataset>('title');
  const [provinceCode, setProvinceCode] = useState<string | null>(null);
  const [districtCode, setDistrictCode] = useState<string | null>(null);

  // Codes are only unique within a dataset, so any carried-over selection is meaningless.
  useEffect(() => {
    setProvinceCode(null);
    setDistrictCode(null);
  }, [dataset]);

  const provinces = useProvinces(dataset);
  const districts = useDistricts(dataset, provinceCode);
  const subDistricts = useSubDistricts(dataset, districtCode);

  const createProvince = useCreateProvince(dataset);
  const updateProvince = useUpdateProvince(dataset);
  const deleteProvince = useDeleteProvince(dataset);
  const createDistrict = useCreateDistrict(dataset);
  const updateDistrict = useUpdateDistrict(dataset);
  const deleteDistrict = useDeleteDistrict(dataset);
  const createSubDistrict = useCreateSubDistrict(dataset);
  const updateSubDistrict = useUpdateSubDistrict(dataset);
  const deleteSubDistrict = useDeleteSubDistrict(dataset);

  const dialog = useDisclosure();
  const [dialogLevel, setDialogLevel] = useState<Level>('province');
  const [editingDraft, setEditingDraft] = useState<RowDraft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ level: Level; code: string } | null>(null);

  const openAdd = (level: Level) => {
    setDialogLevel(level);
    setEditingDraft(null);
    dialog.onOpen();
  };

  const openEdit = (level: Level, code: string) => {
    const row =
      level === 'province'
        ? provinces.data?.find(p => p.code === code)
        : level === 'district'
          ? districts.data?.find(d => d.code === code)
          : subDistricts.data?.find(s => s.code === code);
    if (!row) return;
    setDialogLevel(level);
    setEditingDraft({
      code: row.code,
      nameTh: row.nameTh,
      nameEn: row.nameEn,
      postcode: 'postcode' in row ? (row.postcode ?? '') : '',
    });
    dialog.onOpen();
  };

  const isSaving =
    createProvince.isPending ||
    updateProvince.isPending ||
    createDistrict.isPending ||
    updateDistrict.isPending ||
    createSubDistrict.isPending ||
    updateSubDistrict.isPending;

  const handleSave = (draft: RowDraft) => {
    const onSuccess = () => {
      toast.success(editingDraft ? t('toasts.updated') : t('toasts.created'));
      dialog.onClose();
    };
    const onError = (err: unknown) => toast.error(apiDetail(err) || t('toasts.saveFailed'));
    const common = { code: draft.code, nameTh: draft.nameTh, nameEn: draft.nameEn };

    if (dialogLevel === 'province') {
      if (editingDraft)
        updateProvince.mutate({ code: draft.code, body: common }, { onSuccess, onError });
      else createProvince.mutate(common, { onSuccess, onError });
      return;
    }

    if (dialogLevel === 'district') {
      if (!provinceCode) return;
      const body = { ...common, provinceCode };
      if (editingDraft) updateDistrict.mutate({ code: draft.code, body }, { onSuccess, onError });
      else createDistrict.mutate(body, { onSuccess, onError });
      return;
    }

    if (!districtCode) return;
    const body = { ...common, districtCode, postcode: draft.postcode || null };
    if (editingDraft) updateSubDistrict.mutate({ code: draft.code, body }, { onSuccess, onError });
    else createSubDistrict.mutate(body, { onSuccess, onError });
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    const { level, code } = pendingDelete;
    const onSuccess = () => {
      toast.success(t('toasts.deleted'));
      setPendingDelete(null);
      // Clear a selection that no longer exists.
      if (level === 'province' && provinceCode === code) {
        setProvinceCode(null);
        setDistrictCode(null);
      }
      if (level === 'district' && districtCode === code) setDistrictCode(null);
    };
    // The backend blocks a delete whose children still exist and says how many — show that.
    const onError = (err: unknown) => toast.error(apiDetail(err) || t('toasts.deleteFailed'));

    if (level === 'province') deleteProvince.mutate(code, { onSuccess, onError });
    else if (level === 'district') deleteDistrict.mutate(code, { onSuccess, onError });
    else deleteSubDistrict.mutate(code, { onSuccess, onError });
  };

  const isDeleting =
    deleteProvince.isPending || deleteDistrict.isPending || deleteSubDistrict.isPending;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
        <p className="mt-0.5 text-xs text-gray-500">{t('page.subtitle')}</p>
      </div>

      {/* Dataset switch */}
      <div className="flex flex-wrap gap-2">
        {DATASETS.map(d => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDataset(d.value)}
            className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              dataset === d.value
                ? 'border-primary bg-primary text-white'
                : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
            }`}
          >
            {t(`dataset.${d.labelKey}`)}
          </button>
        ))}
      </div>
      <p className="-mt-2 text-xs text-gray-400">{t(`dataset.${dataset}Hint`)}</p>

      {/* Drill-down */}
      <div className="flex h-[32rem] gap-4">
        <Column
          title={t('columns.provinces')}
          rows={(provinces.data ?? []).map(p => ({
            code: p.code,
            nameTh: p.nameTh,
            nameEn: p.nameEn,
            meta: t('meta.districts', { count: p.districtCount }),
          }))}
          isLoading={provinces.isLoading}
          selectedCode={provinceCode}
          onSelect={code => {
            setProvinceCode(code);
            setDistrictCode(null);
          }}
          onAdd={() => openAdd('province')}
          onEdit={code => openEdit('province', code)}
          onDelete={code => setPendingDelete({ level: 'province', code })}
          disabled={false}
          disabledHint=""
          emptyHint={t('empty.provinces')}
        />

        <Column
          title={t('columns.districts')}
          rows={(districts.data ?? []).map(d => ({
            code: d.code,
            nameTh: d.nameTh,
            nameEn: d.nameEn,
            meta: t('meta.subDistricts', { count: d.subDistrictCount }),
          }))}
          isLoading={districts.isLoading}
          selectedCode={districtCode}
          onSelect={setDistrictCode}
          onAdd={() => openAdd('district')}
          onEdit={code => openEdit('district', code)}
          onDelete={code => setPendingDelete({ level: 'district', code })}
          disabled={!provinceCode}
          disabledHint={t('disabled.districts')}
          emptyHint={t('empty.districts')}
        />

        <Column
          title={t('columns.subDistricts')}
          rows={(subDistricts.data ?? []).map(s => ({
            code: s.code,
            nameTh: s.nameTh,
            nameEn: s.nameEn,
            meta: s.postcode ?? t('meta.noPostcode'),
          }))}
          isLoading={subDistricts.isLoading}
          selectedCode={null}
          onAdd={() => openAdd('subDistrict')}
          onEdit={code => openEdit('subDistrict', code)}
          onDelete={code => setPendingDelete({ level: 'subDistrict', code })}
          disabled={!districtCode}
          disabledHint={t('disabled.subDistricts')}
          emptyHint={t('empty.subDistricts')}
        />
      </div>

      <RowDialog
        isOpen={dialog.isOpen}
        onClose={dialog.onClose}
        level={dialogLevel}
        editing={editingDraft}
        onSave={handleSave}
        isSaving={isSaving}
      />

      <ConfirmDialog
        isOpen={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        isLoading={isDeleting}
        variant="danger"
        title={t('confirm.title')}
        confirmText={t('actions.delete')}
        message={
          pendingDelete
            ? pendingDelete.level === 'subDistrict'
              ? t('confirm.subDistrict', { code: pendingDelete.code })
              : t('confirm.parent', { code: pendingDelete.code })
            : ''
        }
      />
    </div>
  );
};

export default AddressMasterPage;

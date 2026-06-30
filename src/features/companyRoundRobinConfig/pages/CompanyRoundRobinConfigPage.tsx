import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { useCompaniesQuery, type CompanyOption } from '@shared/api/companies';
import {
  useListCompanyRoundRobinConfigs,
  useCreateCompanyRoundRobinConfig,
  useUpdateCompanyRoundRobinConfig,
  useDeleteCompanyRoundRobinConfig,
  type CompanyRoundRobinConfigDto,
  type CompanyWeight,
  type SaveCompanyRoundRobinConfigBody,
} from '../api/companyRoundRobinConfig';

// ──────────────────────────────────────────────────────────────────────────────
// Modal
// ──────────────────────────────────────────────────────────────────────────────

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  editing: CompanyRoundRobinConfigDto | null;
  companies: CompanyOption[];
  companiesError: boolean;
  onRetryCompanies: () => void;
  onSave: (body: SaveCompanyRoundRobinConfigBody, id?: string) => void;
  isSaving: boolean;
}

function ConfigModal({
  isOpen,
  onClose,
  editing,
  companies,
  companiesError,
  onRetryCompanies,
  onSave,
  isSaving,
}: ConfigModalProps) {
  const { t } = useTranslation('companyRoundRobinConfig');
  const [loanType, setLoanType] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [entries, setEntries] = useState<CompanyWeight[]>([]);
  const [pickCompanyId, setPickCompanyId] = useState('');

  useEffect(() => {
    setLoanType(editing?.loanType ?? '');
    setIsActive(editing?.isActive ?? true);
    setEntries(editing?.entries ?? []);
    setPickCompanyId('');
  }, [editing, isOpen]);

  const nameOf = useMemo(() => {
    const map = new Map(companies.map(c => [c.id, c.companyName]));
    return (id: string) => map.get(id) ?? id;
  }, [companies]);

  const availableCompanies = companies.filter(c => !entries.some(e => e.companyId === c.id));

  const addCompany = () => {
    if (!pickCompanyId) return;
    setEntries(prev => [...prev, { companyId: pickCompanyId, weight: 1 }]);
    setPickCompanyId('');
  };

  const setWeight = (companyId: string, weight: number) =>
    setEntries(prev => prev.map(e => (e.companyId === companyId ? { ...e, weight } : e)));

  const removeEntry = (companyId: string) =>
    setEntries(prev => prev.filter(e => e.companyId !== companyId));

  const handleSave = () => {
    if (entries.length === 0) {
      toast.error(t('toasts.atLeastOne'));
      return;
    }
    onSave(
      {
        loanType: loanType.trim() || null,
        isActive,
        entries: entries.map(e => ({
          companyId: e.companyId,
          weight: e.weight < 1 ? 1 : e.weight,
        })),
      },
      editing?.id,
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editing ? t('modal.editTitle') : t('modal.addTitle')}
      size="lg"
    >
      <div className="space-y-4 p-6">
        {/* Loan-type scope */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('modal.loanTypeLabel')}
          </label>
          <input
            type="text"
            value={loanType}
            onChange={e => setLoanType(e.target.value)}
            placeholder={t('modal.loanTypePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary/20"
          />
          <p className="text-xs text-gray-400 mt-1">{t('modal.loanTypeHint')}</p>
        </div>

        {/* Company picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('modal.companies')}
          </label>
          <div className="flex gap-2">
            <select
              value={pickCompanyId}
              onChange={e => setPickCompanyId(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">{t('modal.selectCompany')}</option>
              {availableCompanies.map(c => (
                <option key={c.id} value={c.id}>
                  {c.companyName}
                </option>
              ))}
            </select>
            <Button size="sm" type="button" onClick={addCompany} disabled={!pickCompanyId}>
              <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
              {t('modal.addCompany')}
            </Button>
          </div>
          {companiesError && (
            <p className="text-xs text-red-600 mt-1 flex items-center gap-1.5">
              {t('modal.companiesLoadError')}
              <button
                type="button"
                onClick={onRetryCompanies}
                className="underline hover:text-red-700"
              >
                {t('modal.retry')}
              </button>
            </p>
          )}
        </div>

        {/* Entry rows */}
        {entries.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">{t('modal.noCompanies')}</p>
        ) : (
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
            {entries.map(entry => (
              <div key={entry.companyId} className="flex items-center gap-3 px-3 py-2">
                <span className="flex-1 text-sm text-gray-700">{nameOf(entry.companyId)}</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">{t('modal.weight')}</span>
                  <input
                    type="number"
                    min={1}
                    value={entry.weight}
                    onChange={e => setWeight(entry.companyId, Number(e.target.value))}
                    className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeEntry(entry.companyId)}
                  className="p-1 text-gray-400 hover:text-red-600"
                  title={t('modal.remove')}
                >
                  <Icon name="trash" style="solid" className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Active toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-gray-300 text-primary focus:ring-primary/20"
          />
          {t('modal.isActive')}
        </label>

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

const CompanyRoundRobinConfigPage = () => {
  const { t } = useTranslation('companyRoundRobinConfig');
  const [editing, setEditing] = useState<CompanyRoundRobinConfigDto | null>(null);
  const modal = useDisclosure();

  const { data: configs = [], isLoading } = useListCompanyRoundRobinConfigs();
  const { data: companies = [], isError: companiesError, refetch: refetchCompanies } =
    useCompaniesQuery();

  const createConfig = useCreateCompanyRoundRobinConfig();
  const updateConfig = useUpdateCompanyRoundRobinConfig();
  const deleteConfig = useDeleteCompanyRoundRobinConfig();

  const scopeLabel = (row: CompanyRoundRobinConfigDto) =>
    row.loanType ? t('scope.loanType', { loanType: row.loanType }) : t('scope.global');

  const handleAdd = () => {
    setEditing(null);
    modal.onOpen();
  };

  const handleEdit = (row: CompanyRoundRobinConfigDto) => {
    setEditing(row);
    modal.onOpen();
  };

  const handleDelete = (row: CompanyRoundRobinConfigDto) => {
    if (!confirm(t('confirm.delete', { scope: scopeLabel(row) }))) return;
    deleteConfig.mutate(row.id, {
      onSuccess: () => toast.success(t('toasts.deleted')),
      onError: () => toast.error(t('toasts.deleteFailed')),
    });
  };

  const handleSave = (body: SaveCompanyRoundRobinConfigBody, id?: string) => {
    const onSuccess = () => {
      toast.success(id ? t('toasts.updated') : t('toasts.created'));
      modal.onClose();
    };
    const onError = (err: unknown) => {
      const detail = (err as { apiError?: { detail?: string } })?.apiError?.detail;
      toast.error(detail || t('toasts.saveFailed'));
    };
    if (id) updateConfig.mutate({ id, body }, { onSuccess, onError });
    else createConfig.mutate(body, { onSuccess, onError });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{t('page.title')}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('page.subtitle')}</p>
        </div>
        <Button size="sm" type="button" onClick={handleAdd}>
          <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
          {t('actions.addPool')}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[t('table.scope'), t('table.companies'), t('table.status'), ''].map((h, i) => (
                  <th
                    key={i}
                    className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 uppercase last:w-20"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {configs.map(row => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{scopeLabel(row)}</p>
                    <p className="text-xs text-gray-400 font-mono">{row.id}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.entries.length}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {row.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(row)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <Icon name="pen" style="solid" className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <Icon name="trash" style="solid" className="size-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfigModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        editing={editing}
        companies={companies}
        companiesError={companiesError}
        onRetryCompanies={() => refetchCompanies()}
        onSave={handleSave}
        isSaving={createConfig.isPending || updateConfig.isPending}
      />
    </div>
  );
};

export default CompanyRoundRobinConfigPage;

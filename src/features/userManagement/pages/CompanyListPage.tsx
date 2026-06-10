import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import SectionHeader from '@shared/components/sections/SectionHeader';
import Button from '@shared/components/Button';
import Icon from '@shared/components/Icon';
import Modal from '@shared/components/Modal';
import TextInput from '@shared/components/inputs/TextInput';
import { TableRowSkeleton } from '@shared/components/Skeleton';
import CompanyDetailPanel from '../components/CompanyDetailPanel';
import { useGetAdminCompanies, useCreateAdminCompany } from '../api/companies';

const CompanyListPage = () => {
  const { t } = useTranslation(['userManagement', 'common']);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, isLoading } = useGetAdminCompanies({
    search: debouncedSearch || undefined,
    pageNumber: 1,
    pageSize: 50,
  });

  const companies = data?.companies ?? [];
  const createCompany = useCreateAdminCompany();

  const handleOpenCreate = () => {
    setCreateForm({ name: '' });
    setShowCreateModal(true);
  };

  const handleCreate = () => {
    if (!createForm.name) {
      toast.error(t('validation.nameRequired'));
      return;
    }
    createCompany.mutate(
      { name: createForm.name, isActive: true },
      {
        onSuccess: (data: any) => {
          toast.success(t('toasts.companyCreated'));
          setShowCreateModal(false);
          if (data?.id) setSelectedCompanyId(data.id);
        },
        onError: () => toast.error(t('toasts.companyCreateFailed')),
      },
    );
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-4">
      <SectionHeader
        title={t('page.companies.title')}
        subtitle={t('page.companies.subtitle')}
        icon="building"
        iconColor="emerald"
      />

      <div className="flex gap-4">
        {/* Left panel */}
        <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
          {/* Search + Add */}
          <div className="px-3 pt-3 pb-2 flex gap-2">
            <div className="relative flex-1">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('placeholders.searchCompanies')}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
            <button
              type="button"
              onClick={handleOpenCreate}
              title={t('aria.addCompany')}
              aria-label={t('aria.addCompany')}
              className="shrink-0 size-7 flex items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/80 transition-colors"
            >
              <Icon name="plus" style="solid" className="size-3.5" />
            </button>
          </div>

          {/* Company list */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)] divide-y divide-gray-50">
            {isLoading ? (
              <table className="w-full">
                <tbody>
                  <TableRowSkeleton columns={[{ width: 'w-full' }]} rows={6} />
                </tbody>
              </table>
            ) : companies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400 text-xs gap-1">
                <Icon name="building" style="regular" className="size-7 opacity-40" />
                <span>{t('empty.noCompaniesFound')}</span>
              </div>
            ) : (
              companies.map(company => (
                <button
                  key={company.id}
                  type="button"
                  onClick={() => setSelectedCompanyId(company.id)}
                  className={clsx(
                    'w-full text-left px-3 py-2.5 transition-colors',
                    selectedCompanyId === company.id
                      ? 'bg-primary/5 border-l-2 border-primary'
                      : 'hover:bg-gray-50 border-l-2 border-transparent',
                  )}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="text-sm font-medium text-gray-800 truncate">{company.name}</div>
                    {!company.isActive && (
                      <span className="shrink-0 text-xs text-gray-400">{t('status.inactive')}</span>
                    )}
                  </div>
                  {company.phone && (
                    <div className="text-xs text-gray-400 truncate mt-0.5">{company.phone}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto">
          {selectedCompanyId ? (
            <CompanyDetailPanel
              key={selectedCompanyId}
              companyId={selectedCompanyId}
              onDeleted={() => setSelectedCompanyId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-2">
              <Icon name="building" style="regular" className="size-12 opacity-30" />
              <p className="text-sm">{t('empty.selectCompany')}</p>
            </div>
          )}
        </div>
      </div>

      {/* Create Company Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title={t('dialogs.createCompany.title')}
        size="sm"
      >
        <div className="grid grid-cols-1 gap-4 p-6">
          <TextInput
            label={t('fields.companyName')}
            value={createForm.name}
            onChange={e => {
              const value = e.currentTarget.value;
              setCreateForm(prev => ({ ...prev, name: value }));
            }}
            required
            placeholder={t('placeholders.companyName')}
          />
        </div>
        <div className="flex justify-end gap-2 px-6 pb-6">
          <Button variant="ghost" size="sm" onClick={() => setShowCreateModal(false)}>
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            isLoading={createCompany.isPending}
            onClick={handleCreate}
          >
            {t('buttons.create')}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CompanyListPage;

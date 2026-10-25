import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Input from '@/shared/components/Input';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import type { ExternalCompany } from '../types/administration';
import StarRating from '@/features/serviceQualityEvaluation/components/StarRating';

interface SearchCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: ExternalCompany) => void;
  /** Pre-loaded list from useGetEligibleCompanies. When provided, filtering is client-side. */
  eligibleCompanies?: ExternalCompany[];
  /**
   * The company that did the prior inspection (Construction Inspection): its row is tagged with
   * `badge` (the text carries the inspection number when there is one).
   */
  previousCompany?: { id: string; badge: string } | null;
}

const SearchCompanyModal = ({
  isOpen,
  onClose,
  onSelect,
  eligibleCompanies,
  previousCompany,
}: SearchCompanyModalProps) => {
  const { t } = useTranslation(['appraisal', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<ExternalCompany | null>(null);
  const localizeCompanyName = useLocalizedCompanyName();

  const isLoading = eligibleCompanies === undefined;

  const companyList = useMemo(() => {
    if (!eligibleCompanies) return [];
    if (!searchQuery.trim()) return eligibleCompanies;
    const query = searchQuery.toLowerCase();
    return eligibleCompanies.filter(
      company =>
        company.companyName.toLowerCase().includes(query) ||
        company.companyNameLocal?.toLowerCase().includes(query) ||
        company.registrationNo.toLowerCase().includes(query) ||
        company.contactPerson.toLowerCase().includes(query),
    );
  }, [eligibleCompanies, searchQuery]);

  const handleSelect = () => {
    if (selectedCompany) {
      onSelect(selectedCompany);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedCompany(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('administration.modal.company.title')}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder={t('administration.modal.company.search')}
          aria-label={t('administration.modal.company.search')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
        />

        {/* Results List */}
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                <Icon name="spinner" style="solid" className="mx-auto mb-2 animate-spin text-xl" />
                {t('administration.modal.company.loading')}
              </div>
            ) : companyList.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {t('administration.modal.company.empty')}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {companyList.map(company => {
                  const notAssignable = company.isAssignable === false;
                  const isSelected = selectedCompany?.id === company.id;
                  return (
                    <button
                      key={company.id}
                      type="button"
                      disabled={notAssignable}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedCompany(company)}
                      className={clsx(
                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                        notAssignable
                          ? 'cursor-not-allowed bg-gray-50 opacity-60'
                          : isSelected
                            ? 'bg-primary-50'
                            : 'hover:bg-primary-50/60',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="text-sm font-semibold text-gray-900">
                            {localizeCompanyName(company.companyName, company.companyNameLocal)}
                          </span>
                          {company.id === previousCompany?.id && (
                            <Badge tone="purple" dot={false} className="whitespace-nowrap">
                              {previousCompany.badge}
                            </Badge>
                          )}
                        </div>
                        {/* Only what exists: no empty parentheses, stars or icons. */}
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          {company.registrationNo && (
                            <span>
                              {t('administration.modal.company.registrationNo', {
                                no: company.registrationNo,
                              })}
                            </span>
                          )}
                          {company.rating > 0 && (
                            <span className="flex items-center gap-1">
                              <StarRating score={company.rating} />
                              <span>({company.rating.toFixed(1)})</span>
                            </span>
                          )}
                          {company.contactPerson && <span>{company.contactPerson}</span>}
                          {company.contactPhone && <span>{company.contactPhone}</span>}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        {notAssignable ? (
                          <Badge tone="red" dot={false} className="whitespace-nowrap">
                            {t('administration.modal.company.mouExpired')}
                          </Badge>
                        ) : (
                          <Badge tone="green" dot={false} className="whitespace-nowrap">
                            {t('administration.activeCount', { count: company.activeAssignments })}
                          </Badge>
                        )}
                        {isSelected && (
                          <Icon
                            name="circle-check"
                            style="solid"
                            className="shrink-0 text-lg text-primary-600"
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={handleSelect} disabled={!selectedCompany}>
            <Icon name="check" style="solid" className="mr-2" />
            {t('administration.modal.select')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchCompanyModal;

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Input from '@/shared/components/Input';
import type { InternalStaff } from '../types/administration';
import { workloadTone } from '../utils/workloadTone';

interface SearchStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (staff: InternalStaff) => void;
  /** Pre-loaded list from useGetEligibleStaff. When provided, filtering is client-side. */
  eligibleStaff?: InternalStaff[];
}

const SearchStaffModal = ({ isOpen, onClose, onSelect, eligibleStaff }: SearchStaffModalProps) => {
  const { t } = useTranslation(['appraisal', 'common']);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStaff, setSelectedStaff] = useState<InternalStaff | null>(null);

  const isLoading = eligibleStaff === undefined;

  const staffList = useMemo(() => {
    if (!eligibleStaff) return [];
    if (!searchQuery.trim()) return eligibleStaff;
    const query = searchQuery.toLowerCase();
    return eligibleStaff.filter(
      staff =>
        staff.name.toLowerCase().includes(query) ||
        staff.employeeId.toLowerCase().includes(query) ||
        staff.department.toLowerCase().includes(query),
    );
  }, [eligibleStaff, searchQuery]);

  const handleSelect = () => {
    if (selectedStaff) {
      onSelect(selectedStaff);
      handleClose();
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedStaff(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('administration.modal.staff.title')}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        <Input
          type="text"
          placeholder={t('administration.modal.staff.search')}
          aria-label={t('administration.modal.staff.search')}
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          leftIcon={<Icon name="magnifying-glass" style="regular" className="text-sm" />}
        />

        {/* Results List */}
        <div className="overflow-hidden rounded-lg border border-(--palette-line)">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-sm text-(--palette-gray-500)">
                <Icon name="spinner" style="solid" className="mx-auto mb-2 animate-spin text-xl" />
                {t('administration.modal.staff.loading')}
              </div>
            ) : staffList.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-(--palette-gray-500)">
                {t('administration.modal.staff.empty')}
              </div>
            ) : (
              <div className="divide-y divide-(--palette-line-soft)">
                {staffList.map(staff => {
                  const isSelected = selectedStaff?.id === staff.id;
                  // Only what exists: no empty code or department.
                  const detail = [
                    staff.employeeId
                      ? t('administration.modal.staff.code', { code: staff.employeeId })
                      : null,
                    staff.department || null,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelectedStaff(staff)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        isSelected
                          ? 'bg-(--palette-accent-wash)'
                          : 'hover:bg-primary-50/60 dark:hover:bg-primary-500/20',
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-(--palette-ink)">
                          {staff.name}
                        </div>
                        {detail && (
                          <div className="mt-0.5 text-xs text-(--palette-gray-500)">{detail}</div>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-2">
                        <Badge
                          tone={workloadTone(staff.currentWorkload)}
                          dot={false}
                          className="whitespace-nowrap"
                        >
                          {t('administration.workload', { count: staff.currentWorkload })}
                        </Badge>
                        {isSelected && (
                          <Icon
                            name="circle-check"
                            style="solid"
                            className="shrink-0 text-lg text-(--palette-primary-text)"
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
          <Button onClick={handleSelect} disabled={!selectedStaff}>
            <Icon name="check" style="solid" className="mr-2" />
            {t('administration.modal.select')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchStaffModal;

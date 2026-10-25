import { useMemo, useState } from 'react';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Avatar from '@/shared/components/Avatar';
import type { InternalStaff } from '../types/administration';

interface SearchStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (staff: InternalStaff) => void;
  /** Pre-loaded list from useGetEligibleStaff. When provided, filtering is client-side. */
  eligibleStaff?: InternalStaff[];
}

const SearchStaffModal = ({ isOpen, onClose, onSelect, eligibleStaff }: SearchStaffModalProps) => {
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Select Staff Member" size="lg">
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--palette-gray-400)"
          />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-(--palette-line) rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Results List */}
        <div className="border border-(--palette-line) rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-(--palette-gray-500)">
                <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading staff...
              </div>
            ) : staffList.length === 0 ? (
              <div className="px-4 py-8 text-center text-(--palette-gray-500)">
                No staff found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-(--palette-line-soft)">
                {staffList.map(staff => (
                  <button
                    key={staff.id}
                    type="button"
                    onClick={() => setSelectedStaff(staff)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedStaff?.id === staff.id
                        ? 'bg-(--palette-accent-wash) hover:bg-primary-100 dark:hover:bg-primary-500/20'
                        : 'hover:bg-(--palette-surface-2)'
                    }`}
                  >
                    {/* Avatar */}
                    <Avatar src={staff.avatar} name={staff.name} size="lg" />

                    {/* Staff Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-(--palette-ink) truncate">
                          {staff.name}
                        </span>
                        <span className="text-xs text-(--palette-gray-400)">
                          ({staff.employeeId})
                        </span>
                      </div>
                      <div className="text-xs text-(--palette-gray-500) truncate">
                        {staff.department}
                      </div>
                    </div>

                    {/* Workload Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          staff.currentWorkload <= 2 &&
                            'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-300',
                          staff.currentWorkload > 2 &&
                            staff.currentWorkload <= 4 &&
                            'bg-(--palette-warn-wash) text-(--palette-warn)',
                          staff.currentWorkload > 4 &&
                            'bg-(--palette-req-wash) text-(--palette-req)',
                        )}
                      >
                        {staff.currentWorkload} tasks
                      </span>
                    </div>

                    {/* Selected Indicator */}
                    {selectedStaff?.id === staff.id && (
                      <Icon
                        name="circle-check"
                        style="solid"
                        className="w-5 h-5 text-(--palette-primary-text)"
                      />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedStaff}>
            <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchStaffModal;

import { useState } from 'react';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useSearchCompanies } from '../api/administration';
import type { ExternalCompany } from '../types/administration';

interface SearchCompanyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (company: ExternalCompany) => void;
}

const SearchCompanyModal = ({ isOpen, onClose, onSelect }: SearchCompanyModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<ExternalCompany | null>(null);

  const { data: companyList = [], isLoading } = useSearchCompanies(searchQuery, isOpen);

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

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Icon
            key={`full-${i}`}
            name="star"
            style="solid"
            className="w-3 h-3 text-amber-400"
          />
        ))}
        {hasHalfStar && (
          <Icon name="star-half-stroke" style="solid" className="w-3 h-3 text-amber-400" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon
            key={`empty-${i}`}
            name="star"
            style="regular"
            className="w-3 h-3 text-gray-300"
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Select External Company" size="lg">
      <div className="flex flex-col gap-4">
        {/* Search Input */}
        <div className="relative">
          <Icon
            name="magnifying-glass"
            style="regular"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="text"
            placeholder="Search by company name or registration number..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        {/* Results List */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Icon name="spinner" style="solid" className="w-5 h-5 animate-spin mx-auto mb-2" />
                Loading companies...
              </div>
            ) : companyList.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                No companies found matching your search.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {companyList.map(company => (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => setSelectedCompany(company)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
                      selectedCompany?.id === company.id
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    {/* Company Icon */}
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <Icon name="building" style="solid" className="w-5 h-5 text-purple-600" />
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {company.companyName}
                        </span>
                        <span className="text-xs text-gray-400">({company.registrationNo})</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        {renderStars(company.rating)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Icon name="user" style="regular" className="w-3 h-3" />
                          {company.contactPerson}
                        </span>
                        <span className="flex items-center gap-1">
                          <Icon name="phone" style="regular" className="w-3 h-3" />
                          {company.contactPhone}
                        </span>
                      </div>
                    </div>

                    {/* Active Assignments */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                        {company.activeAssignments} active
                      </span>
                    </div>

                    {/* Selected Indicator */}
                    {selectedCompany?.id === company.id && (
                      <Icon
                        name="circle-check"
                        style="solid"
                        className="w-5 h-5 text-primary-600 shrink-0"
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
          <Button onClick={handleSelect} disabled={!selectedCompany}>
            <Icon name="check" style="solid" className="w-4 h-4 mr-2" />
            Select
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchCompanyModal;

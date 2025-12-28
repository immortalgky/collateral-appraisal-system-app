import { useState } from 'react';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import { useCreateQuotation, useSearchCompanies } from '../api/administration';
import type { ExternalCompany } from '../types/administration';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  onSuccess?: () => void;
}

const CreateQuotationModal = ({
  isOpen,
  onClose,
  appraisalId,
  onSuccess,
}: CreateQuotationModalProps) => {
  const [selectedCompanies, setSelectedCompanies] = useState<ExternalCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cutOffDateTime, setCutOffDateTime] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const { data: companyList = [], isLoading: isLoadingCompanies } = useSearchCompanies(
    searchQuery,
    isOpen
  );
  const { mutate: createQuotation, isPending } = useCreateQuotation();

  const handleClose = () => {
    setSelectedCompanies([]);
    setSearchQuery('');
    setCutOffDateTime(null);
    setRemarks('');
    onClose();
  };

  const handleToggleCompany = (company: ExternalCompany) => {
    setSelectedCompanies(prev => {
      const isSelected = prev.some(c => c.id === company.id);
      if (isSelected) {
        return prev.filter(c => c.id !== company.id);
      }
      return [...prev, company];
    });
  };

  const handleRemoveCompany = (companyId: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  const handleSubmit = () => {
    if (selectedCompanies.length === 0 || !cutOffDateTime) return;

    createQuotation(
      {
        appraisalId,
        companyIds: selectedCompanies.map(c => c.id),
        cutOffDate: cutOffDateTime,
        remarks: remarks || undefined,
      },
      {
        onSuccess: () => {
          handleClose();
          onSuccess?.();
        },
      }
    );
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

    return (
      <div className="flex items-center gap-0.5">
        {[...Array(fullStars)].map((_, i) => (
          <Icon key={`full-${i}`} name="star" style="solid" className="w-3 h-3 text-amber-400" />
        ))}
        {hasHalfStar && (
          <Icon name="star-half-stroke" style="solid" className="w-3 h-3 text-amber-400" />
        )}
        {[...Array(emptyStars)].map((_, i) => (
          <Icon key={`empty-${i}`} name="star" style="regular" className="w-3 h-3 text-gray-300" />
        ))}
        <span className="text-xs text-gray-500 ml-1">({rating.toFixed(1)})</span>
      </div>
    );
  };

  const isCompanySelected = (companyId: string) => selectedCompanies.some(c => c.id === companyId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Quotation" size="lg">
      <div className="flex flex-col gap-5">
        {/* Selected Companies Display */}
        {selectedCompanies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Selected Companies ({selectedCompanies.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCompanies.map(company => (
                <div
                  key={company.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  <Icon name="building" style="solid" className="size-3.5" />
                  <span className="font-medium">{company.companyName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(company.id)}
                    className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Select External Companies <span className="text-danger">*</span>
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Select one or more companies to send quotation requests
          </p>

          {/* Company search */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Icon
                  name="magnifying-glass"
                  style="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                />
                <input
                  type="text"
                  placeholder="Search company name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm border-0 focus:ring-0 outline-none"
                />
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {isLoadingCompanies ? (
                <div className="px-4 py-6 text-center text-gray-500">
                  <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin mx-auto mb-1" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : companyList.length === 0 ? (
                <div className="px-4 py-6 text-center text-gray-500 text-sm">
                  No companies found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {companyList.map(company => {
                    const isSelected = isCompanySelected(company.id);
                    return (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => handleToggleCompany(company)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'
                        )}
                      >
                        {/* Checkbox */}
                        <div
                          className={clsx(
                            'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 bg-white'
                          )}
                        >
                          {isSelected && (
                            <Icon name="check" style="solid" className="size-3 text-white" />
                          )}
                        </div>

                        {/* Company Info */}
                        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Icon name="building" style="solid" className="size-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {company.companyName}
                          </div>
                          <div className="flex items-center gap-2">
                            {renderStars(company.rating)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cut-off Date & Time */}
        <div>
          <DateTimePickerInput
            label="Cut-off Date & Time"
            required
            helperText="The deadline for companies to submit their quotation responses"
            placeholder="dd/mm/yyyy hh:mm"
            value={cutOffDateTime}
            onChange={setCutOffDateTime}
          />
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Remarks <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Add any special instructions or notes for the quotation..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{remarks.length}/500</p>
        </div>

        {/* Info Box */}
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Icon name="circle-info" style="solid" className="size-4 text-purple-500 mt-0.5" />
            <div className="text-sm text-purple-700">
              <p className="font-medium mb-1">Note</p>
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>This appraisal will be included in the quotation request</li>
                <li>All selected companies will receive this quotation request</li>
                <li>You can add more appraisals to this quotation before sending</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCompanies.length === 0 || !cutOffDateTime || isPending}
            className={clsx(
              selectedCompanies.length > 0 && cutOffDateTime && !isPending
                ? 'bg-purple-600 hover:bg-purple-700'
                : ''
            )}
          >
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Icon name="file-circle-plus" style="solid" className="size-4 mr-2" />
                Create Quotation
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuotationModal;

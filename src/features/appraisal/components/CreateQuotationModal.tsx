import { type ReactNode, useMemo, useState } from 'react';
import clsx from 'clsx';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import toast from 'react-hot-toast';
import { useCreateQuotation, useGetEligibleCompanies } from '../api/administration';

interface CreateQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  appraisalId: string;
  requestId?: string;
  workflowInstanceId?: string;
  bankingSegment?: string;
  appraisalNumber?: string;
  propertyType?: string;
  onSuccess?: () => void;
  /** Optional slot rendered at the top of the modal body (used by QuotationEntryModal to inject the tab bar). */
  headerSlot?: ReactNode;
}

interface SelectedCompany {
  id: string;
  companyName: string;
}

const CreateQuotationModal = ({
  isOpen,
  onClose,
  appraisalId,
  requestId,
  workflowInstanceId,
  bankingSegment,
  appraisalNumber,
  propertyType,
  onSuccess,
  headerSlot,
}: CreateQuotationModalProps) => {
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cutOffDateTime, setCutOffDateTime] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');

  const { data: rawCompanies, isLoading: isLoadingCompanies } = useGetEligibleCompanies(
    bankingSegment,
    isOpen,
  );

  // Map raw company data to the SelectedCompany shape
  const allCompanies: SelectedCompany[] = useMemo(
    () => (rawCompanies ?? []).map(c => ({ id: c.id, companyName: c.companyName })),
    [rawCompanies],
  );

  const companyList = useMemo(() => {
    if (!allCompanies) return [];
    if (!searchQuery.trim()) return allCompanies;
    const query = searchQuery.toLowerCase();
    return allCompanies.filter(c => c.companyName.toLowerCase().includes(query));
  }, [allCompanies, searchQuery]);

  const { mutate: startQuotation, isPending } = useCreateQuotation();

  const handleClose = () => {
    setSelectedCompanies([]);
    setSearchQuery('');
    setCutOffDateTime(null);
    setRemarks('');
    onClose();
  };

  const handleToggleCompany = (company: SelectedCompany) => {
    setSelectedCompanies(prev => {
      const isSelected = prev.some(c => c.id === company.id);
      return isSelected ? prev.filter(c => c.id !== company.id) : [...prev, company];
    });
  };

  const handleRemoveCompany = (companyId: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== companyId));
  };

  const handleSubmit = () => {
    if (selectedCompanies.length === 0 || !cutOffDateTime) return;
    if (!appraisalId || !requestId || !workflowInstanceId) {
      toast.error('Task context is missing. Please reopen the task and try again.');
      return;
    }

    // taskExecutionId is the workflow activityId (e.g. "appraisal-assignment"),
    // not a Guid — backend accepts it as optional since the original auto-complete
    // callback path was removed. We omit it rather than sending an invalid Guid.
    startQuotation(
      {
        appraisalId,
        requestId,
        workflowInstanceId,
        taskExecutionId: null,
        dueDate: cutOffDateTime,
        bankingSegment: bankingSegment ?? '',
        invitedCompanyIds: selectedCompanies.map(c => c.id),
        appraisalNumber: appraisalNumber ?? '',
        propertyType: propertyType ?? '',
        specialRequirements: remarks || null,
      },
      {
        onSuccess: () => {
          toast.success('Quotation started — companies have been invited');
          handleClose();
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err?.apiError?.detail ?? 'Failed to start quotation');
        },
      },
    );
  };

  const isCompanySelected = (companyId: string) => selectedCompanies.some(c => c.id === companyId);

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Request Quotation" size="lg">
      <div className="flex flex-col gap-5">
        {headerSlot}
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
          {bankingSegment && (
            <p className="text-xs text-purple-600 mb-1.5 flex items-center gap-1">
              <Icon name="circle-info" style="solid" className="size-3.5" />
              Showing companies eligible for <strong>{bankingSegment}</strong> segment
            </p>
          )}

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
                  {bankingSegment ? 'No eligible companies for this segment' : 'No companies found'}
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
                          isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white',
                          )}
                        >
                          {isSelected && (
                            <Icon name="check" style="solid" className="size-3 text-white" />
                          )}
                        </div>
                        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Icon name="building" style="solid" className="size-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {company.companyName}
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
            Special Requirements <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Add any special instructions or requirements..."
            rows={3}
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">{remarks.length}/500</p>
        </div>

        {/* Context warning if required fields are missing */}
        {(!requestId || !workflowInstanceId) && (
          <div className="bg-amber-50 rounded-lg p-3 flex items-start gap-2">
            <Icon name="triangle-exclamation" style="solid" className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This quotation must be started from an active admin workflow task. Make sure you have
              opened this page from the task list.
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedCompanies.length === 0 || !cutOffDateTime || isPending}
          >
            {isPending ? (
              <>
                <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                Starting...
              </>
            ) : (
              <>
                <Icon name="file-circle-plus" style="solid" className="size-4 mr-2" />
                Start Quotation
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default CreateQuotationModal;

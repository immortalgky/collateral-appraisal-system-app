import { useState } from 'react';
import { useDebounce } from '@/shared/hooks/useDebounce';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useAppraisalSearch } from '@/features/appraisal/api/appraisalSearch';
import {
  fetchAppraisalCopyTemplate,
  type AppraisalCopyTemplate,
} from '@/features/appraisal/api/copyTemplate';
import toast from 'react-hot-toast';
import { isAxiosError } from 'axios';

interface SearchAppraisalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (template: AppraisalCopyTemplate) => void;
}

const SearchAppraisalModal = ({ isOpen, onClose, onSelect }: SearchAppraisalModalProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isFetchingTemplate, setIsFetchingTemplate] = useState(false);

  const debouncedSearch = useDebounce(searchQuery, 350);

  const { data, isLoading } = useAppraisalSearch(
    {
      search: debouncedSearch || undefined,
      status: 'Completed',
      pageNumber: 0,
      pageSize: 50,
    },
    { enabled: isOpen },
  );

  const appraisals = data?.result?.items ?? [];

  const handleRowClick = async (appraisalId: string) => {
    setSelectedId(appraisalId);
    setIsFetchingTemplate(true);
    try {
      const template = await fetchAppraisalCopyTemplate(appraisalId);
      onSelect(template);
      handleClose();
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        toast.error('This appraisal is not completed and cannot be copied.');
      } else if (isAxiosError(err) && err.response?.status === 404) {
        toast.error('Appraisal not found.');
      } else {
        toast.error('Failed to load appraisal data. Please try again.');
      }
      setSelectedId(null);
    } finally {
      setIsFetchingTemplate(false);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setSelectedId(null);
    setIsFetchingTemplate(false);
    onClose();
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return '-';
    return new Intl.NumberFormat('th-TH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Search Previous Appraisal Report" size="xl">
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
            placeholder="Search by appraisal number or customer name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
            autoFocus
          />
        </div>

        {/* Results Table */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-80 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Appraisal No.</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Customer</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Location</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-600">Facility Limit</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-600">Completed At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <Icon name="spinner" style="solid" className="w-4 h-4 animate-spin" />
                        Searching...
                      </div>
                    </td>
                  </tr>
                ) : appraisals.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No completed appraisals found.
                    </td>
                  </tr>
                ) : (
                  appraisals.map(appraisal => {
                    const isSelected = selectedId === appraisal.id;
                    const isLoadingThis = isSelected && isFetchingTemplate;
                    const location = [appraisal.district, appraisal.province]
                      .filter(Boolean)
                      .join(', ');
                    return (
                      <tr
                        key={appraisal.id}
                        onClick={() => !isFetchingTemplate && handleRowClick(appraisal.id)}
                        className={`transition-colors ${
                          isFetchingTemplate
                            ? 'cursor-wait'
                            : 'cursor-pointer'
                        } ${
                          isSelected
                            ? 'bg-primary-50 hover:bg-primary-100'
                            : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {isLoadingThis && (
                              <Icon
                                name="spinner"
                                style="solid"
                                className="w-3 h-3 animate-spin text-primary-500 shrink-0"
                              />
                            )}
                            {appraisal.appraisalNumber ?? '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-40 truncate" title={appraisal.customerName ?? undefined}>
                          {appraisal.customerName ?? '-'}
                        </td>
                        <td className="px-4 py-3 text-gray-600 max-w-40 truncate" title={location || undefined}>
                          {location || '-'}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {formatCurrency(appraisal.facilityLimit)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {formatDate(appraisal.createdAt)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-gray-500">
            Click a row to copy its data into the new request.
          </p>
          <Button variant="outline" onClick={handleClose} disabled={isFetchingTemplate}>
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SearchAppraisalModal;

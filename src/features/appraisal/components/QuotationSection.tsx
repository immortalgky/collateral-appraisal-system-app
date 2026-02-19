import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useGetAppraisalQuotations } from '../api/administration';
import type { Quotation } from '../types/administration';

interface QuotationSectionProps {
  appraisalId: string;
  onAddToExisting: () => void;
  onCreateNew: () => void;
}

const QuotationSection = ({ appraisalId, onAddToExisting, onCreateNew }: QuotationSectionProps) => {
  // Fetch quotations that this appraisal belongs to
  const { data: quotations = [], isLoading } = useGetAppraisalQuotations(appraisalId, !!appraisalId);

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      Draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700' },
      Pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700' },
      Quoted: { label: 'Quoted', className: 'bg-blue-100 text-blue-700' },
      Approved: { label: 'Approved', className: 'bg-green-100 text-green-700' },
      Rejected: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
      Expired: { label: 'Expired', className: 'bg-gray-100 text-gray-500' },
    };

    const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };
    return (
      <span
        className={clsx(
          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
          config.className
        )}
      >
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="size-4 text-purple-700" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Quotation</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onAddToExisting}>
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            Add to existing quotation
          </Button>
          <Button size="sm" onClick={onCreateNew}>
            <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
            Create a new quotation
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quotation ID
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                No. of Appraisal
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                No. of Quoted
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created On
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cut-Off Time
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Icon name="spinner" style="solid" className="size-5 animate-spin text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading quotations...</p>
                </td>
              </tr>
            ) : quotations.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <Icon name="file-invoice" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No quotations found for this appraisal</p>
                  <p className="text-xs text-gray-400 mt-1">Create a new quotation or add to an existing one</p>
                </td>
              </tr>
            ) : (
              quotations.map((quotation: Quotation) => (
                <tr key={quotation.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-purple-600">{quotation.quotationNumber}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-900">{quotation.totalAppraisals}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-gray-900">
                      {quotation.totalQuotationsReceived}/{quotation.totalAppraisals}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{formatDate(quotation.requestDate)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{formatDateTime(quotation.dueDate)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">{getStatusBadge(quotation.status)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default QuotationSection;

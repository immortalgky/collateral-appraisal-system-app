import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useShortlistQuotation, useUnshortlistQuotation } from '../api/quotation';
import type { CompanyQuotationDto } from '../schemas/quotation';
import QuotationStatusBadge from './QuotationStatusBadge';
import SendToRmModal from './SendToRmModal';

/** Format an ISO datetime string as DD/MM/YYYY HH:mm */
const fmtDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface AdminShortlistPanelProps {
  quotationId: string;
  companyQuotations: CompanyQuotationDto[];
}

const AdminShortlistPanel = ({ quotationId, companyQuotations }: AdminShortlistPanelProps) => {
  const navigate = useNavigate();
  const { mutate: shortlist, isPending: isShortlisting } = useShortlistQuotation(quotationId);
  const { mutate: unshortlist, isPending: isUnshortlisting } = useUnshortlistQuotation(quotationId);
  const { isOpen: isSendToRmOpen, onOpen: openSendToRm, onClose: closeSendToRm } = useDisclosure();

  const shortlistedCount = companyQuotations.filter(q => q.isShortlisted).length;
  const isPending = isShortlisting || isUnshortlisting;

  const handleToggle = (cq: CompanyQuotationDto) => {
    if (isPending) return;
    if (cq.isShortlisted) {
      unshortlist(cq.id, {
        onError: (err: any) => toast.error(err?.apiError?.detail ?? 'Failed to remove from shortlist'),
      });
    } else {
      shortlist(cq.id, {
        onError: (err: any) => toast.error(err?.apiError?.detail ?? 'Failed to add to shortlist'),
      });
    }
  };

  const formatCurrency = (v?: number | null) =>
    v != null ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) : '—';

  return (
    <>
      <div className="rounded-xl border border-amber-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-amber-200 flex items-center justify-center">
              <Icon name="clipboard-list" style="solid" className="size-4 text-amber-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">Admin Review</span>
              <span className="ml-2 text-xs text-amber-700">
                {shortlistedCount} of {companyQuotations.length} shortlisted
              </span>
            </div>
          </div>
          <Button
            size="sm"
            onClick={openSendToRm}
            disabled={shortlistedCount === 0}
          >
            <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
            Send to RM
          </Button>
        </div>

        {companyQuotations.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <Icon name="inbox" style="regular" className="size-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No submissions received</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                    Shortlist
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quoted Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Est. Days
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valid Until
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created On
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated On
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated By
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Discount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Estimate Manday
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 w-10" aria-label="Detail" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {companyQuotations.map(cq => {
                  const totalDiscount = (cq.items ?? []).reduce(
                    (sum, item) => sum + (item.discount ?? 0),
                    0,
                  );
                  const totalEstimateManday = (cq.items ?? []).reduce(
                    (sum, item) => sum + (item.estimatedDays ?? 0),
                    0,
                  );
                  return (
                    <tr
                      key={cq.id}
                      className={clsx(
                        'transition-colors',
                        cq.isShortlisted ? 'bg-indigo-50' : 'hover:bg-gray-50',
                      )}
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleToggle(cq)}
                          disabled={isPending}
                          className={clsx(
                            'size-6 rounded border-2 flex items-center justify-center transition-colors',
                            cq.isShortlisted
                              ? 'bg-indigo-500 border-indigo-500'
                              : 'border-gray-300 hover:border-indigo-400',
                            isPending && 'opacity-50 cursor-not-allowed',
                          )}
                          aria-label={cq.isShortlisted ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                          {cq.isShortlisted && (
                            <Icon name="check" style="solid" className="size-3.5 text-white" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{cq.companyName}</div>
                        {cq.remarks && (
                          <div className="text-xs text-gray-500 truncate max-w-xs">{cq.remarks}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-medium text-gray-900">
                          {formatCurrency(cq.totalQuotedPrice)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{cq.estimatedDays ?? '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {cq.validUntil
                            ? new Date(cq.validUntil).toLocaleDateString('th-TH')
                            : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {fmtDateTime(cq.submittedAt)}
                        </span>
                      </td>
                      {/* updatedAt / updatedBy not in CompanyQuotationDto — TODO: extend DTO when backend exposes them */}
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">—</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">—</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-600">
                          {(cq.items ?? []).length > 0 ? formatCurrency(totalDiscount) : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">
                          {(cq.items ?? []).length > 0 ? totalEstimateManday : '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <QuotationStatusBadge status={cq.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        {/* Only show detail icon for statuses an admin should review.
                            Exclude Draft and PendingCheckerReview — in-progress ext-company drafts. */}
                        {cq.id && ['Submitted', 'Accepted', 'Rejected', 'Tentative', 'Negotiating', 'Withdrawn'].includes(cq.status) && (
                          <button
                            type="button"
                            aria-label={`View ${cq.companyName} quotation detail`}
                            onClick={() =>
                              navigate(
                                `/quotations/${quotationId}/companies/${cq.id}`,
                              )
                            }
                            className="p-1 rounded hover:bg-gray-100 transition-colors"
                          >
                            <Icon name="file-lines" style="regular" className="size-4 text-blue-500" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {shortlistedCount === 0 && companyQuotations.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <Icon name="circle-info" style="solid" className="size-3.5 shrink-0" />
              Check at least one company to enable "Send to RM"
            </p>
          </div>
        )}
      </div>

      <SendToRmModal
        isOpen={isSendToRmOpen}
        onClose={closeSendToRm}
        quotationId={quotationId}
        shortlistedCount={shortlistedCount}
      />
    </>
  );
};

export default AdminShortlistPanel;

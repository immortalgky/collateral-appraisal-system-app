import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Modal from '@/shared/components/Modal';
import {
  useGetQuotationById,
  usePickTentativeWinner,
  useCancelQuotation,
} from '../api/quotation';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import AppraisalContextPanel from '../components/AppraisalContextPanel';
import AdminShortlistPanel from '../components/AdminShortlistPanel';
import AppraisalReportListingTable from '../components/AppraisalReportListingTable';
import QuotationTrackingLog from '../components/QuotationTrackingLog';
import FinalizeModal from '../components/FinalizeModal';
import type { CompanyQuotationDto } from '../schemas/quotation';
import { useQuotationIdFromRoute } from '../hooks/useQuotationIdFromRoute';

/**
 * Combined RM + Admin quotation page.
 *
 * RM flow: picks tentative winner from the shortlisted bids.
 * Admin flow: review submissions, shortlist, send to RM, cancel, or finalize.
 *
 * Routes:
 *   Standalone:   /quotations/:id  (gated by RoleProtectedRoute for ['RequestMaker', 'Admin'])
 *   Task-wrapped: /tasks/:taskId/quotation/pick-winner
 */
const QuotationSelectionPage = () => {
  const id = useQuotationIdFromRoute();
  const navigate = useNavigate();
  const { data: quotation, isLoading, isError } = useGetQuotationById(id);
  const { mutate: pick, isPending: isPickPending } = usePickTentativeWinner(id ?? '');
  const { mutate: cancelQuotation, isPending: isCancelPending } = useCancelQuotation(id ?? '');

  // RM pick-winner state
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [requestNegotiation, setRequestNegotiation] = useState(false);
  const [negotiationNote, setNegotiationNote] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Admin finalize state
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [finalizeTarget, setFinalizeTarget] = useState<CompanyQuotationDto | null>(null);

  // Admin cancel confirmation state
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);

  const shortlisted = (quotation?.companyQuotations ?? []).filter(q => q.isShortlisted);
  const tentativeWinner = quotation?.tentativeWinnerQuotationId
    ? shortlisted.find(q => q.id === quotation.tentativeWinnerQuotationId)
    : null;

  const handlePickClick = (cq: CompanyQuotationDto) => {
    setPickedId(cq.id);
    setReason('');
    setRequestNegotiation(false);
    setNegotiationNote('');
    setIsConfirmOpen(true);
  };

  const handleConfirmPick = () => {
    if (!pickedId) return;
    pick(
      {
        companyQuotationId: pickedId,
        reason: reason || undefined,
        requestNegotiation: requestNegotiation || undefined,
        negotiationNote: requestNegotiation && negotiationNote ? negotiationNote : null,
      },
      {
        onSuccess: () => {
          toast.success('Tentative winner selected — admin will be notified');
          setIsConfirmOpen(false);
          setPickedId(null);
          setReason('');
          setRequestNegotiation(false);
          setNegotiationNote('');
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to pick tentative winner');
        },
      },
    );
  };

  const handleCancelConfirm = () => {
    cancelQuotation(
      {},
      {
        onSuccess: () => {
          toast.success('Quotation cancelled');
          setIsCancelConfirmOpen(false);
          navigate(-1);
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to cancel quotation');
        },
      },
    );
  };

  const handleFinalizeClick = () => {
    const winner = shortlisted.find(q => q.id === quotation?.tentativeWinnerQuotationId);
    if (winner) {
      setFinalizeTarget(winner);
      setIsFinalizeOpen(true);
    }
  };

  const pickedCompany = shortlisted.find(q => q.id === pickedId);

  const formatCurrency = (v?: number | null) =>
    v != null ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) : '—';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="w-12 h-12 text-red-400" />
        <p className="text-sm text-gray-600">
          Unable to load quotation. You may not have access to this resource.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
          Back to Tasks
        </Button>
      </div>
    );
  }

  const status = quotation.status;
  const isAlreadyPicked = !!quotation.tentativeWinnerQuotationId;
  const isRmPickPhase = ['PendingRmSelection', 'WinnerTentative'].includes(status);
  // Read-only for RM pick flow when not in RM selection phase
  const isRmReadOnly = !isRmPickPhase;

  // ─── Status-gated button visibility ─────────────────────────────────────────
  // Sent           → no admin action (fan-out in progress)
  // UnderAdminReview → SUBMIT SHORTLISTED COMPANIES (handled inside AdminShortlistPanel)
  // PendingRmSelection → no admin action (RM is picking)
  // WinnerTentative → CANCEL QUOTATION + SUBMIT AWARD COMPANY
  // Finalized / Cancelled → CLOSE only
  const showAdminShortlistPanel = status === 'UnderAdminReview';
  const showWinnerActions = status === 'WinnerTentative';
  const showCloseOnly = status === 'Finalized' || status === 'Cancelled';

  // Cut-off date — read-only for now.
  // TODO: wire PATCH endpoint when backend exposes /quotations/{id}/due-date or similar.
  const cutOffDateDisplay = quotation.dueDate
    ? (() => {
        const d = new Date(quotation.dueDate);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
      })()
    : '—';

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Page header */}
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <Icon name="arrow-left" style="regular" className="size-4" />
          Back
        </button>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quotation.quotationNumber}</h1>
            <div className="flex items-center gap-2 mt-1">
              <QuotationStatusBadge status={quotation.status} />
            </div>
          </div>
          {/* Cut-Off Date Time — read-only until PATCH endpoint is available */}
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Cut-Off Date Time
            </span>
            <span className="text-sm font-semibold text-gray-800">{cutOffDateDisplay}</span>
          </div>
        </div>
      </div>

      {/* ─── Section 1: Appraisal Report Listing ──────────────────────────────── */}
      <AppraisalReportListingTable appraisals={quotation.appraisals ?? []} />

      {/* Instructions (RM pick phase only) */}
      {isRmPickPhase && !isAlreadyPicked && (
        <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 flex items-start gap-2">
          <Icon name="circle-info" style="solid" className="size-4 text-purple-500 shrink-0 mt-0.5" />
          <p className="text-sm text-purple-700">
            Select one of the shortlisted companies below as the tentative winner. Admin will then
            negotiate and finalize the agreement.
          </p>
        </div>
      )}

      {/* Appraisal context panel (RM view) — for RM pick phase */}
      {isRmPickPhase && (quotation?.appraisals ?? []).length > 0 && (
        <AppraisalContextPanel
          quotationId={quotation.id}
          appraisals={quotation.appraisals ?? []}
          viewerRole="RM"
          allowRemove={false}
        />
      )}

      {/* Tentative winner banner */}
      {tentativeWinner && (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200">
          <div className="flex items-center gap-2 mb-1">
            <Icon name="crown" style="solid" className="size-5 text-indigo-600" />
            <span className="font-semibold text-indigo-900">Tentative Winner Selected</span>
          </div>
          <p className="text-sm text-indigo-700">
            <strong>{tentativeWinner.companyName}</strong> has been selected as the tentative
            winner. Admin is now in negotiation.
          </p>
        </div>
      )}

      {/* ─── Section 2a: Admin shortlist + shortlist send (UnderAdminReview) ──── */}
      {showAdminShortlistPanel && (
        <AdminShortlistPanel
          quotationId={quotation.id}
          companyQuotations={quotation.companyQuotations ?? []}
        />
      )}

      {/* ─── Section 2b: RM shortlisted bids table (PendingRmSelection / WinnerTentative) */}
      {isRmPickPhase && (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-700">
              Shortlisted Bids ({shortlisted.length})
            </h2>
          </div>

          {shortlisted.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-gray-500">No shortlisted bids available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
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
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {!isRmReadOnly && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shortlisted.map(cq => {
                    const isWinner = quotation.tentativeWinnerQuotationId === cq.id;
                    return (
                      <tr
                        key={cq.id}
                        className={clsx(
                          'transition-colors',
                          isWinner ? 'bg-indigo-50' : 'hover:bg-gray-50',
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">{cq.companyName}</span>
                            {isWinner && (
                              <Icon name="crown" style="solid" className="size-4 text-indigo-500" />
                            )}
                          </div>
                          {cq.remarks && (
                            <div className="text-xs text-gray-500 mt-0.5 max-w-xs truncate">
                              {cq.remarks}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-semibold text-gray-900">
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
                        <td className="px-4 py-3 text-center">
                          <QuotationStatusBadge status={cq.status} />
                        </td>
                        {!isRmReadOnly && (
                          <td className="px-4 py-3 text-center">
                            <Button
                              size="sm"
                              onClick={() => handlePickClick(cq)}
                              disabled={isAlreadyPicked}
                              className={clsx(isWinner && 'bg-indigo-600 hover:bg-indigo-700')}
                            >
                              {isWinner ? 'Selected' : 'Pick'}
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Section 3: WinnerTentative action buttons ────────────────────────── */}
      {showWinnerActions && (
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            variant="danger"
            onClick={() => setIsCancelConfirmOpen(true)}
            disabled={isCancelPending}
          >
            <Icon name="ban" style="solid" className="size-4 mr-1.5" />
            Cancel Quotation
          </Button>
          <Button
            onClick={handleFinalizeClick}
            disabled={!tentativeWinner}
          >
            <Icon name="flag-checkered" style="solid" className="size-4 mr-1.5" />
            Submit Award Company
          </Button>
        </div>
      )}

      {/* Close-only state */}
      {showCloseOnly && (
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Close
          </Button>
        </div>
      )}

      {/* ─── Section 4: Quotation Tracking Log ───────────────────────────────── */}
      {id && <QuotationTrackingLog quotationId={id} />}

      {/* ─── Modals ───────────────────────────────────────────────────────────── */}

      {/* RM pick confirmation */}
      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Select Tentative Winner"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-100 flex items-start gap-2">
            <Icon name="crown" style="solid" className="size-4 text-indigo-500 shrink-0 mt-0.5" />
            <p className="text-sm text-indigo-700">
              You are selecting <strong>{pickedCompany?.companyName}</strong> as the tentative
              winner. Admin will be notified to start negotiation.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason <span className="text-xs text-gray-400">(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
              placeholder="Why this company?"
            />
          </div>

          {/* Request negotiation toggle */}
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={requestNegotiation}
                onChange={e => {
                  setRequestNegotiation(e.target.checked);
                  if (!e.target.checked) setNegotiationNote('');
                }}
                className="size-4 accent-primary rounded"
              />
              <div>
                <span className="text-sm font-medium text-gray-700 group-hover:text-primary">
                  Request negotiation with this company
                </span>
                <p className="text-xs text-gray-400">
                  Admin will see your recommendation when finalizing.
                </p>
              </div>
            </label>

            {requestNegotiation && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Note to admin <span className="text-xs text-gray-400">(max 500 chars)</span>
                </label>
                <textarea
                  value={negotiationNote}
                  onChange={e => setNegotiationNote(e.target.value.slice(0, 500))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
                  placeholder="e.g. Target price ฿2.5M, they may be flexible on timeline..."
                />
                <p className="text-xs text-gray-400 text-right mt-0.5">
                  {negotiationNote.length}/500
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isPickPending}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPick} disabled={isPickPending}>
              {isPickPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Selecting...
                </>
              ) : (
                <>
                  <Icon name="crown" style="solid" className="size-4 mr-2" />
                  Confirm Selection
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin cancel confirmation */}
      <Modal
        isOpen={isCancelConfirmOpen}
        onClose={() => setIsCancelConfirmOpen(false)}
        title="Cancel Quotation"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
            <Icon name="triangle-exclamation" style="solid" className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will cancel the quotation <strong>{quotation.quotationNumber}</strong>. This
              action cannot be undone.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsCancelConfirmOpen(false)}
              disabled={isCancelPending}
            >
              Go Back
            </Button>
            <Button
              variant="danger"
              onClick={handleCancelConfirm}
              disabled={isCancelPending}
            >
              {isCancelPending ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Icon name="ban" style="solid" className="size-4 mr-2" />
                  Confirm Cancel
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Admin finalize */}
      {finalizeTarget && (
        <FinalizeModal
          isOpen={isFinalizeOpen}
          onClose={() => {
            setIsFinalizeOpen(false);
            setFinalizeTarget(null);
          }}
          quotationId={quotation.id}
          companyQuotationId={finalizeTarget.id}
          companyName={finalizeTarget.companyName}
          suggestedPrice={finalizeTarget.currentNegotiatedPrice ?? finalizeTarget.totalQuotedPrice}
        />
      )}
    </div>
  );
};

export default QuotationSelectionPage;

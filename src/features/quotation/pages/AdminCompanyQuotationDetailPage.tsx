import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useGetQuotationById, useOpenNegotiation, quotationKeys } from '../api/quotation';
import { deriveFeeTotals } from '../components/QuotationFeeBreakdown';
import AppraisalLeftRail from '../components/AppraisalLeftRail';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import SharedDocumentViewer from '../components/SharedDocumentViewer';
import { useQueryClient } from '@tanstack/react-query';
import type { CompanyQuotationItemDto } from '../schemas/quotation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const THB = new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' });

const fmtCurrency = (v: number | null | undefined) =>
  v != null && !isNaN(v) ? THB.format(v) : '—';

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

// ─── Read-only fee grid ───────────────────────────────────────────────────────

interface ReadOnlyFeeGridProps {
  item: CompanyQuotationItemDto;
}

const ReadOnlyFeeGrid = ({ item }: ReadOnlyFeeGridProps) => {
  const { feeAfterDiscount, vatAmount, netAmount } = deriveFeeTotals(
    item.feeAmount,
    item.discount,
    item.negotiatedDiscount,
    item.vatPercent,
  );

  const row = (label: string, value: string, highlight = false) => (
    <div
      className={`grid grid-cols-2 gap-3 items-center px-2.5 py-1.5 rounded-lg ${
        highlight ? 'bg-primary/5 border border-primary/20' : ''
      }`}
    >
      <span className={`text-sm ${highlight ? 'font-semibold text-gray-700' : 'text-gray-600'}`}>
        {label}
      </span>
      <span className={`text-sm ${highlight ? 'font-bold text-primary' : 'text-gray-800'}`}>
        {value}
      </span>
    </div>
  );

  const feeAfterNegative = !isNaN(feeAfterDiscount) && feeAfterDiscount < 0;

  return (
    <div className="space-y-2">
      {row('Fee Amount (THB)', fmtCurrency(item.feeAmount))}
      {row('Discount (THB)', fmtCurrency(item.discount))}
      {item.negotiatedDiscount != null &&
        row('Discount (Negotiate)', fmtCurrency(item.negotiatedDiscount))}
      <div
        className={`grid grid-cols-2 gap-3 items-center px-2.5 py-1.5 rounded-lg ${
          feeAfterNegative ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
        }`}
      >
        <span className="text-sm text-gray-500">Fee After Discount</span>
        <span
          className={`text-sm font-medium ${feeAfterNegative ? 'text-red-600' : 'text-gray-800'}`}
        >
          {feeAfterNegative ? 'Discounts exceed fee' : fmtCurrency(feeAfterDiscount)}
        </span>
      </div>
      {row('VAT %', item.vatPercent != null ? `${item.vatPercent}%` : '—')}
      {row('VAT Amount (THB)', fmtCurrency(vatAmount))}
      {row('Net Amount (THB)', fmtCurrency(netAmount), true)}
    </div>
  );
};

// ─── Shared document table row ────────────────────────────────────────────────

interface DocRowProps {
  fileName: string;
  documentTypeName?: string | null;
  fileType?: string | null;
  onView: () => void;
}

const DocRow = ({ fileName, documentTypeName, fileType, onView }: DocRowProps) => (
  <tr
    className="hover:bg-gray-50 cursor-pointer transition-colors"
    onClick={onView}
  >
    <td className="px-3 py-2 text-sm text-gray-700">{documentTypeName ?? '—'}</td>
    <td className="px-3 py-2 text-sm text-blue-600 hover:underline">{fileName}</td>
    <td className="px-3 py-2 text-sm text-gray-500">{fileType ?? '—'}</td>
    <td className="px-3 py-2 text-center">
      <Icon name="eye" style="regular" className="size-4 text-gray-400" />
    </td>
  </tr>
);

// ─── Read-only field ──────────────────────────────────────────────────────────

const ReadonlyField = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
    <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[2.25rem]">
      {value ?? '—'}
    </div>
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const AdminCompanyQuotationDetailPage = () => {
  const { quotationRequestId, companyQuotationId } = useParams<{
    quotationRequestId: string;
    companyQuotationId: string;
  }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: quotation, isLoading, isError } = useGetQuotationById(quotationRequestId);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [revisionRemark, setRevisionRemark] = useState('');
  const [docViewer, setDocViewer] = useState<{
    documentId: string;
    fileName: string;
    fileType?: string | null;
  } | null>(null);

  const { mutate: openNegotiation, isPending: isNegotiating } = useOpenNegotiation(
    quotationRequestId ?? '',
  );

  // ─── Derive target company quotation ────────────────────────────────────────

  const companyQuotation = useMemo(
    () => quotation?.companyQuotations?.find(cq => cq.id === companyQuotationId),
    [quotation, companyQuotationId],
  );

  const appraisals = quotation?.appraisals ?? [];

  // ─── Net amounts per item for left rail ─────────────────────────────────────

  const netAmounts = useMemo(
    () =>
      appraisals.map(ap => {
        const item = companyQuotation?.items?.find(it => it.appraisalId === ap.appraisalId);
        if (!item) return 0;
        return deriveFeeTotals(
          item.feeAmount,
          item.discount,
          item.negotiatedDiscount,
          item.vatPercent,
        ).netAmount;
      }),
    [appraisals, companyQuotation],
  );

  const grandTotal = useMemo(
    () => netAmounts.reduce((sum, n) => sum + (isNaN(n) ? 0 : n), 0),
    [netAmounts],
  );

  // ─── Currently selected appraisal ───────────────────────────────────────────

  const selectedAppraisal = appraisals[selectedIndex];
  const selectedItem = companyQuotation?.items?.find(
    it => it.appraisalId === selectedAppraisal?.appraisalId,
  );

  // Documents filtered to the selected appraisal
  const appraisalDocs = useMemo(
    () =>
      (quotation?.sharedDocuments ?? []).filter(
        d => d.appraisalId === selectedAppraisal?.appraisalId,
      ),
    [quotation?.sharedDocuments, selectedAppraisal],
  );

  // ─── Preconditions for QUOTATION REVISION ───────────────────────────────────
  //
  // Backend enforces: QuotationRequest.status === "WinnerTentative" AND
  // companyQuotation.id === quotation.tentativeWinnerQuotationId.
  // Any other state → InvalidOperationException (500). Gate strictly here.

  const isRfqWinnerTentative = quotation?.status === 'WinnerTentative';
  const isTentativeWinner =
    !!companyQuotation?.id &&
    companyQuotation.id === quotation?.tentativeWinnerQuotationId;

  const canRequestRevision = isRfqWinnerTentative && isTentativeWinner;

  const revisionHint: string | null = !isRfqWinnerTentative
    ? 'Revision can only be requested after RM picks a tentative winner.'
    : !isTentativeWinner
      ? "Revision is only available for the tentative winner's quotation."
      : null;

  const isRevisionDisabled =
    !canRequestRevision ||
    revisionRemark.trim().length === 0 ||
    isNegotiating;

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleRevision = () => {
    if (!companyQuotationId) return;
    openNegotiation(
      {
        companyQuotationId,
        proposedPrice: grandTotal,
        message: revisionRemark.trim(),
      },
      {
        onSuccess: () => {
          toast.success('Negotiation opened');
          queryClient.invalidateQueries({
            queryKey: quotationKeys.detail(quotationRequestId ?? ''),
          });
          navigate(`/quotations/${quotationRequestId}`);
        },
        onError: (err: unknown) => {
          const e = err as { apiError?: { detail?: string } };
          toast.error(e?.apiError?.detail ?? 'Failed to open negotiation round');
        },
      },
    );
  };

  // ─── Loading / error states ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="size-8 text-red-400" />
        <p className="text-sm text-gray-600">Failed to load quotation.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  if (!companyQuotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="circle-exclamation" style="solid" className="size-8 text-amber-400" />
        <p className="text-sm text-gray-600">Company quotation not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate(`/quotations/${quotationRequestId}`)}>
          Back to quotation
        </Button>
      </div>
    );
  }

  const isParticipating = companyQuotation.status !== 'Declined';

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-5">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            External Appraisal Company Quotation Information
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-gray-500">
            <span>
              Quotation ID:{' '}
              <span className="font-medium text-gray-700">{quotation.quotationNumber}</span>
            </span>
            <span>|</span>
            <span>
              Target Date:{' '}
              <span className="font-medium text-gray-700">{fmtDate(quotation.dueDate)}</span>
            </span>
            <span>|</span>
            <span className="font-medium text-gray-800">{companyQuotation.companyName}</span>
            <QuotationStatusBadge status={companyQuotation.status} />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(`/quotations/${quotationRequestId}`)}
        >
          <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
          Back
        </Button>
      </div>

      {/* Main content — left rail + right pane */}
      <div className="flex flex-col md:flex-row border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm min-h-[500px]">
        {/* Left rail */}
        {appraisals.length === 0 ? (
          <div className="flex items-center justify-center w-full h-40 text-gray-400 text-sm">
            No appraisals in this quotation
          </div>
        ) : (
          <>
            <AppraisalLeftRail
              appraisals={appraisals}
              selectedIndex={selectedIndex}
              onSelect={setSelectedIndex}
              netAmounts={netAmounts}
            />

            {/* Right pane */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {selectedAppraisal ? (
                <div className="p-5 space-y-6">
                  {/* Section 1 — Appraisal Report Information */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Appraisal Report Information
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ReadonlyField
                        label="Appraisal Report No."
                        value={selectedAppraisal.appraisalNumber}
                      />
                      <ReadonlyField
                        label="Property Type"
                        value={selectedAppraisal.propertyType}
                      />
                    </div>
                  </section>

                  {/* Section 2 — Attach document */}
                  <section>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Attached Documents
                    </h3>
                    {appraisalDocs.length === 0 ? (
                      <p className="text-sm text-gray-400 italic">No documents shared for this appraisal</p>
                    ) : (
                      <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Document Type
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                File Name
                              </th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                File Type
                              </th>
                              <th className="px-3 py-2 w-10" aria-label="View" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {appraisalDocs.map(doc => (
                              <DocRow
                                key={doc.documentId}
                                fileName={doc.fileName ?? doc.documentId}
                                documentTypeName={doc.documentTypeName}
                                fileType={doc.fileType}
                                onView={() =>
                                  setDocViewer({
                                    documentId: doc.documentId,
                                    fileName: doc.fileName ?? doc.documentId,
                                    fileType: doc.fileType,
                                  })
                                }
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* Section 3 — Appraisal Fee */}
                  {selectedItem && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">Appraisal Fee</h3>
                      <ReadOnlyFeeGrid item={selectedItem} />
                    </section>
                  )}

                  {/* Section 4 — Per-item details */}
                  {selectedItem && (
                    <section>
                      <h3 className="text-sm font-semibold text-gray-700 mb-3">
                        Additional Details
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <ReadonlyField
                          label="Max Appraisal Duration (day)"
                          value={selectedItem.estimatedDays?.toString()}
                        />
                        {/* TODO: add per-item manday field when backend exposes it */}
                        <div className="sm:col-span-2">
                          <ReadonlyField
                            label="Remark"
                            value={selectedItem.itemNotes}
                          />
                        </div>
                      </div>
                    </section>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 text-sm text-gray-400">
                  Select an appraisal from the left
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border border-gray-200 rounded-xl bg-white shadow-sm p-5 space-y-4">
        {/* Summary row */}
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Total Fee Amount
            </span>
            <p className="text-lg font-bold text-primary mt-0.5">{THB.format(grandTotal)}</p>
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              Participating
            </span>
            <p
              className={`text-sm font-semibold mt-0.5 ${
                isParticipating ? 'text-green-600' : 'text-red-500'
              }`}
            >
              {isParticipating ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        {/* Remarks */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wider">
            Quotation Remark
          </label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[4rem] whitespace-pre-wrap">
            {companyQuotation.remarks ?? '—'}
          </div>
        </div>

        <div>
          <label
            htmlFor="revision-remark"
            className="block text-xs font-medium text-gray-700 mb-1 uppercase tracking-wider"
          >
            Quotation Revision Remark{' '}
            <span className="text-danger normal-case font-normal">
              (required to open revision)
            </span>
          </label>
          <textarea
            id="revision-remark"
            rows={3}
            value={revisionRemark}
            onChange={e => setRevisionRemark(e.target.value)}
            placeholder="Enter your revision note for the company..."
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(`/quotations/${quotationRequestId}`)}
          >
            CANCEL
          </Button>
          <Button
            type="button"
            onClick={handleRevision}
            disabled={isRevisionDisabled}
            isLoading={isNegotiating}
          >
            <Icon name="rotate" style="solid" className="size-4 mr-2" />
            QUOTATION REVISION
          </Button>
        </div>

        {revisionHint && (
          <p className="text-xs text-gray-400 text-right">{revisionHint}</p>
        )}
      </div>

      {/* Document viewer modal */}
      {docViewer && (
        <SharedDocumentViewer
          quotationRequestId={quotationRequestId ?? ''}
          documentId={docViewer.documentId}
          fileName={docViewer.fileName}
          fileType={docViewer.fileType}
          isOpen={docViewer !== null}
          onClose={() => setDocViewer(null)}
        />
      )}
    </div>
  );
};

export default AdminCompanyQuotationDetailPage;

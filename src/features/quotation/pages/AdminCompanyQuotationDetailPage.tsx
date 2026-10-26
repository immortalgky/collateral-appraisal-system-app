import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type React from 'react';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { useGetQuotationById } from '../api/quotation';
import { deriveFeeTotals } from '../components/QuotationFeeBreakdown';
import AppraisalLeftRail from '../components/AppraisalLeftRail';
import QuotationStatusBadge from '../components/QuotationStatusBadge';
import SharedDocumentViewer from '../components/SharedDocumentViewer';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { isNonParticipatingStatus, type CompanyQuotationItemDto } from '../schemas/quotation';

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

const fmtDateTime = (iso: string | null | undefined) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Read-only fee grid ───────────────────────────────────────────────────────
//
// Visual structure mirrors `QuotationFeeBreakdown` (the editable form variant) so
// the admin's read-only view of a submitted quotation matches what the company saw
// when they entered it. NumberInput is intentionally not used — that component is
// tightly coupled to RHF, and fabricating a form here just for display would cost
// more than duplicating ~30 lines of styled markup.

interface ReadOnlyFeeGridProps {
  item: CompanyQuotationItemDto;
}

/** Disabled-input-styled value display matching NumberInput's disabled appearance. */
const ValueBox = ({ value }: { value: string }) => (
  <div className="w-full px-2.5 py-1.5 border border-(--palette-line) rounded-lg text-sm bg-(--palette-surface-2) text-(--palette-gray-600) text-right tabular-nums">
    {value}
  </div>
);

const ReadOnlyFeeGrid = ({ item }: ReadOnlyFeeGridProps) => {
  const { t } = useTranslation('quotation');
  const { feeAfterDiscount, vatAmount, netAmount } = deriveFeeTotals(
    item.feeAmount,
    item.discount,
    item.negotiatedDiscount,
    item.vatPercent,
  );

  const fmt = (v: number) => (isNaN(v) ? '—' : THB.format(v));
  const discountOverflow = !isNaN(feeAfterDiscount) && feeAfterDiscount < 0;

  return (
    <div className="space-y-2">
      {/* Fee Amount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label className="text-sm text-(--palette-gray-600)">{t('columns.feeAmount')}</label>
        <ValueBox value={fmtCurrency(item.feeAmount)} />
      </div>

      {/* Discount */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label className="text-sm text-(--palette-gray-600)">{t('columns.discount')}</label>
        <ValueBox value={fmtCurrency(item.discount)} />
      </div>

      {/* Negotiated Discount — always shown to mirror the company-input page */}
      <div className="grid grid-cols-2 gap-3 items-center">
        <label className="text-sm text-(--palette-gray-600)">
          {t('columns.discountNegotiate')}
        </label>
        <ValueBox value={fmtCurrency(item.negotiatedDiscount)} />
      </div>

      {/* Item Negotiation Reason — the company's explanation for a $0 negotiated discount.
          Separated below the totals (not crammed into the numeric grid above) and given
          the same indigo "negotiation" treatment used elsewhere in this feature, so it
          reads as context, not a warning. Only rendered when the company actually gave one. */}
      {item.itemNegotiationReason && (
        <div className="rounded-lg border border-orange-200 dark:border-orange-500/30 bg-orange-50/60 dark:bg-orange-500/10 p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-orange-900 dark:text-orange-200">
              {t('sections.itemNegotiationReason')}
            </span>
          </div>
          <p className="text-sm text-(--palette-ink) whitespace-pre-wrap">
            {item.itemNegotiationReason}
          </p>
        </div>
      )}

      {/* ─── Totals block ─────────────────────────────────────────────── */}
      <div className="mt-3 border-t border-(--palette-line) pt-2 space-y-1">
        {/* Fee After Discount */}
        <div
          className={`grid grid-cols-2 gap-3 items-center px-2.5 py-1.5 rounded ${
            discountOverflow ? 'bg-(--palette-req-wash) border border-(--palette-req-line)' : ''
          }`}
        >
          <span className="text-sm text-(--palette-gray-600) text-right">
            {t('columns.feeAfterDiscount')}
          </span>
          <span
            className={`text-sm font-semibold text-right tabular-nums ${
              discountOverflow ? 'text-(--palette-danger)' : 'text-(--palette-ink)'
            }`}
          >
            {discountOverflow ? t('shared.discountsExceedFee') : fmt(feeAfterDiscount)}
          </span>
        </div>

        {/* VAT — rate + computed amount on one row */}
        <div className="grid grid-cols-2 gap-3 items-center px-2.5 py-1.5">
          <span className="text-sm text-(--palette-gray-600) text-right">
            VAT ({(Number(item.vatPercent) || 0).toFixed(2)}%)
          </span>
          <span className="text-sm font-semibold text-(--palette-ink) text-right tabular-nums">
            {fmt(vatAmount)}
          </span>
        </div>

        {/* Net Amount — primary total */}
        <div className="grid grid-cols-2 gap-3 items-center border-t-2 border-primary/30 mt-1 pt-2 px-2.5 py-2 bg-primary/5 rounded-b-lg">
          <span className="text-sm font-semibold text-(--palette-ink) text-right uppercase tracking-wide">
            {t('columns.netAmount')}
          </span>
          <span className="text-base font-bold text-(--palette-primary-text) text-right tabular-nums">
            {fmt(netAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Shared document table row ────────────────────────────────────────────────

interface DocRowProps {
  fileName: string | null | undefined;
  documentTypeName?: string | null;
  uploadedAt?: string | null;
  notes?: string | null;
  onView: () => void;
}

const DocRow = ({ fileName, documentTypeName, uploadedAt, notes, onView }: DocRowProps) => (
  <tr className="hover:bg-(--palette-surface-2)">
    <td className="px-3 py-2 text-(--palette-ink) truncate" title={documentTypeName ?? ''}>
      {documentTypeName ?? '—'}
    </td>
    <td className="px-3 py-2 truncate" title={fileName ?? ''}>
      {fileName ? (
        <button
          type="button"
          onClick={onView}
          className="text-(--palette-primary-text) hover:text-(--palette-primary-text)/70 hover:underline underline-offset-2 transition-colors text-left truncate max-w-full"
        >
          {fileName}
        </button>
      ) : (
        <span className="text-(--palette-gray-500)">—</span>
      )}
    </td>
    <td className="px-3 py-2 text-(--palette-gray-500) truncate">{fmtDateTime(uploadedAt)}</td>
    <td className="px-3 py-2 text-(--palette-gray-500) truncate italic" title={notes ?? ''}>
      {notes ?? '—'}
    </td>
  </tr>
);

// ─── Route-agnostic content ──────────────────────────────────────────────────
//
// Split out from the page component so it can be embedded inside a SlideOverPanel
// (or a Storybook story, or a future tab) without depending on react-router. The
// page component below is a thin adapter that pulls IDs from the URL and supplies
// an onClose that navigates back to the quotation.

export interface AdminCompanyQuotationDetailContentProps {
  /** Resolved quotation request id — required. */
  quotationRequestId: string;
  /** Resolved company quotation id — required. */
  companyQuotationId: string;
  /** Render mode. `'page'` renders the full page header + Back button; `'drawer'` skips them
   *  (the SlideOverPanel renders its own header). */
  mode: 'page' | 'drawer';
  /** Called when the user dismisses the view (Back / Cancel / post-submit success). */
  onClose: () => void;
}

export const AdminCompanyQuotationDetailContent = ({
  quotationRequestId,
  companyQuotationId,
  mode,
  onClose,
}: AdminCompanyQuotationDetailContentProps) => {
  const { t } = useTranslation(['quotation', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const handleBack = onClose;

  const { data: quotation, isLoading, isError } = useGetQuotationById(quotationRequestId);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [docViewer, setDocViewer] = useState<{
    documentId: string;
    fileName: string;
    fileType?: string | null;
  } | null>(null);

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

  /**
   * Documents grouped by server-supplied section label (e.g. "Application Documents",
   * "Land and Building · Title No. 1"). Mirrors ExtCompanySubmitQuotationPage so the
   * admin sees the same layout the company saw when submitting.
   */
  const docSectionGroups = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; titleNumber: string | null; docs: typeof appraisalDocs }
    >();
    for (const doc of appraisalDocs) {
      const label = doc.sectionLabel ?? 'Documents';
      const bucket = groups.get(label);
      if (bucket) {
        bucket.docs.push(doc);
      } else {
        groups.set(label, { label, titleNumber: doc.titleNumber ?? null, docs: [doc] });
      }
    }
    return Array.from(groups.values()).sort((a, b) => {
      if (a.titleNumber === null && b.titleNumber !== null) return -1;
      if (a.titleNumber !== null && b.titleNumber === null) return 1;
      return (a.titleNumber ?? '').localeCompare(b.titleNumber ?? '');
    });
  }, [appraisalDocs]);

  // ─── Loading / error states ──────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon
          name="spinner"
          style="solid"
          className="size-6 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  }

  if (isError || !quotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="triangle-exclamation" style="solid" className="size-8 text-red-400" />
        <p className="text-sm text-(--palette-gray-600)">{t('errors.failedToLoadQuotation')}</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('buttons.goBack')}
        </Button>
      </div>
    );
  }

  if (!companyQuotation) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Icon name="circle-exclamation" style="solid" className="size-8 text-amber-400" />
        <p className="text-sm text-(--palette-gray-600)">{t('errors.companyNotFound')}</p>
        <Button variant="outline" size="sm" onClick={handleBack}>
          {t('buttons.back')}
        </Button>
      </div>
    );
  }

  const isParticipating = !isNonParticipatingStatus(companyQuotation.status);

  // ─── Render ──────────────────────────────────────────────────────────────────

  // In drawer mode the SlideOverPanel renders its own header and chrome; in page mode we render
  // the full page header + width container. Otherwise the inner content is identical.
  const isDrawer = mode === 'drawer';
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    isDrawer ? (
      <div className="space-y-5">{children}</div>
    ) : (
      <div className="w-full px-6 py-6 space-y-5">{children}</div>
    );

  return (
    <Wrapper>
      {/* Page header — page mode only. In drawer mode the same meta is rendered as a sub-row
          inside the panel since SlideOverPanel only takes title/subtitle strings. */}
      {!isDrawer ? (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-(--palette-ink) leading-snug">
              {t('page.extQuotationTitle')}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-(--palette-gray-500) flex-wrap">
              <span>
                <span className="font-medium text-(--palette-ink)">{t('page.quotationId')}:</span>{' '}
                {quotation.quotationNumber}
              </span>
              <span>·</span>
              <span>
                <span className="font-medium text-(--palette-ink)">{t('page.cutOffDate')}:</span>{' '}
                {fmtDate(quotation.cutOffTime)}
              </span>
              <span>·</span>
              <span className="font-medium text-(--palette-ink)">
                {localizeCompanyName(
                  companyQuotation.companyName,
                  companyQuotation.companyNameLocal,
                )}
              </span>
              <QuotationStatusBadge status={companyQuotation.status} />
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleBack}>
            <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
            Back
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-xs text-(--palette-gray-500) flex-wrap">
          <span>
            <span className="font-medium text-(--palette-ink)">{t('page.quotationId')}:</span>{' '}
            {quotation.quotationNumber}
          </span>
          <span>·</span>
          <span>
            <span className="font-medium text-(--palette-ink)">{t('page.cutOffDate')}:</span>{' '}
            {fmtDate(quotation.cutOffTime)}
          </span>
          <span>·</span>
          <span className="font-medium text-(--palette-ink)">
            {localizeCompanyName(companyQuotation.companyName, companyQuotation.companyNameLocal)}
          </span>
          <QuotationStatusBadge status={companyQuotation.status} />
        </div>
      )}

      {/* Main content — left rail + right pane */}
      <div className="rounded-xl border border-(--palette-line) overflow-hidden">
        <div className="flex flex-col md:grid md:grid-cols-[16rem_1fr] min-h-[600px]">
          {/* Left rail */}
          {appraisals.length === 0 ? (
            <div className="flex items-center justify-center w-full h-40 text-(--palette-gray-400) text-sm">
              {t('empty.noAppraisalsQuotation')}
            </div>
          ) : (
            <>
              <AppraisalLeftRail
                appraisals={appraisals}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                feeAmounts={netAmounts}
              />

              {/* Right pane */}
              <div className="flex-1 overflow-y-auto divide-y divide-(--palette-line-soft)">
                {selectedAppraisal ? (
                  <div className="p-5 space-y-6">
                    {/* Section 1 — Appraisal Information */}
                    <section aria-label={t('aria.sectionAppraisalInfo')}>
                      <h2 className="text-base font-semibold text-(--palette-ink) mb-3 pb-1.5 border-b border-(--palette-line-soft)">
                        {t('sections.appraisalInformation')}
                      </h2>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="block text-xs text-(--palette-gray-500) mb-0.5">
                            {t('fields.appraisalNumber')}
                          </span>
                          <span className="font-medium text-(--palette-ink)">
                            {selectedAppraisal.appraisalNumber?.trim() || '—'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-(--palette-gray-500) mb-0.5">
                            {t('fields.customerName')}
                          </span>
                          <span className="font-medium text-(--palette-ink)">
                            {selectedAppraisal.customerName ?? '—'}
                          </span>
                        </div>
                      </div>
                    </section>

                    {/* Section 2 — Attached Documents (grouped by section, mirrors ext-company submit page) */}
                    {appraisalDocs.length > 0 && (
                      <section aria-label={t('aria.sectionAttachedDocs')}>
                        <h2 className="text-base font-semibold text-(--palette-ink) mb-3 pb-1.5 border-b border-(--palette-line-soft)">
                          {t('sections.attachDocument')}
                        </h2>
                        <div className="rounded-lg border border-(--palette-line) overflow-hidden">
                          <table className="w-full text-xs table-fixed">
                            <colgroup>
                              <col className="w-[24%]" />
                              <col className="w-[34%]" />
                              <col className="w-[18%]" />
                              <col />
                            </colgroup>
                            <thead className="bg-(--palette-surface-3) text-[11px] uppercase tracking-wider text-(--palette-ink) border-b-2 border-(--palette-line-strong)">
                              <tr>
                                <th className="text-xs text-left px-3 py-2.5 font-semibold">
                                  {t('columns.type')}
                                </th>
                                <th className="text-xs text-left px-3 py-2.5 font-semibold">
                                  {t('columns.fileName')}
                                </th>
                                <th className="text-xs text-left px-3 py-2.5 font-semibold">
                                  {t('columns.uploadedAt')}
                                </th>
                                <th className="text-xs text-left px-3 py-2.5 font-semibold">
                                  {t('columns.notes')}
                                </th>
                              </tr>
                            </thead>
                            {docSectionGroups.map(group => (
                              <tbody
                                key={group.label}
                                className="divide-y divide-(--palette-line-soft)"
                              >
                                <tr className="bg-(--palette-surface-2)/60">
                                  <td colSpan={4} className="px-3 py-1.5">
                                    <div className="flex items-center gap-2">
                                      <Icon
                                        name={group.titleNumber ? 'building' : 'file-lines'}
                                        style="solid"
                                        className="size-3 text-(--palette-gray-400) shrink-0"
                                      />
                                      <span className="text-[11px] font-medium text-(--palette-gray-600)">
                                        {group.label}
                                      </span>
                                      <span className="text-[10px] text-(--palette-gray-400)">
                                        ({group.docs.length})
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {group.docs.map(doc => (
                                  <DocRow
                                    key={doc.documentId}
                                    fileName={doc.fileName}
                                    documentTypeName={doc.documentTypeName}
                                    uploadedAt={doc.uploadedAt}
                                    notes={doc.notes}
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
                            ))}
                          </table>
                        </div>
                      </section>
                    )}

                    {/* Section 3 — Quotation Information — Appraisal Fee */}
                    {selectedItem && (
                      <section aria-label={t('aria.sectionQuotationInfo')}>
                        <h2 className="text-base font-semibold text-(--palette-ink) mb-3 pb-1.5 border-b border-(--palette-line-soft)">
                          {t('sections.quotationInformationFee')}
                        </h2>
                        <ReadOnlyFeeGrid item={selectedItem} />
                      </section>
                    )}

                    {/* Section 4 — Duration */}
                    {selectedItem && (
                      <section aria-label={t('aria.sectionDuration')}>
                        <h2 className="text-base font-semibold text-(--palette-ink) mb-3 pb-1.5 border-b border-(--palette-line-soft)">
                          {t('sections.duration')}
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-(--palette-gray-600) mb-1">
                              {t('fields.maxAppraisalDuration')}
                            </label>
                            <div className="w-full px-2.5 py-1.5 border border-(--palette-line) rounded-lg text-sm bg-(--palette-surface-2) text-(--palette-gray-600)">
                              {selectedAppraisal?.maxAppraisalDays ?? '—'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-(--palette-gray-600) mb-1">
                              {t('fields.estimatedMandays')}
                            </label>
                            <div className="w-full px-2.5 py-1.5 border border-(--palette-line) rounded-lg text-sm bg-(--palette-surface-2) text-(--palette-gray-600)">
                              {selectedItem.estimatedDays ?? '—'}
                            </div>
                          </div>
                        </div>
                      </section>
                    )}

                    {/* Section 5 — Remark for this Appraisal */}
                    {selectedItem && (
                      <section aria-label={t('aria.sectionAppraisalRemark')}>
                        <h2 className="text-base font-semibold text-(--palette-ink) mb-3 pb-1.5 border-b border-(--palette-line-soft)">
                          {t('sections.appraisalRemark')}
                        </h2>
                        <div className="px-3 py-2 bg-(--palette-surface-2) border border-(--palette-line) rounded-lg text-sm text-(--palette-ink) min-h-[4rem] whitespace-pre-wrap">
                          {selectedItem.itemNotes?.trim() || '—'}
                        </div>
                      </section>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-40 text-sm text-(--palette-gray-400)">
                    {t('empty.selectAppraisalLeft')}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer row — matches ext-company submit page */}
        <div className="border-t border-primary/20 bg-primary/5 px-5 py-4 space-y-4">
          {/* Total + Participating */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <span className="text-sm font-semibold text-(--palette-ink)">
                {t('fields.totalFeeAmount')}
              </span>
              <span className="ml-2 text-base font-bold text-(--palette-primary-text)">
                {grandTotal > 0 ? THB.format(grandTotal) : '—'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-(--palette-ink)">
                {t('fields.participating')}
              </span>
              <span
                className={`px-3 py-1 rounded-lg text-sm font-medium border ${
                  isParticipating
                    ? 'bg-primary/10 text-(--palette-primary-text) border-primary/30'
                    : 'bg-(--palette-req-wash) text-(--palette-danger) border-(--palette-req-line)'
                }`}
              >
                {isParticipating ? t('yesNo.yes') : t('yesNo.no')}
              </span>
            </div>
          </div>

          {/* Quotation Remark (read-only) */}
          <div>
            <label className="block text-sm text-(--palette-gray-600) mb-1">
              {t('fields.quotationRemark')}
            </label>
            <div className="px-3 py-2 bg-(--palette-surface) border border-(--palette-line) rounded-lg text-sm text-(--palette-ink) min-h-[4rem] whitespace-pre-wrap">
              {companyQuotation.remarks ?? '—'}
            </div>
          </div>

          {/* Action buttons. In drawer mode the SlideOverPanel provides its own close
              affordance (the × in the header), so suppress the redundant Cancel button. */}
          {!isDrawer && (
            <div className="flex items-center justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={handleBack}>
                <Icon name="xmark" style="solid" className="size-4 mr-2" />
                {t('common:actions.cancel')}
              </Button>
            </div>
          )}
        </div>
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
    </Wrapper>
  );
};

// ─── Route adapter ────────────────────────────────────────────────────────────
//
// Thin page wrapper used by the router. Pulls IDs from the URL and supplies an
// onClose that navigates back to the parent quotation page. Drawer callers should
// import `AdminCompanyQuotationDetailContent` directly and supply their own
// onClose, which keeps the embedded view free of routing dependencies.

const AdminCompanyQuotationDetailPage = () => {
  const { quotationRequestId, companyQuotationId } = useParams<{
    quotationRequestId: string;
    companyQuotationId: string;
  }>();
  const navigate = useNavigate();

  if (!quotationRequestId || !companyQuotationId) {
    // React Router won't normally land us here without both params, but guard
    // against a malformed URL so we don't pass undefined down.
    return null;
  }

  return (
    <AdminCompanyQuotationDetailContent
      quotationRequestId={quotationRequestId}
      companyQuotationId={companyQuotationId}
      mode="page"
      onClose={() => navigate(`/quotations/${quotationRequestId}`)}
    />
  );
};

export default AdminCompanyQuotationDetailPage;

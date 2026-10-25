import { useEffect, useMemo, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import Icon from '@/shared/components/Icon';
import Badge from '@/shared/components/Badge';
import Button from '@/shared/components/Button';
import Input from '@/shared/components/Input';
import FormCard from '@/shared/components/sections/FormCard';
import Textarea from '@/shared/components/inputs/Textarea';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { useGetAppraisalQuotations, useGetEligibleCompanies } from '../api/administration';
import {
  useGetQuotationById,
  useSendQuotation,
  useSetSharedDocuments,
  useRemoveAppraisalFromDraft,
  useCancelQuotation,
  useEditDraftQuotation,
} from '@/features/quotation/api/quotation';
import { useGetRequestDocuments } from '@/features/request/api/documents';
import type { QuotationStatus } from '../types/administration';
import type {
  AppraisalSummaryDto,
  CompanyQuotationDto,
  InvitedCompanyDto,
  SharedDocumentSelectionDto,
} from '@/features/quotation/schemas/quotation';
import QuotationStatusBadge from '@/features/quotation/components/QuotationStatusBadge';
import AdminShortlistPanel from '@/features/quotation/components/AdminShortlistPanel';
import ShortlistSentPanel from '@/features/quotation/components/ShortlistSentPanel';
import NegotiationPanel from '@/features/quotation/components/NegotiationPanel';
import RejectTentativeModal from '@/features/quotation/components/RejectTentativeModal';
import FinalizeModal from '@/features/quotation/components/FinalizeModal';
import { isStandaloneQuotation } from '@/features/quotation/utils/isStandaloneQuotation';
import {
  newestQuotation,
  pickShownQuotation,
} from '@/features/quotation/utils/pickActiveQuotation';
import NegotiationModal from '@/features/quotation/components/NegotiationModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import AppraisalsPopover from '@/features/quotation/components/AppraisalsPopover';
import InvitedCompaniesPopover from '@/features/quotation/components/InvitedCompaniesPopover';
import {
  MissingSegmentsBadge,
  SegmentChips,
  SegmentGapsAlert,
} from '@/features/quotation/components/SegmentBadges';
import { useSegmentLabel } from '@/features/quotation/hooks/useSegmentLabel';
import { useCoveringCompanySearch } from '@/features/quotation/hooks/useCoveringCompanySearch';
import {
  getMissingSegments,
  getSegmentGaps,
  isSegmentCoverageMismatch,
} from '@/features/quotation/utils/segmentCoverage';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Modal from '@/shared/components/Modal';
import EmailCompositionModal from '@/shared/components/EmailCompositionModal';
import type { EmailFormValues } from '@/shared/schemas/email';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';
import { useLocalizedCompanyName } from '@/shared/utils/companyName';
import { useAuthStore } from '@/features/auth/store';
import { formatDate, formatLocaleDate, formatLocaleDateTime } from '@/shared/utils/dateUtils';
import { formatCurrency } from '@/shared/utils/formatUtils';
import { sortCompanyResponses } from '@/features/quotation/utils/sortCompanyResponses';
import { Link } from 'react-router-dom';
import { MAX_NEGOTIATION_ROUNDS, QUOTATION_SELECTION_ROLES } from '@/features/quotation/constants';
import { sumQuotationItems } from '@/features/quotation/utils/sumQuotationItems';
import { hasRoleOrPermission } from '@/shared/utils/accessControl';
import {
  buildQuotationEmailHtml,
  formatQuotationSubjectAppraisalNumbersLabel,
  formatQuotationSubjectCustomerLabel,
  TABLE_ROW_THRESHOLD,
} from '@/features/quotation/utils/quotationEmailTemplate';

// ─── Shared bits ──────────────────────────────────────────────────────────────

const fmtCurrency = (v?: number | null) => (v != null ? formatCurrency(v) : '—');

/** Date (follows the language's calendar, like the cut-off) + HH:mm, split so the table can stack
    them; null for a missing/unparsable date. */
const splitDateTime = (iso: string | null | undefined, language: string | undefined) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return { date: formatLocaleDate(d, language), time: formatDate(d, 'HH:mm') };
};

const Dash = () => <span className="text-(--palette-gray-400)">—</span>;

/** Row of equal stat cells; each cell may carry an info popover next to its label. */
const StatStrip = ({ children }: { children: ReactNode }) => (
  <div className="grid grid-cols-3 divide-x divide-(--palette-line-soft) overflow-hidden rounded-xl border border-(--palette-line-soft)">
    {children}
  </div>
);

const Stat = ({
  label,
  warn = false,
  children,
}: {
  label: ReactNode;
  /** Amber value: a required figure that is still missing/zero. */
  warn?: boolean;
  children: ReactNode;
}) => (
  <div className="min-w-0 px-3 py-2">
    <div className="flex items-center gap-1 text-xs text-(--palette-gray-500)">{label}</div>
    <div
      className={clsx(
        'text-sm font-semibold',
        warn ? 'text-amber-600 dark:text-amber-400' : 'text-(--palette-ink)',
      )}
    >
      {children}
    </div>
  </div>
);

/** A company with no CompanyQuotation, or one still on the company's side (its own draft or
    internal maker/checker review), has not replied to the bank: dashes and a neutral badge, never
    the internal state. */
const NOT_REPLIED_STATUSES = ['Draft', 'Pending', 'PendingCheckerReview'];

interface ResponsesTableProps {
  invitedCompanies: InvitedCompanyDto[];
  companyQuotations: CompanyQuotationDto[];
}

/** Sent: one row per invited company. Figures of a company that has not replied are "—", never 0.00. */
const ResponsesTable = ({ invitedCompanies, companyQuotations }: ResponsesTableProps) => {
  const { t, i18n } = useTranslation(['appraisal', 'quotation']);
  const localizeCompanyName = useLocalizedCompanyName();
  const th =
    'bg-(--palette-surface-2) border-b border-(--palette-line) px-2 py-2 align-bottom text-xs font-semibold text-(--palette-gray-600)';
  const td = 'border-b border-(--palette-line-soft) px-2 py-2 align-middle';

  return (
    <div className="overflow-x-auto rounded-lg border border-(--palette-line)">
      <table className="w-full min-w-[40rem] text-sm tabular-nums">
        <thead>
          <tr>
            <th className={clsx(th, 'text-left')}>{t('quotation.table.company')}</th>
            <th className={clsx(th, 'text-right')}>{t('quotation.table.totalFeeAmount')}</th>
            <th className={clsx(th, 'text-right')}>{t('quotation.table.totalDiscount')}</th>
            <th className={clsx(th, 'text-right')}>{t('quotation.table.totalNetAmount')}</th>
            <th className={clsx(th, 'text-right')}>{t('quotation.table.totalEstimateManday')}</th>
            <th className={clsx(th, 'text-left')}>{t('quotation.table.submittedAt')}</th>
            <th className={clsx(th, 'text-left')}>{t('quotation.table.status')}</th>
          </tr>
        </thead>
        <tbody className="[&_tr:last-child_td]:border-b-0">
          {invitedCompanies.map(inv => {
            const cq = companyQuotations.find(q => q.companyId === inv.companyId);
            const replied = cq !== undefined && !NOT_REPLIED_STATUSES.includes(cq.status);
            // Items of a company that has not replied count as none, so "has items" already says
            // "replied": Total fee and Discount show a figure only then, never a made-up 0.00.
            const items = (replied ? cq?.items : undefined) ?? [];
            const { totalFeeAmount, totalDiscount } = sumQuotationItems(items);
            const days = items
              .map(item => item.estimatedDays)
              .filter((d): d is number => typeof d === 'number' && d > 0);
            const minDays = days.length ? Math.min(...days) : undefined;
            const maxDays = days.length ? Math.max(...days) : undefined;
            const hasQuote = replied && (items.length > 0 || (cq?.totalQuotedPrice ?? 0) > 0);
            const submitted = replied ? splitDateTime(cq?.submittedAt, i18n.language) : null;
            const companyName = localizeCompanyName(inv.companyName, inv.companyNameLocal);

            return (
              <tr key={inv.companyId} className="hover:bg-(--palette-surface-2)">
                <td className={td}>
                  <div
                    className="max-w-[14rem] truncate font-medium text-(--palette-ink)"
                    title={companyName}
                  >
                    {companyName}
                  </div>
                </td>
                <td className={clsx(td, 'text-right')}>
                  {items.length > 0 ? fmtCurrency(totalFeeAmount) : <Dash />}
                </td>
                <td className={clsx(td, 'text-right')}>
                  {items.length > 0 ? fmtCurrency(totalDiscount) : <Dash />}
                </td>
                <td className={clsx(td, 'text-right font-semibold text-(--palette-ink)')}>
                  {hasQuote ? fmtCurrency(cq?.totalQuotedPrice) : <Dash />}
                </td>
                <td className={clsx(td, 'text-right')}>
                  {minDays !== undefined && maxDays !== undefined ? (
                    minDays === maxDays ? (
                      minDays
                    ) : (
                      `${minDays} - ${maxDays}`
                    )
                  ) : (
                    <Dash />
                  )}
                </td>
                <td className={td}>
                  {submitted ? (
                    <>
                      <div>{submitted.date}</div>
                      <div className="text-xs text-(--palette-gray-400)">{submitted.time}</div>
                    </>
                  ) : (
                    <Dash />
                  )}
                </td>
                <td className={td}>
                  {replied && cq ? (
                    <QuotationStatusBadge status={cq.status} className="whitespace-nowrap" />
                  ) : (
                    <Badge tone="gray" dot={false} className="whitespace-nowrap">
                      {t('quotation:vendorStatus.Pending')}
                    </Badge>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// ─── ShareDocumentsStep ───────────────────────────────────────────────────────

/**
 * State: outer key = appraisalId, inner key = documentId,
 * value = { level: 'RequestLevel' | 'TitleLevel' }
 */
type ShareSelections = Record<
  string,
  Record<string, { level: SharedDocumentSelectionDto['level'] }>
>;

interface ShareDocumentsStepProps {
  appraisals: AppraisalSummaryDto[];
  selections: ShareSelections;
  onToggle: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
  /** Appraisals whose request has no uploaded docs — skipped in the coverage gate. */
  noDocsAppraisalIds: Set<string>;
  onReportNoDocs: (appraisalId: string, noDocs: boolean) => void;
}

const ShareDocumentsStep = ({
  appraisals,
  selections,
  onToggle,
  noDocsAppraisalIds,
  onReportNoDocs,
}: ShareDocumentsStepProps) => {
  const { t } = useTranslation('appraisal');
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const appraisal = appraisals[activeTabIdx];

  if (appraisals.length === 0) {
    return (
      <p className="text-sm text-(--palette-gray-500) py-4 text-center">
        {t('quotation.shareDocuments.noAppraisals')}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-(--palette-line) overflow-x-auto shrink-0">
        {appraisals.map((ap, idx) => {
          const apSelection = selections[ap.appraisalId] ?? {};
          const hasNoDocs = noDocsAppraisalIds.has(ap.appraisalId);
          const covered = hasNoDocs || Object.keys(apSelection).length >= 1;
          return (
            <button
              key={ap.appraisalId}
              type="button"
              onClick={() => setActiveTabIdx(idx)}
              className={clsx(
                'flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap shrink-0',
                activeTabIdx === idx
                  ? 'border-primary text-(--palette-primary-text)'
                  : 'border-transparent text-(--palette-gray-500) hover:text-(--palette-ink) hover:border-(--palette-line-strong)',
              )}
            >
              {hasNoDocs ? (
                <Icon name="circle-minus" style="solid" className="text-(--palette-gray-300)" />
              ) : covered ? (
                <Icon name="circle-check" style="solid" className="text-green-500" />
              ) : (
                <Icon name="triangle-exclamation" style="solid" className="text-amber-400" />
              )}
              {ap.appraisalNumber ?? ap.appraisalId.slice(0, 8)}
            </button>
          );
        })}
      </div>

      {/* Active tab content */}
      {appraisal && (
        <AppraisalDocTab
          key={appraisal.appraisalId}
          appraisal={appraisal}
          apSelection={selections[appraisal.appraisalId] ?? {}}
          onToggle={onToggle}
          onReportNoDocs={onReportNoDocs}
        />
      )}
    </div>
  );
};

interface AppraisalDocTabProps {
  appraisal: AppraisalSummaryDto;
  apSelection: Record<string, { level: SharedDocumentSelectionDto['level'] }>;
  onToggle: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
  onReportNoDocs: (appraisalId: string, noDocs: boolean) => void;
}

const AppraisalDocTab = ({
  appraisal,
  apSelection,
  onToggle,
  onReportNoDocs,
}: AppraisalDocTabProps) => {
  const { t } = useTranslation('appraisal');
  const { data, isLoading } = useGetRequestDocuments(appraisal.requestId ?? undefined);

  const sections = data?.sections ?? [];
  const hasAnyUploadedDocs = sections.some(s => s.documents.some(d => d.documentId));
  const isNoDocs = !isLoading && (!appraisal.requestId || !hasAnyUploadedDocs);

  useEffect(() => {
    if (isLoading) return;
    onReportNoDocs(appraisal.appraisalId, isNoDocs);
  }, [isLoading, isNoDocs, appraisal.appraisalId, onReportNoDocs]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 px-3 text-xs text-(--palette-gray-400)">
        <Icon name="spinner" style="solid" className="animate-spin" />
        {t('quotation.shareDocuments.loadingDocuments')}
      </div>
    );
  }

  if (!appraisal.requestId) {
    return (
      <div className="px-3 py-4 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
        <Icon name="triangle-exclamation" style="solid" className="shrink-0" />
        {t('quotation.shareDocuments.noRequestLinked')}
      </div>
    );
  }

  if (!hasAnyUploadedDocs) {
    return (
      <div className="px-3 py-4 text-xs text-(--palette-gray-400)">
        {t('quotation.shareDocuments.noDocuments')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 divide-y divide-(--palette-line-soft) max-h-80 overflow-y-auto">
      {sections.map((section, sIdx) => {
        const level: SharedDocumentSelectionDto['level'] =
          section.titleId == null ? 'RequestLevel' : 'TitleLevel';
        const uploadedDocs = section.documents.filter(d => d.documentId);

        if (uploadedDocs.length === 0) return null;

        const allSelected = uploadedDocs.every(d => !!apSelection[d.documentId!]);

        const handleSelectAll = (checked: boolean) => {
          uploadedDocs.forEach(d => onToggle(appraisal.appraisalId, d.documentId!, level, checked));
        };

        return (
          <div key={sIdx} className="px-3 py-2">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-(--palette-gray-500)">
                {section.sectionLabel}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="size-3.5 accent-primary rounded"
                />
                <span className="text-xs text-(--palette-gray-500)">
                  {t('quotation.shareDocuments.selectAll')}
                </span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              {uploadedDocs.map(doc => (
                <label
                  key={doc.documentId}
                  className="flex items-center gap-2 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={!!apSelection[doc.documentId!]}
                    onChange={e =>
                      onToggle(appraisal.appraisalId, doc.documentId!, level, e.target.checked)
                    }
                    className="size-3.5 accent-primary rounded shrink-0"
                  />
                  <span className="text-xs text-(--palette-ink) truncate group-hover:text-(--palette-primary-text)">
                    {doc.fileName ?? doc.documentId}
                    {doc.documentTypeName && (
                      <span className="text-(--palette-gray-400)"> ({doc.documentTypeName})</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── EditDraftForm ────────────────────────────────────────────────────────────
// TODO: extract the company-picker JSX into a shared component when time permits.

const EMPTY_SEGMENT_SET: string[] = [];
const EMPTY_INVITED: InvitedCompanyDto[] = [];

interface EditDraftFormProps {
  /** The draft's Segment Set; only companies covering every segment in it are listed. */
  segmentSet: ReadonlyArray<string>;
  /** Currently invited companies, with the server's coverage gaps; fallback for `missingFor`. */
  invitedCompanies: ReadonlyArray<Pick<InvitedCompanyDto, 'companyId' | 'missingSegments'>>;
  editDueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  editCompanyIds: Set<string>;
  editCompanyNames: Record<string, string>;
  onEditCompanyIdsChange: (ids: Set<string>) => void;
  onEditCompanyNamesChange: (names: Record<string, string>) => void;
  editSearchQuery: string;
  onEditSearchQueryChange: (q: string) => void;
  editMaxAppraisalDays: number | null;
  onEditMaxAppraisalDaysChange: (v: number | null) => void;
  editSpecialRequirements: string;
  onEditSpecialRequirementsChange: (v: string) => void;
}

const EditDraftForm = ({
  segmentSet,
  invitedCompanies,
  editDueDate,
  onDueDateChange,
  editCompanyIds,
  editCompanyNames,
  onEditCompanyIdsChange,
  onEditCompanyNamesChange,
  editSearchQuery,
  onEditSearchQueryChange,
  editMaxAppraisalDays,
  onEditMaxAppraisalDaysChange,
  editSpecialRequirements,
  onEditSpecialRequirementsChange,
}: EditDraftFormProps) => {
  const { t } = useTranslation(['appraisal', 'quotation', 'common']);
  const localizeCompanyName = useLocalizedCompanyName();
  const segmentLabel = useSegmentLabel();
  // Unfiltered: the draft can hold several segments, so coverage is checked client-side against the
  // whole Segment Set (same as EditDraftQuotationModal). The API's Send guard is authoritative.
  const {
    data: rawCompanies,
    isLoading: isLoadingCompanies,
    isError: isCompaniesError,
  } = useGetEligibleCompanies(undefined, true, false);

  const allCompanies = useMemo(
    () =>
      (rawCompanies ?? []).map(c => ({
        id: c.id,
        companyName: c.companyName,
        companyNameLocal: c.companyNameLocal,
        loanTypes: c.loanTypes ?? [],
      })),
    [rawCompanies],
  );

  const { filtered: filteredCompanies, noCoverage } = useCoveringCompanySearch(
    allCompanies,
    segmentSet,
    editSearchQuery,
  );

  // Segments an already-chosen company lacks. Falls back to the server's per-company gaps when the
  // company is not in the eligible list (e.g. it was deactivated since it was invited).
  const missingFor = (companyId: string) => {
    const company = allCompanies.find(c => c.id === companyId);
    if (company) return getMissingSegments(segmentSet, company.loanTypes);
    return invitedCompanies.find(c => c.companyId === companyId)?.missingSegments ?? [];
  };

  const handleToggleCompany = (company: {
    id: string;
    companyName: string;
    companyNameLocal?: string | null;
  }) => {
    const next = new Set(editCompanyIds);
    if (next.has(company.id)) {
      next.delete(company.id);
      const nextNames = { ...editCompanyNames };
      delete nextNames[company.id];
      onEditCompanyNamesChange(nextNames);
    } else {
      next.add(company.id);
      onEditCompanyNamesChange({
        ...editCompanyNames,
        [company.id]: localizeCompanyName(company.companyName, company.companyNameLocal),
      });
    }
    onEditCompanyIdsChange(next);
  };

  const handleRemoveChip = (companyId: string) => {
    const next = new Set(editCompanyIds);
    next.delete(companyId);
    const nextNames = { ...editCompanyNames };
    delete nextNames[companyId];
    onEditCompanyIdsChange(next);
    onEditCompanyNamesChange(nextNames);
  };

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-(--palette-line-soft) p-4 text-sm text-(--palette-gray-600)">
      {/* Max Appraisal Duration — editable for this appraisal only */}
      <div className="max-w-xs">
        <NumberInput
          label={t('quotation.maxAppraisalDuration')}
          helperText={t('quotation.editDraft.maxAppraisalDurationHelper')}
          placeholder={t('quotation:picker.maxDaysPlaceholder')}
          value={editMaxAppraisalDays}
          decimalPlaces={0}
          thousandSeparator={false}
          maxIntegerDigits={3}
          min={1}
          onChange={e => onEditMaxAppraisalDaysChange(e.target.value)}
        />
      </div>

      {/* Companies Invited — editable multiselect */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-(--palette-ink)">
          {t('quotation.editDraft.companiesInvited')}
          {segmentSet.length > 0 && (
            <span className="ml-1.5 text-purple-600 dark:text-purple-400 font-normal">
              ({t('quotation.editDraft.eligibleFor')}{' '}
              <strong>{segmentSet.map(segmentLabel).join(', ')}</strong>)
            </span>
          )}
        </div>

        {/* Selected company chips */}
        {editCompanyIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(editCompanyIds).map(id => (
              <div
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 rounded-full text-xs"
              >
                <Icon name="building" style="solid" />
                <span className="font-medium">{editCompanyNames[id] ?? id.slice(0, 8)}</span>
                <MissingSegmentsBadge missing={missingFor(id)} />
                <button
                  type="button"
                  onClick={() => handleRemoveChip(id)}
                  aria-label={t('quotation:section.removeCompany', {
                    company: editCompanyNames[id] ?? id.slice(0, 8),
                  })}
                  className="p-0.5 rounded-full hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors"
                >
                  <Icon name="xmark" style="solid" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Company list picker */}
        <Input
          type="text"
          placeholder={t('quotation.editDraft.companySearchPlaceholder')}
          value={editSearchQuery}
          onChange={e => onEditSearchQueryChange(e.target.value)}
          leftIcon={<Icon name="magnifying-glass" style="regular" className="size-3.5!" />}
        />
        <div className="max-h-36 overflow-y-auto rounded-lg border border-(--palette-line)">
          {isLoadingCompanies ? (
            <div className="px-4 py-4 text-center text-(--palette-gray-500)">
              <Icon name="spinner" style="solid" className="animate-spin mx-auto mb-1" />
              <span className="text-xs">{t('common:status.loading')}</span>
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="px-4 py-4 text-center text-(--palette-gray-500) text-xs">
              {isCompaniesError
                ? t('quotation.editDraft.failedToLoadCompanies')
                : noCoverage
                  ? t('quotation.editDraft.noCoveringCompanies')
                  : t('quotation.editDraft.noCompaniesFound')}
            </div>
          ) : (
            <div className="divide-y divide-(--palette-line-soft)">
              {filteredCompanies.map(company => {
                const isSelected = editCompanyIds.has(company.id);
                return (
                  <button
                    key={company.id}
                    type="button"
                    onClick={() => handleToggleCompany(company)}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors',
                      isSelected
                        ? 'bg-purple-50 dark:bg-purple-500/10 hover:bg-purple-100 dark:hover:bg-purple-500/20'
                        : 'hover:bg-(--palette-surface-2)',
                    )}
                  >
                    <div
                      className={clsx(
                        'size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                        isSelected
                          ? 'bg-purple-500 border-purple-500'
                          : 'border-(--palette-line-strong) bg-(--palette-surface)',
                      )}
                    >
                      {isSelected && <Icon name="check" style="solid" className="text-white" />}
                    </div>
                    <div className="size-6 rounded bg-purple-100 dark:bg-purple-500/20 flex items-center justify-center shrink-0">
                      <Icon
                        name="building"
                        style="solid"
                        className="text-purple-600 dark:text-purple-400"
                      />
                    </div>
                    <span className="flex-1 truncate text-(--palette-ink)">
                      {localizeCompanyName(company.companyName, company.companyNameLocal)}
                    </span>
                    <SegmentChips segments={company.loanTypes} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cut Off Time — editable */}
      <div className="max-w-xs">
        <DateTimePickerInput
          label={t('quotation.editDraft.cutOffTime')}
          required
          placeholder={t('quotation:section.dateTimePlaceholder')}
          value={editDueDate}
          onChange={onDueDateChange}
          disablePastDates
        />
      </div>

      {/* Special Requirements — quotation-level, editable */}
      <Textarea
        label={t('quotation.specialRequirements')}
        value={editSpecialRequirements}
        onChange={e => onEditSpecialRequirementsChange(e.target.value)}
        rows={3}
        maxLength={500}
        showCharCount
        className="min-h-20! resize-none!"
      />
    </div>
  );
};

const NavToQuotationScreen = ({
  canNavigate,
  quotationId,
  children,
}: {
  canNavigate: boolean;
  quotationId: string | null;
  children: React.ReactNode;
}) => {
  const { t } = useTranslation('appraisal');
  const id = quotationId ?? '';

  if (!canNavigate || !id) return <>{children}</>;

  return (
    <Link to={`/quotations/${id}`} className="group" title={t('quotation.viewQuotationHint')}>
      {children}
    </Link>
  );
};

// ─── QuotationSection ─────────────────────────────────────────────────────────

interface QuotationSectionProps {
  appraisalId: string;
  onCreateNew: () => void;
  /** @deprecated The "add to existing" flow is not used in the IBG quotation model. */
  onAddToExisting?: () => void;
  /**
   * Offer "assign every appraisal right after finalize" in the Finalize dialog (standalone
   * quotations only). The Administration page passes false: the admin has this appraisal's
   * appraisal-assignment task open there, and auto-assign would resume that same task.
   */
  allowAutoAssign?: boolean;
}

type SendStep = 'confirm' | 'share-docs';

/** Action row under a card's content: top rule, buttons wrap on a narrow column. */
const ACTION_ROW = 'flex flex-wrap items-center gap-2 border-t border-(--palette-line-soft) pt-3';

const QuotationSection = ({
  appraisalId,
  onCreateNew,
  allowAutoAssign = true,
}: QuotationSectionProps) => {
  const readOnly = usePageReadOnly();
  const { t, i18n } = useTranslation(['appraisal', 'quotation']);
  const localizeCompanyName = useLocalizedCompanyName();
  const currentUser = useAuthStore(s => s.user);
  const canOpenQuotation = hasRoleOrPermission(currentUser, QUOTATION_SELECTION_ROLES);
  const [sendStep, setSendStep] = useState<SendStep | null>(null);
  /** appraisalId → { documentId → { level } }; outer key tracks per-appraisal coverage */
  const [shareSelections, setShareSelections] = useState<ShareSelections>({});
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  /** Edit-draft mode state */
  const [isEditing, setIsEditing] = useState(false);
  const [editDueDate, setEditDueDate] = useState<string | null>(null);
  /** Local edit state: set of companyIds currently selected in the edit form */
  const [editCompanyIds, setEditCompanyIds] = useState<Set<string>>(new Set());
  /** Company name cache for edit-mode chips: companyId → companyName */
  const [editCompanyNames, setEditCompanyNames] = useState<Record<string, string>>({});
  const [editSearchQuery, setEditSearchQuery] = useState('');
  /** Max appraisal duration edit for THIS appraisal (null = not set) */
  const [editMaxAppraisalDays, setEditMaxAppraisalDays] = useState<number | null>(null);
  /** Quotation-level special requirements edit */
  const [editSpecialRequirements, setEditSpecialRequirements] = useState('');
  /** Cancel-Quotation confirmation modal — only shown for non-Draft, non-terminal statuses.
      Draft uses the per-appraisal "Remove" button (which auto-cancels on last removal);
      Finalized/Cancelled are terminal so cancel is hidden there. */
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  /** Set of appraisalIds whose request has no uploadable documents — skipped in coverage. */
  const [noDocsAppraisalIds, setNoDocsAppraisalIds] = useState<Set<string>>(new Set());
  const { isOpen: isRejectOpen, onOpen: openReject, onClose: closeReject } = useDisclosure();
  const { isOpen: isFinalizeOpen, onOpen: openFinalize, onClose: closeFinalize } = useDisclosure();
  const {
    isOpen: isNegotiateOpen,
    onOpen: openNegotiate,
    onClose: closeNegotiate,
  } = useDisclosure();

  const handleReportNoDocs = (appraisalId: string, noDocs: boolean) => {
    setNoDocsAppraisalIds(prev => {
      const has = prev.has(appraisalId);
      if (noDocs === has) return prev;
      const next = new Set(prev);
      if (noDocs) next.add(appraisalId);
      else next.delete(appraisalId);
      return next;
    });
  };

  const handleDocToggle = (
    docAppraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => {
    setShareSelections(prev => {
      const apPrev = prev[docAppraisalId] ?? {};
      if (checked) {
        return { ...prev, [docAppraisalId]: { ...apPrev, [documentId]: { level } } };
      }
      const apNext = { ...apPrev };
      delete apNext[documentId];
      return { ...prev, [docAppraisalId]: apNext };
    });
  };

  // Fetch quotations that this appraisal belongs to
  const { data: quotations = [], isLoading: isLoadingList } =
    useGetAppraisalQuotations(appraisalId);

  // The quotation this section shows (shared rule with the Administration page, see
  // pickShownQuotation): so card and lock banner never disagree. A Cancelled quotation newer than
  // the shown Finalized one is noted under the Finalized card (with "new quotation").
  const activeQuotation = pickShownQuotation(quotations) ?? null;
  const {
    data: quotationDetail,
    isLoading: isLoadingDetail,
    isError: isDetailError,
  } = useGetQuotationById(activeQuotation?.id ?? null);
  const { mutate: sendQuotation, isPending: isSending } = useSendQuotation(
    activeQuotation?.id ?? '',
  );
  const { mutate: setSharedDocuments, isPending: isSettingDocs } = useSetSharedDocuments(
    activeQuotation?.id ?? '',
  );
  const { mutate: removeAppraisal, isPending: isRemoving } = useRemoveAppraisalFromDraft(
    activeQuotation?.id ?? '',
  );
  const { mutate: cancelQuotation, isPending: isCancelling } = useCancelQuotation(
    activeQuotation?.id ?? '',
  );
  const { mutate: editDraftQuotation, isPending: isEditSaving } = useEditDraftQuotation(
    activeQuotation?.id ?? '',
  );

  // PropertyType code → locale description (e.g. "LB" → "ที่ดินพร้อมสิ่งปลูกสร้าง").
  const propertyTypeParams = useParametersByGroup('PropertyType');
  const buildingTypeParams = useParametersByGroup('BuildingType', 'th', 'th');
  const machineStatusParams = useParametersByGroup('MachineStatus', 'th', 'th');

  const defaultEmailValues = useMemo(() => {
    const appraisals = quotationDetail?.appraisals ?? [];
    const cutOffTime = quotationDetail?.cutOffTime ? new Date(quotationDetail.cutOffTime) : null;

    const propertyTypeDescription = (code: string | null | undefined) => {
      if (!code) return '';
      return propertyTypeParams.find(p => p.code === code)?.description ?? code;
    };
    const buildingTypeDescription = (code: string | null | undefined) => {
      if (!code) return '';
      return buildingTypeParams.find(p => p.code === code)?.description ?? code;
    };
    const machineStatusDescription = (code: string | null | undefined) => {
      if (!code) return '';
      return machineStatusParams.find(p => p.code === code)?.description ?? code;
    };

    const distinctCustomerNames = [
      ...new Set(appraisals.map(a => a.customerName).filter((n): n is string => Boolean(n))),
    ];
    const appraisalNumbers = appraisals.map(a => a.appraisalNumber ?? '').filter(Boolean);

    const targetTime = cutOffTime
      ? cutOffTime.toLocaleTimeString('th-TH', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '';
    const targetDate = cutOffTime
      ? cutOffTime.toLocaleDateString('th-TH-u-ca-buddhist', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

    const adminFullName = `${currentUser?.firstName ?? ''} ${currentUser?.lastName ?? ''}`.trim();

    const bccEmails = (quotationDetail?.invitedCompanies ?? [])
      .map(c => c.email)
      .filter(Boolean)
      .join(',');

    return {
      from: currentUser?.email ?? '',
      cc: 'appraisal.team@lhbank.com',
      bcc: bccEmails,
      subject: `Quotation ${formatQuotationSubjectCustomerLabel(distinctCustomerNames)} (${formatQuotationSubjectAppraisalNumbersLabel(appraisalNumbers)})`,
      content: buildQuotationEmailHtml({
        appraisals,
        targetTime,
        targetDate,
        adminFullName,
        propertyTypeDescription,
        buildingTypeDescription,
        machineStatusDescription,
      }),
    };
  }, [quotationDetail, currentUser, propertyTypeParams, buildingTypeParams, machineStatusParams]);

  /**
   * Statuses where the Cancel Quotation action is offered. Mirrors the branches
   * that include `renderCancelFooter()`. Used as a pre-flight guard so a stale
   * modal (e.g., another admin cancelled in parallel and our cached detail hasn't
   * refetched) doesn't fire a no-op cancel against an already-terminal RFQ —
   * backend's `Cancel` is idempotent and would silently drop the user's reason.
   */
  const CANCELLABLE_STATUSES: ReadonlyArray<QuotationStatus | string> = [
    'Sent',
    'UnderAdminReview',
    'PendingRmSelection',
    'WinnerTentative',
    'Negotiating',
  ];

  const handleConfirmCancelQuotation = () => {
    // Guard against a stale modal — by the time the user hit Confirm the cached
    // status may have moved to Cancelled/Finalized due to another admin's action.
    const currentStatus = quotationDetail?.status ?? activeQuotation?.status;
    if (!currentStatus || !CANCELLABLE_STATUSES.includes(currentStatus)) {
      toast.error(t('quotation.toasts.notCancellable', { status: currentStatus ?? 'unknown' }));
      setShowCancelConfirm(false);
      setCancelReason('');
      return;
    }
    cancelQuotation(
      { reason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          toast.success(t('quotation.toasts.quotationCancelled'));
          setShowCancelConfirm(false);
          setCancelReason('');
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? t('quotation.toasts.quotationCancelFailed'));
        },
      },
    );
  };

  const handleRemoveAppraisal = () => {
    removeAppraisal(appraisalId, {
      onSuccess: () => {
        toast.success(t('quotation.toasts.removedFromQuotation'));
        setShowRemoveConfirm(false);
      },
      onError: (err: unknown) => {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(apiErr?.apiError?.detail ?? t('quotation.toasts.removeFailed'));
      },
    });
  };

  const isLoading = isLoadingList || (!!activeQuotation && isLoadingDetail);

  // Thai → Buddhist calendar ("25 เม.ย. 2569 00:00"); otherwise dd/MM/yyyy HH:mm.
  const formatDateTime = (dateString: string) => formatLocaleDateTime(dateString, i18n.language);

  if (isLoading) {
    return (
      <FormCard title={t('quotation.sectionTitle')}>
        <div className="flex items-center gap-2 text-sm text-(--palette-gray-500)">
          <Icon name="spinner" style="solid" className="animate-spin text-(--palette-gray-400)" />
          {t('quotation.loading')}
        </div>
      </FormCard>
    );
  }

  // ── No quotation yet ──────────────────────────────────────────────────────
  if (!activeQuotation) {
    return (
      <FormCard title={t('quotation.sectionTitle')}>
        <div className="flex flex-col items-start gap-3">
          <div className="w-full rounded-lg border border-dashed border-(--palette-line-strong) bg-(--palette-surface-2) px-3 py-2">
            <p className="text-sm font-medium text-(--palette-ink)">{t('quotation.noQuotation')}</p>
            <p className="text-xs text-(--palette-gray-500)">{t('quotation.noQuotationHint')}</p>
          </div>
          {!readOnly && (
            <Button
              onClick={onCreateNew}
              size="sm"
              leftIcon={<Icon name="file-circle-plus" style="solid" />}
            >
              {t('quotation.requestQuotation')}
            </Button>
          )}
        </div>
      </FormCard>
    );
  }

  const status = (quotationDetail?.status ?? activeQuotation.status) as QuotationStatus | string;

  /** Card header's right side, identical for every status: quotation number (a link when the user
      may open it) and the status badge. */
  const headerMeta = (
    <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1">
      <NavToQuotationScreen canNavigate={canOpenQuotation} quotationId={activeQuotation.id}>
        <span
          className={clsx(
            'text-sm font-semibold',
            canOpenQuotation
              ? 'text-(--palette-primary-text) group-hover:underline'
              : 'text-(--palette-ink)',
          )}
        >
          {activeQuotation.quotationNumber}
        </span>
      </NavToQuotationScreen>
      <QuotationStatusBadge status={status} />
    </div>
  );

  const renderFrame = (children: ReactNode, title: string = t('quotation.sectionTitle')) => (
    <FormCard title={title} rightIcon={headerMeta}>
      <div className="flex flex-col gap-3">{children}</div>
    </FormCard>
  );

  /** Detail not available (request failed): header stays, body says why. */
  const renderDetailMissing = () =>
    renderFrame(
      <p className="text-xs text-(--palette-gray-500)">{t('quotation.loadDetailFailed')}</p>,
    );

  /** Cancel Quotation link + modal — used in every non-terminal, non-Draft branch.
      Draft auto-cancels via last-appraisal-removal so it gets the Remove link instead;
      Finalized/Cancelled are terminal so the action is hidden. */
  const closeCancelModal = () => {
    setShowCancelConfirm(false);
    setCancelReason('');
  };
  const cancelLink = (
    <button
      type="button"
      onClick={() => setShowCancelConfirm(true)}
      disabled={isCancelling}
      className="inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Icon name="ban" style="solid" />
      {t('quotation.cancelQuotation')}
    </button>
  );
  /** Cancel link on a row of its own (statuses that have no other action row). */
  const renderCancelRow = () =>
    !readOnly && <div className={clsx(ACTION_ROW, 'justify-end')}>{cancelLink}</div>;
  const cancelModal = (
    <Modal
      isOpen={showCancelConfirm}
      onClose={closeCancelModal}
      title={t('quotation.cancelQuotationTitle')}
      size="sm"
    >
      <div className="flex flex-col gap-4">
        <div className="p-3 bg-(--palette-req-wash) rounded-lg border border-red-100 dark:border-red-500/20 flex items-start gap-2">
          <Icon
            name="triangle-exclamation"
            style="solid"
            className="text-red-500 shrink-0 mt-0.5"
          />
          <p className="text-sm text-(--palette-req)">
            {t('quotation.cancelConfirmMessage', {
              quotationNumber: activeQuotation.quotationNumber,
            })}
          </p>
        </div>
        <Textarea
          label={`${t('quotation.cancelReasonLabel')} ${t('quotation.cancelReasonOptional')}`}
          rows={3}
          maxLength={500}
          showCharCount
          value={cancelReason}
          onChange={e => setCancelReason(e.target.value)}
          placeholder={t('quotation.cancelReasonPlaceholder')}
          className="min-h-20! resize-none!"
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={closeCancelModal} disabled={isCancelling}>
            {t('quotation.goBack')}
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirmCancelQuotation}
            isLoading={isCancelling}
            leftIcon={<Icon name="ban" style="solid" />}
          >
            {isCancelling ? t('quotation.cancelling') : t('quotation.cancelQuotation')}
          </Button>
        </div>
      </div>
    </Modal>
  );

  // ── Sent — countdown + company status ────────────────────────────────────
  if (status === 'Sent') {
    const cutOffTimeDate = new Date(activeQuotation.cutOffTime);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((cutOffTimeDate.getTime() - now.getTime()) / 36e5));
    const sentCompanyQuotations = quotationDetail?.companyQuotations ?? [];

    const invitedCompanies = sortCompanyResponses(quotationDetail?.invitedCompanies ?? [], inv => {
      const cq = sentCompanyQuotations.find(q => q.companyId === inv.companyId);
      return {
        status: cq?.status ?? 'Pending',
        totalNetAmount: cq?.totalQuotedPrice,
        companyName: inv.companyName,
      };
    });

    // Under 48h the strip turns amber, under 24h red; the countdown text only shows under 48h.
    const stripTone =
      hoursLeft < 24
        ? 'border-(--palette-req-line) bg-(--palette-req-wash) text-red-800 dark:text-red-300'
        : hoursLeft < 48
          ? 'border-amber-200 dark:border-amber-500/30 bg-(--palette-warn-wash) text-amber-800 dark:text-amber-300'
          : 'border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 text-blue-800 dark:text-blue-300';

    return (
      <>
        {renderFrame(
          <>
            <div
              className={clsx(
                'flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg border px-3 py-2 text-xs',
                stripTone,
              )}
            >
              <span>
                {t('quotation.closes')}{' '}
                <span className="text-sm font-semibold">
                  {formatDateTime(activeQuotation.cutOffTime)}
                </span>
              </span>
              {hoursLeft < 48 && (
                <span className="text-sm font-semibold">
                  {t('quotation.hoursRemaining', { n: hoursLeft })}
                </span>
              )}
            </div>

            <StatStrip>
              <Stat
                label={
                  <>
                    {t('quotation.stats.companiesInvited')}
                    <InvitedCompaniesPopover
                      companies={quotationDetail?.invitedCompanies ?? []}
                      totalInvited={activeQuotation.totalCompaniesInvited}
                    />
                  </>
                }
              >
                {activeQuotation.totalCompaniesInvited}
              </Stat>
              <Stat label={t('quotation.stats.responses')}>
                {activeQuotation.totalQuotationsReceived} / {activeQuotation.totalCompaniesInvited}
              </Stat>
              <Stat
                label={
                  <>
                    {t('quotation.stats.appraisals')}
                    <AppraisalsPopover
                      appraisals={quotationDetail?.appraisals ?? []}
                      totalAppraisals={activeQuotation.totalAppraisals}
                    />
                  </>
                }
              >
                {activeQuotation.totalAppraisals}
              </Stat>
            </StatStrip>

            {invitedCompanies.length > 0 && (
              <ResponsesTable
                invitedCompanies={invitedCompanies}
                companyQuotations={sentCompanyQuotations}
              />
            )}

            {renderCancelRow()}
          </>,
        )}
        {cancelModal}
      </>
    );
  }

  // ── Draft — hint + Send Quotation button ─────────────────────────────────
  if (status === 'Draft') {
    const draftDetail = quotationDetail;
    const appraisalCount = draftDetail?.totalAppraisals ?? activeQuotation.totalAppraisals ?? 0;
    const companyCount =
      draftDetail?.totalCompaniesInvited ?? activeQuotation.totalCompaniesInvited ?? 0;
    const hasDueDate = !!activeQuotation.cutOffTime;
    // Segment Coverage: every invited company must be able to appraise every banking segment in
    // the quotation's Segment Set, otherwise the API refuses to send it.
    const segmentGaps = getSegmentGaps(draftDetail?.invitedCompanies);
    // Not sendable until the detail has loaded: without it the gaps are unknown.
    const canSend =
      !!draftDetail &&
      appraisalCount >= 1 &&
      companyCount >= 1 &&
      hasDueDate &&
      segmentGaps.length === 0;
    // Why Send is disabled (null when sendable), used as the button tooltip.
    const sendBlockedReason = canSend
      ? null
      : !draftDetail
        ? isDetailError
          ? t('quotation.loadDetailFailed')
          : null
        : segmentGaps.length > 0
          ? t('quotation:segment.sendBlockedTitle')
          : t('quotation.sendRequirementsHint');
    const draftAppraisals = draftDetail?.appraisals ?? [];

    /** Step 1 (share docs) → Step 2 (email). Requires full doc coverage. */
    const handleShareDocsNext = () => {
      if (!allAppraisalsCovered) return;
      setSendStep('confirm');
    };

    /** Cancel the whole send flow — clear step and stale tick selections */
    const handleCancelSendFlow = () => {
      setSendStep(null);
      setShareSelections({});
    };

    /**
     * Every appraisal with uploaded docs must have at least 1 selection.
     * Appraisals whose request has no documents at all are skipped — there's
     * nothing to pick. The backend mirrors this rule in SendQuotationCommandHandler.
     */
    const allAppraisalsCovered = draftAppraisals.every(
      ap =>
        noDocsAppraisalIds.has(ap.appraisalId) ||
        Object.keys(shareSelections[ap.appraisalId] ?? {}).length >= 1,
    );

    /** Step 2 (email) submit → final send: PUT shared-docs then POST send */
    const handleFinalSend = (values: EmailFormValues) => {
      if (!allAppraisalsCovered) return;
      const selections: SharedDocumentSelectionDto[] = draftAppraisals.flatMap(ap =>
        Object.entries(shareSelections[ap.appraisalId] ?? {}).map(([documentId, { level }]) => ({
          appraisalId: ap.appraisalId,
          documentId,
          level,
        })),
      );
      setSharedDocuments(selections, {
        onSuccess: () => {
          sendQuotation(
            {
              from: values.from,
              to: values.to,
              cc: values.cc,
              bcc: values.bcc,
              subject: values.subject,
              content: values.content,
              attachments: values.attachments,
            },
            {
              onSuccess: () => {
                toast.success(t('quotation.toasts.quotationSent'));
                setSendStep(null);
                setShareSelections({});
              },
              onError: (err: unknown) => {
                const apiErr = err as { apiError?: { detail?: string } };
                if (isSegmentCoverageMismatch(err)) {
                  // Localized text instead of the API's English detail. useSendQuotation refetches
                  // the detail; leave the flow so the user lands on the refreshed segment alert
                  // (shared-doc picks are kept for the next attempt).
                  toast.error(t('quotation:segment.sendBlockedTitle'));
                  setSendStep(null);
                } else {
                  toast.error(
                    apiErr?.apiError?.detail ?? t('quotation.toasts.quotationSendFailed'),
                  );
                }
              },
            },
          );
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? t('quotation.toasts.docSelectionFailed'));
        },
      });
    };

    // ── Edit draft helpers ──────────────────────────────────────────────────

    /** Enter edit mode: seed local state from the current draft values. */
    const handleEnterEdit = () => {
      const initialIds = new Set((draftDetail?.invitedCompanies ?? []).map(c => c.companyId));
      const initialNames: Record<string, string> = {};
      (draftDetail?.invitedCompanies ?? []).forEach(c => {
        initialNames[c.companyId] = localizeCompanyName(c.companyName, c.companyNameLocal);
      });
      setEditCompanyIds(initialIds);
      setEditCompanyNames(initialNames);
      setEditDueDate(activeQuotation.cutOffTime ?? null);
      setEditSearchQuery('');
      const thisAppraisal = (draftDetail?.appraisals ?? []).find(
        ap => ap.appraisalId === appraisalId,
      );
      setEditMaxAppraisalDays(thisAppraisal?.maxAppraisalDays ?? null);
      setEditSpecialRequirements(draftDetail?.specialRequirements ?? '');
      setIsEditing(true);
    };

    /** Cancel edit: restore read-only view. */
    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditCompanyIds(new Set());
      setEditCompanyNames({});
      setEditDueDate(null);
      setEditSearchQuery('');
      setEditMaxAppraisalDays(null);
      setEditSpecialRequirements('');
    };

    /** Save the edit. */
    const handleSaveEdit = () => {
      if (!editDueDate) {
        toast.error(t('quotation.editDraft.cutOffTimeRequired'));
        return;
      }
      editDraftQuotation(
        {
          cutOffTime: editDueDate,
          companyIds: Array.from(editCompanyIds),
          // Only this appraisal's max-days is edited here; backend leaves other items untouched.
          appraisals: [{ appraisalId, maxAppraisalDays: editMaxAppraisalDays ?? null }],
          specialRequirements: editSpecialRequirements.trim() || null,
        },
        {
          onSuccess: () => {
            toast.success(t('quotation.toasts.draftUpdated'));
            setIsEditing(false);
          },
          onError: (err: unknown) => {
            const detail = (err as { apiError?: { detail?: string | null } })?.apiError?.detail;
            toast.error(detail || t('quotation.toasts.draftUpdateFailed'));
          },
        },
      );
    };

    const isBusy = isSending || isSettingDocs;

    // Owner-only guard: gate Edit button on requestedBy if available, else show for all Draft.
    const canEdit =
      !currentUser || !draftDetail?.requestedBy || currentUser.username === draftDetail.requestedBy;

    return (
      <>
        {renderFrame(
          <>
            {isEditing ? (
              <EditDraftForm
                segmentSet={draftDetail?.bankingSegment ?? EMPTY_SEGMENT_SET}
                invitedCompanies={draftDetail?.invitedCompanies ?? EMPTY_INVITED}
                editDueDate={editDueDate}
                onDueDateChange={setEditDueDate}
                editCompanyIds={editCompanyIds}
                editCompanyNames={editCompanyNames}
                onEditCompanyIdsChange={setEditCompanyIds}
                onEditCompanyNamesChange={setEditCompanyNames}
                editSearchQuery={editSearchQuery}
                onEditSearchQueryChange={setEditSearchQuery}
                editMaxAppraisalDays={editMaxAppraisalDays}
                onEditMaxAppraisalDaysChange={setEditMaxAppraisalDays}
                editSpecialRequirements={editSpecialRequirements}
                onEditSpecialRequirementsChange={setEditSpecialRequirements}
              />
            ) : (
              <>
                <p className="text-xs text-(--palette-gray-500)">{t('quotation.draftHint')}</p>

                <StatStrip>
                  <Stat
                    warn={appraisalCount === 0}
                    label={
                      <>
                        {t('quotation.stats.appraisals')}
                        <AppraisalsPopover
                          appraisals={draftAppraisals}
                          totalAppraisals={appraisalCount}
                        />
                      </>
                    }
                  >
                    {appraisalCount}
                  </Stat>
                  <Stat
                    warn={companyCount === 0}
                    label={
                      <>
                        {t('quotation.stats.companiesInvited')}
                        <InvitedCompaniesPopover
                          companies={draftDetail?.invitedCompanies ?? []}
                          totalInvited={companyCount}
                          showSegmentGaps
                        />
                      </>
                    }
                  >
                    {companyCount}
                  </Stat>
                  <Stat warn={!hasDueDate} label={t('quotation.stats.cutOffTime')}>
                    {hasDueDate
                      ? formatDateTime(activeQuotation.cutOffTime)
                      : t('quotation.notSet')}
                  </Stat>
                </StatStrip>

                {(draftDetail?.bankingSegment?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-1 text-xs text-(--palette-gray-500)">
                      {t('quotation:segment.segmentSet')}
                    </div>
                    <SegmentChips segments={draftDetail?.bankingSegment} />
                  </div>
                )}

                {/* Segment Coverage warning — only for users who can fix it, i.e. when the Edit
                    button shows (not read-only, owner of the draft), and not under the inline edit
                    form, which flags gaps per company itself. */}
                {!readOnly && canEdit && (
                  <SegmentGapsAlert
                    gaps={segmentGaps}
                    className="rounded-lg border border-amber-200 dark:border-amber-500/30 px-3 py-2 text-xs"
                  />
                )}

                {/* Request Details — Special Requirements (request-wide). Per-appraisal
                    Max Appraisal Duration lives in the Appraisals ⓘ popover above. */}
                <div>
                  <div className="text-xs text-(--palette-gray-500)">
                    {t('quotation.specialRequirements')}
                  </div>
                  <div className="whitespace-pre-wrap text-sm text-(--palette-ink)">
                    {draftDetail?.specialRequirements?.trim() || t('quotation.notSet')}
                  </div>
                </div>
              </>
            )}

            {!readOnly && (
              <div className={isEditing ? 'flex flex-wrap items-center gap-2' : ACTION_ROW}>
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      isLoading={isEditSaving}
                      disabled={!editDueDate}
                      leftIcon={<Icon name="floppy-disk" style="solid" />}
                    >
                      {isEditSaving ? t('quotation.saving') : t('quotation.save')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                      disabled={isEditSaving}
                    >
                      {t('quotation.cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setSendStep('share-docs')}
                      disabled={!canSend || isBusy}
                      title={sendBlockedReason ?? undefined}
                      leftIcon={<Icon name="paper-plane" style="solid" />}
                    >
                      {t('quotation.sendQuotation')}
                    </Button>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEnterEdit}
                        disabled={isBusy}
                        leftIcon={<Icon name="pencil" style="solid" />}
                      >
                        {t('quotation.edit')}
                      </Button>
                    )}
                    {/* Remove this appraisal from the draft quotation */}
                    <button
                      type="button"
                      onClick={() => setShowRemoveConfirm(true)}
                      disabled={isBusy || isRemoving}
                      className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-danger hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Icon name="trash" style="solid" />
                      {t('quotation.removeFromQuotation')}
                    </button>
                  </>
                )}
              </div>
            )}
          </>,
          isEditing ? t('quotation:draft.editModal') : undefined,
        )}

        <ConfirmDialog
          isOpen={showRemoveConfirm}
          onClose={() => setShowRemoveConfirm(false)}
          onConfirm={handleRemoveAppraisal}
          title={t('quotation.removeConfirmTitle')}
          message={t('quotation.removeConfirmMessage', {
            quotationNumber: activeQuotation.quotationNumber,
          })}
          confirmText={t('quotation.removeConfirm')}
          variant="danger"
          isLoading={isRemoving}
        />

        {/* ── Step 2: Email composition (final step — Send performs the actual send) ── */}
        <EmailCompositionModal
          isOpen={sendStep === 'confirm'}
          onClose={handleCancelSendFlow}
          title={t('quotation.emailModal.title')}
          defaultValues={defaultEmailValues}
          showFrom={false}
          showCc={true}
          showBcc={true}
          showAttachments={true}
          attachmentPicker={{ quotationId: activeQuotation?.id ?? '' }}
          requireAttachment={(quotationDetail?.appraisals?.length ?? 0) > TABLE_ROW_THRESHOLD}
          subjectLabel={t('quotation:email.subjectLabel')}
          labels={{
            from: t('quotation:email.from'),
            send: t('quotation:email.send'),
            cancel: t('quotation:email.cancel'),
            to: t('quotation:email.to'),
            cc: t('quotation:email.cc'),
            bcc: t('quotation:email.bcc'),
            content: t('quotation:email.content'),
            attachments: t('quotation:email.attachments'),
            addAttachment: t('quotation:email.addAttachment'),
            attachmentPlaceholder: t('quotation:email.attachmentPlaceholder'),
          }}
          isPending={isBusy}
          richTextContent
          onSubmit={handleFinalSend}
        />

        {/* ── Step 1: Share documents ── */}
        <Modal
          isOpen={sendStep === 'share-docs'}
          // Esc / backdrop behave like the Cancel button (drops the picks); never mid-send.
          onClose={() => {
            if (!isBusy) handleCancelSendFlow();
          }}
          title={t('quotation.shareDocuments.title')}
          size="md"
        >
          <div className="flex flex-col gap-3">
            <p className="text-xs text-(--palette-gray-500)">
              {t('quotation.shareDocuments.step')}
            </p>

            <ShareDocumentsStep
              appraisals={draftAppraisals}
              selections={shareSelections}
              onToggle={handleDocToggle}
              noDocsAppraisalIds={noDocsAppraisalIds}
              onReportNoDocs={handleReportNoDocs}
            />

            {!allAppraisalsCovered && draftAppraisals.length > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg border border-amber-100 dark:border-amber-500/20 bg-(--palette-warn-wash) p-2">
                <Icon
                  name="triangle-exclamation"
                  style="solid"
                  className="shrink-0 text-amber-500"
                />
                <p className="text-xs text-(--palette-warn)">
                  {t('quotation.shareDocuments.coverageWarning')}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCancelSendFlow}
                disabled={isBusy}
              >
                {t('quotation.cancel')}
              </Button>
              <Button
                size="sm"
                type="button"
                onClick={handleShareDocsNext}
                disabled={isBusy || !allAppraisalsCovered}
                title={
                  !allAppraisalsCovered ? t('quotation.shareDocuments.coverageTitle') : undefined
                }
                rightIcon={<Icon name="arrow-right" style="solid" />}
              >
                {t('quotation.next')}
              </Button>
            </div>
          </div>
        </Modal>
      </>
    );
  }

  // ── UnderAdminReview — shortlist panel ───────────────────────────────────
  if (status === 'UnderAdminReview') {
    return (
      <>
        {renderFrame(
          <>
            <AdminShortlistPanel
              quotationId={activeQuotation.id}
              companyQuotations={quotationDetail?.companyQuotations ?? []}
              appraisals={quotationDetail?.appraisals ?? []}
            />
            {renderCancelRow()}
          </>,
        )}
        {cancelModal}
      </>
    );
  }

  // ── PendingRmSelection — shortlist sent panel ─────────────────────────────
  if (status === 'PendingRmSelection') {
    if (!quotationDetail) return renderDetailMissing();
    return (
      <>
        {renderFrame(
          <>
            <ShortlistSentPanel quotation={quotationDetail} />
            {renderCancelRow()}
          </>,
        )}
        {cancelModal}
      </>
    );
  }

  // ── WinnerTentative — shortlist table + Reject/Finalize actions ─────────────
  if (status === 'WinnerTentative') {
    if (!quotationDetail) return renderDetailMissing();
    const winner = quotationDetail.companyQuotations?.find(
      cq => cq.id === quotationDetail.tentativeWinnerQuotationId,
    );
    const roundsUsed = winner?.negotiationRounds ?? 0;
    const maxRoundsReached = roundsUsed >= MAX_NEGOTIATION_ROUNDS;
    return (
      <>
        {renderFrame(
          <>
            <ShortlistSentPanel quotation={quotationDetail} />
            {winner && !readOnly && (
              <div className={ACTION_ROW}>
                <Button
                  size="sm"
                  onClick={openFinalize}
                  leftIcon={<Icon name="flag-checkered" style="solid" />}
                >
                  {t('quotation.finalize')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNegotiate}
                  disabled={maxRoundsReached}
                  title={maxRoundsReached ? t('quotation.maximumNegotiationRounds') : undefined}
                  leftIcon={<Icon name="handshake" style="solid" className="text-orange-500" />}
                >
                  {t('quotation.openNegotiation')}
                </Button>
                <span className="text-xs text-(--palette-gray-500)">
                  {t('quotation:negotiation.roundsCount', {
                    used: roundsUsed,
                    max: MAX_NEGOTIATION_ROUNDS,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReject}
                  className="ml-auto text-danger! border-red-300! hover:bg-(--palette-req-wash)!"
                  leftIcon={<Icon name="xmark" style="solid" />}
                >
                  {t('quotation.rejectWinner')}
                </Button>
              </div>
            )}
            {!readOnly && <div className="flex justify-end">{cancelLink}</div>}
          </>,
        )}
        {cancelModal}
        {winner && (
          <>
            <RejectTentativeModal
              isOpen={isRejectOpen}
              onClose={closeReject}
              quotationId={quotationDetail.id}
              companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
            />
            <FinalizeModal
              isOpen={isFinalizeOpen}
              onClose={closeFinalize}
              quotationId={quotationDetail.id}
              companyQuotationId={winner.id}
              companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
              winnerItems={winner.items ?? []}
              appraisals={quotationDetail.appraisals ?? []}
              allowAutoAssign={allowAutoAssign && isStandaloneQuotation(quotationDetail)}
            />
            <NegotiationModal
              isOpen={isNegotiateOpen}
              onClose={closeNegotiate}
              quotationId={quotationDetail.id}
              companyQuotationId={winner.id}
              companyName={localizeCompanyName(winner.companyName, winner.companyNameLocal)}
              currentRounds={winner.negotiationRounds ?? 0}
            />
          </>
        )}
      </>
    );
  }

  // ── Negotiating ───────────────────────────────────────────────────────────
  if (status === 'Negotiating') {
    if (!quotationDetail) return renderDetailMissing();
    return (
      <>
        {renderFrame(
          <>
            <NegotiationPanel quotation={quotationDetail} allowAutoAssign={allowAutoAssign} />
            {renderCancelRow()}
          </>,
        )}
        {cancelModal}
      </>
    );
  }

  // ── Finalized ─────────────────────────────────────────────────────────────
  if (status === 'Finalized') {
    const winner = quotationDetail?.companyQuotations?.find(
      cq => cq.id === quotationDetail.tentativeWinnerQuotationId,
    );
    // Per-appraisal slice — section is always scoped to one appraisalId. Mirror the
    // backend's CompanyQuotation.RecalculateTotalPrice rule: NetAmount when feeAmount
    // > 0, else legacy quotedPrice.
    const appraisalItem = winner?.items.find(i => i.appraisalId === appraisalId);
    let finalPrice: number | null = null;
    if (appraisalItem) {
      if (appraisalItem.feeAmount > 0) {
        const feeAfterDiscount =
          appraisalItem.feeAmount -
          appraisalItem.discount -
          (appraisalItem.negotiatedDiscount ?? 0);
        const vatAmount =
          Math.round(((feeAfterDiscount * appraisalItem.vatPercent) / 100) * 100) / 100;
        finalPrice = feeAfterDiscount + vatAmount;
      } else {
        finalPrice = appraisalItem.quotedPrice;
      }
    }
    // A newer quotation was cancelled after this one was finalized: this winner stays usable, and
    // the way to quote again is offered on a compact line under it.
    const newest = newestQuotation(quotations);
    const newerCancelled =
      newest && newest.id !== activeQuotation.id && newest.status === 'Cancelled' ? newest : null;
    return renderFrame(
      <>
        <div className="rounded-lg border border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-500/10 px-3 py-2 text-sm text-green-800 dark:text-green-300">
          <p className="font-semibold">
            {t('quotation.finalizedWith', {
              company: winner
                ? localizeCompanyName(winner.companyName, winner.companyNameLocal)
                : '—',
            })}
          </p>
          {finalPrice != null && (
            <p className="mt-1">
              {t('quotation.finalPrice')}{' '}
              <strong className="text-base tabular-nums">{formatCurrency(finalPrice)}</strong>
            </p>
          )}
          <p className="mt-1 text-xs text-green-700 dark:text-green-300">
            {t('quotation.finalizedHint')}
          </p>
        </div>
        {newerCancelled && (
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-xs text-(--palette-gray-500)">
            <span>
              {t('quotation:section.latestCancelled', { number: newerCancelled.quotationNumber })}
            </span>
            {!readOnly && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCreateNew}
                leftIcon={<Icon name="file-circle-plus" style="solid" />}
              >
                {t('quotation.newQuotation')}
              </Button>
            )}
          </div>
        )}
      </>,
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (status === 'Cancelled') {
    return renderFrame(
      <>
        <div className="rounded-lg border border-(--palette-req-line) bg-(--palette-req-wash) px-3 py-2 text-sm text-red-800 dark:text-red-300">
          <p>{t('quotation.cancelledHint')}</p>
          {quotationDetail?.cancellationReason && (
            <p className="mt-1 text-xs">
              {t('quotation:shared.cancelledWith')} {quotationDetail.cancellationReason}
            </p>
          )}
        </div>
        {!readOnly && (
          <div>
            <Button
              size="sm"
              onClick={onCreateNew}
              leftIcon={<Icon name="file-circle-plus" style="solid" />}
            >
              {t('quotation.newQuotation')}
            </Button>
          </div>
        )}
      </>,
    );
  }

  // ── Fallback: status this section does not know ───────────────────────────
  return renderFrame(
    readOnly ? (
      // Nothing to act on: say what the quotation's status is rather than draw an empty body.
      <p className="text-sm text-(--palette-gray-500)">{status || t('administration.noData')}</p>
    ) : (
      <div>
        <Button
          size="sm"
          onClick={onCreateNew}
          leftIcon={<Icon name="file-circle-plus" style="solid" />}
        >
          {t('quotation.newQuotation')}
        </Button>
      </div>
    ),
  );
};

export default QuotationSection;

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
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
import type { AppraisalSummaryDto, SharedDocumentSelectionDto } from '@/features/quotation/schemas/quotation';
import QuotationStatusBadge from '@/features/quotation/components/QuotationStatusBadge';
import AdminShortlistPanel from '@/features/quotation/components/AdminShortlistPanel';
import ShortlistSentPanel from '@/features/quotation/components/ShortlistSentPanel';
import NegotiationPanel from '@/features/quotation/components/NegotiationPanel';
import RejectTentativeModal from '@/features/quotation/components/RejectTentativeModal';
import FinalizeModal from '@/features/quotation/components/FinalizeModal';
import NegotiationModal from '@/features/quotation/components/NegotiationModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import InvitedCompaniesPopover from '@/features/quotation/components/InvitedCompaniesPopover';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import Modal from '@/shared/components/Modal';
import { useAuthStore } from '@/features/auth/store';

// ─── ShareDocumentsStep ───────────────────────────────────────────────────────

/**
 * State: outer key = appraisalId, inner key = documentId,
 * value = { level: 'RequestLevel' | 'TitleLevel' }
 */
type ShareSelections = Record<string, Record<string, { level: SharedDocumentSelectionDto['level'] }>>;

interface ShareDocumentsStepProps {
  appraisals: AppraisalSummaryDto[];
  selections: ShareSelections;
  onToggle: (appraisalId: string, documentId: string, level: SharedDocumentSelectionDto['level'], checked: boolean) => void;
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
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const appraisal = appraisals[activeTabIdx];

  if (appraisals.length === 0) {
    return <p className="text-sm text-gray-500 py-4 text-center">No appraisals to share documents for.</p>;
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto shrink-0">
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
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
              )}
            >
              {hasNoDocs ? (
                <Icon name="circle-minus" style="solid" className="size-3 text-gray-300" />
              ) : covered ? (
                <Icon name="circle-check" style="solid" className="size-3 text-green-500" />
              ) : (
                <Icon name="triangle-exclamation" style="solid" className="size-3 text-amber-400" />
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
  onToggle: (appraisalId: string, documentId: string, level: SharedDocumentSelectionDto['level'], checked: boolean) => void;
  onReportNoDocs: (appraisalId: string, noDocs: boolean) => void;
}

const AppraisalDocTab = ({ appraisal, apSelection, onToggle, onReportNoDocs }: AppraisalDocTabProps) => {
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
      <div className="flex items-center gap-2 py-6 px-3 text-xs text-gray-400">
        <Icon name="spinner" style="solid" className="size-3.5 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (!appraisal.requestId) {
    return (
      <div className="px-3 py-4 text-xs text-amber-600 flex items-center gap-1.5">
        <Icon name="triangle-exclamation" style="solid" className="size-3.5 shrink-0" />
        No request linked to this appraisal. Documents cannot be loaded.
      </div>
    );
  }

  if (!hasAnyUploadedDocs) {
    return (
      <div className="px-3 py-4 text-xs text-gray-400">
        No uploaded documents found for this request.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-0 divide-y divide-gray-100 max-h-[320px] overflow-y-auto">
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
              <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                {section.sectionLabel}
              </span>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={e => handleSelectAll(e.target.checked)}
                  className="size-3 accent-primary rounded"
                />
                <span className="text-[10px] text-gray-500">Select all</span>
              </label>
            </div>
            <div className="flex flex-col gap-1">
              {uploadedDocs.map(doc => (
                <label key={doc.documentId} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!apSelection[doc.documentId!]}
                    onChange={e => onToggle(appraisal.appraisalId, doc.documentId!, level, e.target.checked)}
                    className="size-3.5 accent-primary rounded shrink-0"
                  />
                  <span className="text-xs text-gray-800 truncate group-hover:text-primary">
                    {doc.fileName ?? doc.documentId}
                    {doc.documentTypeName && (
                      <span className="text-gray-400"> ({doc.documentTypeName})</span>
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

interface EditDraftFormProps {
  bankingSegment: string | undefined;
  appraisalCount: number;
  editDueDate: string | null;
  onDueDateChange: (v: string | null) => void;
  editCompanyIds: Set<string>;
  editCompanyNames: Record<string, string>;
  onEditCompanyIdsChange: (ids: Set<string>) => void;
  onEditCompanyNamesChange: (names: Record<string, string>) => void;
  editSearchQuery: string;
  onEditSearchQueryChange: (q: string) => void;
}

const EditDraftForm = ({
  bankingSegment,
  appraisalCount,
  editDueDate,
  onDueDateChange,
  editCompanyIds,
  editCompanyNames,
  onEditCompanyIdsChange,
  onEditCompanyNamesChange,
  editSearchQuery,
  onEditSearchQueryChange,
}: EditDraftFormProps) => {
  const { data: rawCompanies, isLoading: isLoadingCompanies } = useGetEligibleCompanies(
    bankingSegment,
    true,
  );

  const allCompanies = useMemo(
    () => (rawCompanies ?? []).map(c => ({ id: c.id, companyName: c.companyName })),
    [rawCompanies],
  );

  const filteredCompanies = useMemo(() => {
    const q = editSearchQuery.toLowerCase().trim();
    return q ? allCompanies.filter(c => c.companyName.toLowerCase().includes(q)) : allCompanies;
  }, [allCompanies, editSearchQuery]);

  const handleToggleCompany = (company: { id: string; companyName: string }) => {
    const next = new Set(editCompanyIds);
    if (next.has(company.id)) {
      next.delete(company.id);
      const nextNames = { ...editCompanyNames };
      delete nextNames[company.id];
      onEditCompanyNamesChange(nextNames);
    } else {
      next.add(company.id);
      onEditCompanyNamesChange({ ...editCompanyNames, [company.id]: company.companyName });
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
    <div className="px-4 py-3 flex flex-col gap-4 text-sm text-gray-600">
      {/* Read-only appraisals count */}
      <div className="grid grid-cols-1 gap-1">
        <div className="text-xs text-gray-500">Appraisals</div>
        <div className="font-medium text-gray-400 text-xs italic">
          {appraisalCount} (use Add / Remove to change appraisals)
        </div>
      </div>

      {/* Companies Invited — editable multiselect */}
      <div className="flex flex-col gap-2">
        <div className="text-xs font-medium text-gray-700">
          Companies Invited
          {bankingSegment && (
            <span className="ml-1.5 text-purple-600 font-normal">
              (eligible for <strong>{bankingSegment}</strong>)
            </span>
          )}
        </div>

        {/* Selected company chips */}
        {editCompanyIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(editCompanyIds).map(id => (
              <div
                key={id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
              >
                <Icon name="building" style="solid" className="size-3" />
                <span className="font-medium">{editCompanyNames[id] ?? id.slice(0, 8)}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveChip(id)}
                  className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                >
                  <Icon name="xmark" style="solid" className="size-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Company list picker */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Icon
                name="magnifying-glass"
                style="regular"
                className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search company name..."
                value={editSearchQuery}
                onChange={e => onEditSearchQueryChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border-0 focus:ring-0 outline-none"
              />
            </div>
          </div>
          <div className="max-h-36 overflow-y-auto">
            {isLoadingCompanies ? (
              <div className="px-4 py-4 text-center text-gray-500">
                <Icon name="spinner" style="solid" className="size-3.5 animate-spin mx-auto mb-1" />
                <span className="text-xs">Loading...</span>
              </div>
            ) : filteredCompanies.length === 0 ? (
              <div className="px-4 py-4 text-center text-gray-500 text-xs">
                {bankingSegment ? 'No eligible companies for this segment' : 'No companies found'}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredCompanies.map(company => {
                  const isSelected = editCompanyIds.has(company.id);
                  return (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => handleToggleCompany(company)}
                      className={clsx(
                        'w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors',
                        isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50',
                      )}
                    >
                      <div
                        className={clsx(
                          'size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                          isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white',
                        )}
                      >
                        {isSelected && (
                          <Icon name="check" style="solid" className="size-2.5 text-white" />
                        )}
                      </div>
                      <div className="size-6 rounded bg-purple-100 flex items-center justify-center shrink-0">
                        <Icon name="building" style="solid" className="size-3 text-purple-600" />
                      </div>
                      <span className="flex-1 truncate text-gray-900">{company.companyName}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Due Date — editable */}
      <div>
        <DateTimePickerInput
          label="Due Date"
          required
          placeholder="dd/mm/yyyy hh:mm"
          value={editDueDate}
          onChange={onDueDateChange}
          disablePastDates
        />
      </div>
    </div>
  );
};

// ─── QuotationSection ─────────────────────────────────────────────────────────

interface QuotationSectionProps {
  appraisalId: string;
  onCreateNew: () => void;
  /** @deprecated The "add to existing" flow is not used in the IBG quotation model. */
  onAddToExisting?: () => void;
}

type SendStep = 'confirm' | 'share-docs';

const QuotationSection = ({ appraisalId, onCreateNew }: QuotationSectionProps) => {
  const { i18n } = useTranslation();
  const currentUser = useAuthStore(s => s.user);
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
  /** Cancel-Quotation confirmation modal — only shown for non-Draft, non-terminal statuses.
      Draft uses the per-appraisal "Remove" button (which auto-cancels on last removal);
      Finalized/Cancelled are terminal so cancel is hidden there. */
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  /** Set of appraisalIds whose request has no uploadable documents — skipped in coverage. */
  const [noDocsAppraisalIds, setNoDocsAppraisalIds] = useState<Set<string>>(new Set());
  const { isOpen: isRejectOpen, onOpen: openReject, onClose: closeReject } = useDisclosure();
  const { isOpen: isFinalizeOpen, onOpen: openFinalize, onClose: closeFinalize } = useDisclosure();
  const { isOpen: isNegotiateOpen, onOpen: openNegotiate, onClose: closeNegotiate } = useDisclosure();

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
  const { data: quotations = [], isLoading: isLoadingList } = useGetAppraisalQuotations(
    appraisalId,
  );

  // If there's an active quotation, fetch its detail (with company submissions)
  const activeQuotation = quotations[0] ?? null;
  const { data: quotationDetail, isLoading: isLoadingDetail } = useGetQuotationById(
    activeQuotation?.id ?? null,
  );
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
      toast.error(
        `Quotation is no longer cancellable (current status: ${currentStatus ?? 'unknown'}).`,
      );
      setShowCancelConfirm(false);
      setCancelReason('');
      return;
    }
    cancelQuotation(
      { reason: cancelReason.trim() || null },
      {
        onSuccess: () => {
          toast.success('Quotation cancelled');
          setShowCancelConfirm(false);
          setCancelReason('');
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to cancel quotation');
        },
      },
    );
  };

  const handleRemoveAppraisal = () => {
    removeAppraisal(appraisalId, {
      onSuccess: () => {
        toast.success('Removed from quotation');
        setShowRemoveConfirm(false);
      },
      onError: (err: unknown) => {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(apiErr?.apiError?.detail ?? 'Failed to remove');
      },
    });
  };

  const isLoading = isLoadingList || (!!activeQuotation && isLoadingDetail);

  const formatDateTime = (dateString: string) => {
    const d = new Date(dateString);
    // Thai locale → Buddhist calendar ("25 เม.ย. 2569 00:00"); otherwise dd/MM/yyyy HH:mm.
    if (i18n.language?.startsWith('th')) {
      return d.toLocaleString('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-8 text-center">
          <Icon name="spinner" style="solid" className="size-5 animate-spin text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Loading quotation...</p>
        </div>
      </div>
    );
  }

  // ── No quotation yet ──────────────────────────────────────────────────────
  if (!activeQuotation) {
    return (
      <div className="bg-white rounded-xl border border-dashed border-purple-300 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="size-12 rounded-xl bg-purple-100 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="size-6 text-purple-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">No quotation request yet</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Start a quotation to invite external companies to bid
            </p>
          </div>
          <Button onClick={onCreateNew} size="sm">
            <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
            Request Quotation
          </Button>
        </div>
      </div>
    );
  }

  const status = (quotationDetail?.status ?? activeQuotation.status) as QuotationStatus | string;

  /** Cancel Quotation footer + modal — rendered in every non-terminal, non-Draft branch.
      Draft auto-cancels via last-appraisal-removal so it gets the Remove button instead;
      Finalized/Cancelled are terminal so the action is hidden. */
  const closeCancelModal = () => {
    setShowCancelConfirm(false);
    setCancelReason('');
  };
  const renderCancelFooter = () => (
    <>
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={() => setShowCancelConfirm(true)}
          disabled={isCancelling}
          className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon name="ban" style="solid" className="size-3" />
          Cancel Quotation
        </button>
      </div>
      <Modal
        isOpen={showCancelConfirm}
        onClose={closeCancelModal}
        title="Cancel Quotation"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
            <Icon name="triangle-exclamation" style="solid" className="size-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">
              This will cancel quotation{' '}
              <strong>{activeQuotation.quotationNumber}</strong>. All invited companies will be
              notified and the workflow task will be cancelled. This action cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">
              Reason <span className="text-gray-400">(optional)</span>
            </label>
            <textarea
              rows={3}
              maxLength={500}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Why is this quotation being cancelled?"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none"
            />
            <p className="mt-1 text-[11px] text-gray-400 text-right">{cancelReason.length}/500</p>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={closeCancelModal} disabled={isCancelling}>
              Go Back
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancelQuotation}
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Icon name="spinner" style="solid" className="size-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                <>
                  <Icon name="ban" style="solid" className="size-4 mr-2" />
                  Cancel Quotation
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );

  // ── Sent — countdown + company status ────────────────────────────────────
  if (status === 'Sent') {
    const dueDate = new Date(activeQuotation.dueDate);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / 36e5));
    const sentCompanyQuotations = quotationDetail?.companyQuotations ?? [];

    const fmtCurrency = (v?: number | null) =>
      v != null ? new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(v) : '—';

    const fmtDt = (iso: string | null | undefined) => {
      if (!iso) return '—';
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      const p = (n: number) => String(n).padStart(2, '0');
      return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
    };

    const invitedCompanies = quotationDetail?.invitedCompanies ?? [];

    return (
      <div className="flex flex-col gap-2">
      <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
              <Icon name="clock" style="solid" className="size-4 text-purple-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Closes</div>
            <div className={clsx('text-sm font-medium', hoursLeft < 24 ? 'text-red-600' : 'text-gray-800')}>
              {formatDateTime(activeQuotation.dueDate)}
            </div>
            {hoursLeft < 48 && (
              <div className="text-xs text-amber-600">{hoursLeft}h remaining</div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="px-4 py-3 text-sm text-gray-600 border-b border-gray-100">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                Companies Invited
                <InvitedCompaniesPopover
                  companies={quotationDetail?.invitedCompanies ?? []}
                  totalInvited={activeQuotation.totalCompaniesInvited}
                />
              </div>
              <div className="font-medium text-gray-900">{activeQuotation.totalCompaniesInvited}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Responses</div>
              <div className="font-medium text-gray-900">
                {activeQuotation.totalQuotationsReceived} / {activeQuotation.totalCompaniesInvited}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Appraisals</div>
              <div className="font-medium text-gray-900">{activeQuotation.totalAppraisals}</div>
            </div>
          </div>
        </div>

        {/* Company responses table */}
        {invitedCompanies.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Company</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Fee Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Discount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Net Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Estimate Manday</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invitedCompanies.map(inv => {
                  const cq = sentCompanyQuotations.find(q => q.companyId === inv.companyId);
                  const items = cq?.items ?? [];
                  const hasItems = items.length > 0;
                  const totalFeeAmount = items.reduce((sum, item) => sum + (item.feeAmount ?? 0), 0);
                  const totalDiscount = items.reduce((sum, item) => sum + (item.discount ?? 0) + (item.negotiatedDiscount ?? 0), 0);
                  const totalEstimateManday = items.reduce((sum, item) => sum + (item.estimatedDays ?? 0), 0);
                  return (
                    <tr key={inv.companyId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{inv.companyName}</div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-700 tabular-nums">{hasItems ? fmtCurrency(totalFeeAmount) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm text-gray-700 tabular-nums">{hasItems ? fmtCurrency(totalDiscount) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-900 tabular-nums">{cq ? fmtCurrency(cq.totalQuotedPrice) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm text-gray-600">{hasItems ? totalEstimateManday : '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">{cq ? fmtDt(cq.submittedAt) : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cq ? (
                          <QuotationStatusBadge status={cq.status} />
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {renderCancelFooter()}
      </div>
    );
  }

  // ── Draft — hint banner + Send Quotation button ──────────────────────────
  if (status === 'Draft') {
    const draftDetail = quotationDetail;
    const appraisalCount = draftDetail?.totalAppraisals ?? activeQuotation.totalAppraisals ?? 0;
    const companyCount = draftDetail?.totalCompaniesInvited ?? activeQuotation.totalCompaniesInvited ?? 0;
    const hasDueDate = !!activeQuotation.dueDate;
    const canSend = appraisalCount >= 1 && companyCount >= 1 && hasDueDate;
    const draftAppraisals = draftDetail?.appraisals ?? [];

    /** Step 1 → Step 2: open the share-docs step */
    const handleProceedToShareDocs = () => {
      setShareSelections({});
      setSendStep('share-docs');
    };

    /** Cancel the whole send flow — clear both step and stale tick selections */
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

    /** Step 2 → final send: PUT shared-docs then POST send */
    const handleFinalSend = () => {
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
          sendQuotation(undefined, {
            onSuccess: () => {
              toast.success('Quotation sent — bidding is now open');
              setSendStep(null);
            },
            onError: (err: unknown) => {
              const apiErr = err as { apiError?: { detail?: string } };
              toast.error(apiErr?.apiError?.detail ?? 'Failed to send quotation');
            },
          });
        },
        onError: (err: unknown) => {
          const apiErr = err as { apiError?: { detail?: string } };
          toast.error(apiErr?.apiError?.detail ?? 'Failed to save document selection');
        },
      });
    };

    // ── Edit draft helpers ──────────────────────────────────────────────────

    /** Enter edit mode: seed local state from the current draft values. */
    const handleEnterEdit = () => {
      const initialIds = new Set((draftDetail?.invitedCompanies ?? []).map(c => c.companyId));
      const initialNames: Record<string, string> = {};
      (draftDetail?.invitedCompanies ?? []).forEach(c => {
        initialNames[c.companyId] = c.companyName;
      });
      setEditCompanyIds(initialIds);
      setEditCompanyNames(initialNames);
      setEditDueDate(activeQuotation.dueDate ?? null);
      setEditSearchQuery('');
      setIsEditing(true);
    };

    /** Cancel edit: restore read-only view. */
    const handleCancelEdit = () => {
      setIsEditing(false);
      setEditCompanyIds(new Set());
      setEditCompanyNames({});
      setEditDueDate(null);
      setEditSearchQuery('');
    };

    /** Save the edit. */
    const handleSaveEdit = () => {
      if (!editDueDate) {
        toast.error('Due date is required');
        return;
      }
      editDraftQuotation(
        { dueDate: editDueDate, companyIds: Array.from(editCompanyIds) },
        {
          onSuccess: () => {
            toast.success('Draft quotation updated');
            setIsEditing(false);
          },
          onError: (err: unknown) => {
            const apiErr = err as { data?: { message?: string }; error?: string };
            toast.error(apiErr?.data?.message ?? apiErr?.error ?? 'Failed to update draft');
          },
        },
      );
    };

    const isBusy = isSending || isSettingDocs;

    // Owner-only guard: gate Edit button on requestedBy if available, else show for all Draft.
    const canEdit =
      !currentUser ||
      !draftDetail?.requestedBy ||
      currentUser.username === draftDetail.requestedBy;

    return (
      <div className="flex flex-col gap-3">
        {/* Draft header */}
        <div className="bg-white rounded-xl border border-purple-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
                <Icon name="file-pen" style="solid" className="size-4 text-purple-700" />
              </div>
              <div>
                <span className="text-sm font-semibold text-gray-900">
                  {activeQuotation.quotationNumber}
                </span>
                <QuotationStatusBadge status={status} className="ml-2" />
              </div>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={isEditSaving}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isEditSaving || !editDueDate}
                >
                  {isEditSaving ? (
                    <>
                      <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Icon name="floppy-disk" style="solid" className="size-3.5 mr-1.5" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEnterEdit}
                    disabled={isBusy}
                  >
                    <Icon name="pencil" style="solid" className="size-3.5 mr-1.5" />
                    Edit
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() => setSendStep('confirm')}
                  disabled={!canSend || isBusy}
                  title={
                    !canSend
                      ? 'Add at least 1 appraisal, 1 company, and set a due date before sending'
                      : undefined
                  }
                >
                  <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
                  Send Quotation
                </Button>
              </div>
            )}
          </div>

          {/* Hint banner — visible in both read and edit mode */}
          <div className="flex items-start gap-2 px-4 py-3 bg-amber-50 border-b border-amber-100">
            <Icon name="circle-info" style="solid" className="size-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              This quotation is still a draft. Add appraisals, invite companies, then click{' '}
              <strong>Send Quotation</strong> to open bidding.
            </p>
          </div>

          {/* Stats — read-only or edit form */}
          {isEditing ? (
            <EditDraftForm
              bankingSegment={draftDetail?.bankingSegment || undefined}
              appraisalCount={appraisalCount}
              editDueDate={editDueDate}
              onDueDateChange={setEditDueDate}
              editCompanyIds={editCompanyIds}
              editCompanyNames={editCompanyNames}
              onEditCompanyIdsChange={setEditCompanyIds}
              onEditCompanyNamesChange={setEditCompanyNames}
              editSearchQuery={editSearchQuery}
              onEditSearchQueryChange={setEditSearchQuery}
            />
          ) : (
            <div className="px-4 py-3 text-sm text-gray-600">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Appraisals</div>
                  <div className={clsx('font-medium', appraisalCount === 0 ? 'text-amber-600' : 'text-gray-900')}>
                    {appraisalCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 flex items-center gap-1">
                    Companies Invited
                    <InvitedCompaniesPopover
                      companies={draftDetail?.invitedCompanies ?? []}
                      totalInvited={companyCount}
                    />
                  </div>
                  <div className={clsx('font-medium', companyCount === 0 ? 'text-amber-600' : 'text-gray-900')}>
                    {companyCount}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Due Date</div>
                  <div className={clsx('font-medium', !hasDueDate ? 'text-amber-600' : 'text-gray-900')}>
                    {hasDueDate
                      ? formatDateTime(activeQuotation.dueDate)
                      : 'Not set'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Remove this appraisal from the draft quotation */}
        <div className="flex justify-end px-4 py-2 border-t border-gray-100 bg-gray-50">
          <button
            type="button"
            onClick={() => setShowRemoveConfirm(true)}
            disabled={isBusy || isRemoving}
            className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 underline-offset-2 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon name="trash" style="solid" className="size-3" />
            Remove this appraisal from quotation
          </button>
        </div>

        <ConfirmDialog
          isOpen={showRemoveConfirm}
          onClose={() => setShowRemoveConfirm(false)}
          onConfirm={handleRemoveAppraisal}
          title="Remove from quotation?"
          message={`This appraisal will be removed from quotation ${activeQuotation.quotationNumber}. If it's the last one, the quotation is cancelled.`}
          confirmText="Remove"
          variant="danger"
          isLoading={isRemoving}
        />

        {/* ── Step 1: Confirm send ── */}
        {sendStep === 'confirm' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="size-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Icon name="paper-plane" style="solid" className="size-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Send Quotation</h3>
                  <p className="text-xs text-gray-500">Step 1 of 2 — Confirm details</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                This will open bidding for{' '}
                <strong>{companyCount} {companyCount === 1 ? 'company' : 'companies'}</strong>.
                You will not be able to add or remove appraisals after sending.
              </p>
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={handleCancelSendFlow}
                >
                  Cancel
                </Button>
                <Button size="sm" type="button" onClick={handleProceedToShareDocs}>
                  Next: Share Documents
                  <Icon name="arrow-right" style="solid" className="size-3.5 ml-1.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Share documents ── */}
        {sendStep === 'share-docs' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="size-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Icon name="file-check" style="solid" className="size-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Share Documents</h3>
                  <p className="text-xs text-gray-500">Step 2 of 2 — Tick documents to share with invited companies</p>
                </div>
              </div>

              <ShareDocumentsStep
                appraisals={draftAppraisals}
                selections={shareSelections}
                onToggle={handleDocToggle}
                noDocsAppraisalIds={noDocsAppraisalIds}
                onReportNoDocs={handleReportNoDocs}
              />

              {!allAppraisalsCovered && draftAppraisals.length > 0 && (
                <div className="mt-3 flex items-center gap-1.5 p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <Icon name="triangle-exclamation" style="solid" className="size-3.5 text-amber-500 shrink-0" />
                  <p className="text-xs text-amber-700">
                    Select at least one document for every appraisal before sending.
                  </p>
                </div>
              )}

              <div className="flex gap-3 justify-between mt-5">
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => setSendStep('confirm')}
                  disabled={isBusy}
                >
                  <Icon name="arrow-left" style="solid" className="size-3.5 mr-1.5" />
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={handleCancelSendFlow}
                    disabled={isBusy}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    type="button"
                    onClick={handleFinalSend}
                    disabled={isBusy || !allAppraisalsCovered}
                    title={!allAppraisalsCovered ? 'Select at least one document for every appraisal' : undefined}
                  >
                    {isBusy ? (
                      <>
                        <Icon name="spinner" style="solid" className="size-3.5 mr-1.5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Icon name="paper-plane" style="solid" className="size-3.5 mr-1.5" />
                        Confirm & Send
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── UnderAdminReview — shortlist panel ───────────────────────────────────
  if (status === 'UnderAdminReview') {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">
              {activeQuotation.quotationNumber}
            </span>
            <QuotationStatusBadge status={status} />
          </div>
        </div>
        <AdminShortlistPanel
          quotationId={activeQuotation.id}
          companyQuotations={quotationDetail?.companyQuotations ?? []}
        />
        {renderCancelFooter()}
      </div>
    );
  }

  // ── PendingRmSelection — shortlist sent panel ─────────────────────────────
  if (status === 'PendingRmSelection') {
    if (!quotationDetail) return null;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        <ShortlistSentPanel quotation={quotationDetail} />
        {renderCancelFooter()}
      </div>
    );
  }

  // ── WinnerTentative — shortlist table + Reject/Finalize actions ─────────────
  if (status === 'WinnerTentative') {
    if (!quotationDetail) return null;
    const winner = quotationDetail.companyQuotations?.find(
      cq => cq.id === quotationDetail.tentativeWinnerQuotationId,
    );
    return (
      <>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700">{activeQuotation.quotationNumber}</span>
              <QuotationStatusBadge status={status} />
            </div>
            {winner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openReject}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Icon name="xmark" style="solid" className="size-3.5 mr-1.5" />
                  Reject Winner
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openNegotiate}
                  disabled={(winner.negotiationRounds ?? 0) >= 3}
                  title={
                    (winner.negotiationRounds ?? 0) >= 3
                      ? 'Maximum negotiation rounds reached'
                      : undefined
                  }
                >
                  <Icon name="handshake" style="solid" className="size-3.5 mr-1.5 text-orange-500" />
                  Open Negotiation
                </Button>
                <Button size="sm" onClick={openFinalize} className="bg-green-600 hover:bg-green-700">
                  <Icon name="flag-checkered" style="solid" className="size-3.5 mr-1.5" />
                  Finalize
                </Button>
              </div>
            )}
          </div>
          <ShortlistSentPanel quotation={quotationDetail} />
          {renderCancelFooter()}
        </div>
        {winner && (
          <>
            <RejectTentativeModal
              isOpen={isRejectOpen}
              onClose={closeReject}
              quotationId={quotationDetail.id}
              companyName={winner.companyName}
            />
            <FinalizeModal
              isOpen={isFinalizeOpen}
              onClose={closeFinalize}
              quotationId={quotationDetail.id}
              companyQuotationId={winner.id}
              companyName={winner.companyName}
              winnerItems={winner.items ?? []}
              appraisals={quotationDetail.appraisals ?? []}
            />
            <NegotiationModal
              isOpen={isNegotiateOpen}
              onClose={closeNegotiate}
              quotationId={quotationDetail.id}
              companyQuotationId={winner.id}
              companyName={winner.companyName}
              currentRounds={winner.negotiationRounds ?? 0}
            />
          </>
        )}
      </>
    );
  }

  // ── Negotiating ───────────────────────────────────────────────────────────
  if (status === 'Negotiating') {
    if (!quotationDetail) return null;
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
        <NegotiationPanel quotation={quotationDetail} />
        {renderCancelFooter()}
      </div>
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
    return (
      <div className="bg-white rounded-xl border border-green-200 overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border-b border-green-200">
          <div className="size-8 rounded-lg bg-green-200 flex items-center justify-center">
            <Icon name="circle-check" style="solid" className="size-4 text-green-700" />
          </div>
          <div>
            <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
            <QuotationStatusBadge status={status} className="ml-2" />
          </div>
        </div>
        <div className="px-4 py-3 text-sm text-gray-600">
          <p>
            Quotation finalized with{' '}
            <strong className="text-gray-900">{winner?.companyName ?? '—'}</strong>.
          </p>
          {finalPrice != null && (
            <p className="mt-1">
              Final price:{' '}
              <strong className="text-green-700">
                {new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(
                  finalPrice,
                )}
              </strong>
            </p>
          )}
          <p className="mt-2 text-xs text-gray-400">
            Click "Assign" to route externally to this company.
          </p>
        </div>
      </div>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────
  if (status === 'Cancelled') {
    return (
      <div className="bg-white rounded-xl border border-red-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-red-200 flex items-center justify-center">
              <Icon name="ban" style="solid" className="size-4 text-red-700" />
            </div>
            <div>
              <span className="text-sm font-semibold text-gray-900">{activeQuotation.quotationNumber}</span>
              <QuotationStatusBadge status={status} className="ml-2" />
            </div>
          </div>
          <Button size="sm" onClick={onCreateNew}>
            <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
            New Quotation
          </Button>
        </div>
        <div className="px-4 py-3 text-sm text-gray-500">
          This quotation was cancelled. Create a new quotation for this appraisal.
        </div>
      </div>
    );
  }

  // ── Fallback: existing list view (Draft or unknown) ───────────────────────
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-purple-50 border-b border-purple-200">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-lg bg-purple-200 flex items-center justify-center">
            <Icon name="file-invoice-dollar" style="solid" className="size-4 text-purple-700" />
          </div>
          <span className="text-sm font-semibold text-gray-900">Quotation</span>
        </div>
        <Button size="sm" onClick={onCreateNew}>
          <Icon name="file-circle-plus" style="solid" className="size-3.5 mr-1.5" />
          New Quotation
        </Button>
      </div>
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-purple-600">{activeQuotation.quotationNumber}</span>
          <QuotationStatusBadge status={status} />
        </div>
      </div>
    </div>
  );
};

export default QuotationSection;

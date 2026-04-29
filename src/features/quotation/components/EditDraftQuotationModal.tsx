import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import { useGetRequestDocuments } from '@/features/request/api/documents';
import {
  useEditDraftQuotation,
  useGetLoanTypeMatchedCompanies,
  useSetSharedDocuments,
} from '../api/quotation';
import type {
  AppraisalSummaryDto,
  EditDraftAppraisalEntry,
  QuotationRequestDetailDto,
  SharedDocumentSelectionDto,
} from '../schemas/quotation';

interface EditDraftQuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: QuotationRequestDetailDto;
}

interface SelectedCompany {
  id: string;
  companyName: string;
}

/** Outer key = appraisalId, inner key = documentId, value = level */
type DocSelections = Record<string, Record<string, SharedDocumentSelectionDto['level']>>;

/**
 * Modal for editing a Draft quotation: due date, per-appraisal max days,
 * per-appraisal shared documents, and invited companies.
 */
const EditDraftQuotationModal = ({ isOpen, onClose, quotation }: EditDraftQuotationModalProps) => {
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appraisalDays, setAppraisalDays] = useState<Record<string, number | null>>({});
  const [docSelections, setDocSelections] = useState<DocSelections>({});
  const [expandedAppraisalId, setExpandedAppraisalId] = useState<string | null>(null);

  const { mutateAsync: editDraftAsync, isPending: isEditing } = useEditDraftQuotation(quotation.id);
  const { mutateAsync: setSharedDocsAsync, isPending: isSavingDocs } = useSetSharedDocuments(
    quotation.id,
  );
  const isPending = isEditing || isSavingDocs;

  // Fetch all eligible companies (no loanType filter for standalone)
  const { data: rawCompanies, isLoading: isLoadingCompanies } = useGetLoanTypeMatchedCompanies(
    undefined,
    isOpen,
  );

  const allCompanies: SelectedCompany[] = useMemo(
    () => (rawCompanies ?? []).map(c => ({ id: c.id, companyName: c.name })),
    [rawCompanies],
  );

  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return allCompanies;
    const q = searchQuery.toLowerCase();
    return allCompanies.filter(c => c.companyName.toLowerCase().includes(q));
  }, [allCompanies, searchQuery]);

  // Seed form once per open — depending on quotation.* arrays would retrigger the seed
  // on background refetches (mutation invalidations, focus refetch) and wipe in-flight edits.
  // Local state is the source of truth while the modal is open.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isOpen) return;
    setDueDate(quotation.dueDate ?? null);
    setSelectedCompanies(
      (quotation.invitedCompanies ?? []).map(c => ({
        id: c.companyId,
        companyName: c.companyName,
      })),
    );
    setAppraisalDays(
      Object.fromEntries(
        (quotation.appraisals ?? []).map(a => [a.appraisalId, a.maxAppraisalDays ?? null]),
      ),
    );
    const seededDocs: DocSelections = {};
    for (const entry of quotation.sharedDocuments ?? []) {
      const apMap = (seededDocs[entry.appraisalId] ??= {});
      apMap[entry.documentId] = entry.level;
    }
    setDocSelections(seededDocs);
    setSearchQuery('');
    setExpandedAppraisalId(null);
  }, [isOpen, quotation.id]);

  const handleToggleCompany = (company: SelectedCompany) => {
    setSelectedCompanies(prev => {
      const exists = prev.some(c => c.id === company.id);
      return exists ? prev.filter(c => c.id !== company.id) : [...prev, company];
    });
  };

  const handleRemoveCompany = (id: string) => {
    setSelectedCompanies(prev => prev.filter(c => c.id !== id));
  };

  const handleToggleDoc = (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => {
    setDocSelections(prev => {
      const next = { ...prev };
      const apMap = { ...(next[appraisalId] ?? {}) };
      if (checked) apMap[documentId] = level;
      else delete apMap[documentId];
      next[appraisalId] = apMap;
      return next;
    });
  };

  const handleSave = async () => {
    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }
    if (selectedCompanies.length === 0) {
      toast.error('At least one company must be invited');
      return;
    }

    const appraisalEntries: EditDraftAppraisalEntry[] = (quotation.appraisals ?? []).map(a => ({
      appraisalId: a.appraisalId,
      maxAppraisalDays: appraisalDays[a.appraisalId] ?? null,
    }));

    const docPayload: SharedDocumentSelectionDto[] = [];
    for (const [appraisalId, docs] of Object.entries(docSelections)) {
      for (const [documentId, level] of Object.entries(docs)) {
        docPayload.push({ appraisalId, documentId, level });
      }
    }

    try {
      await editDraftAsync({
        dueDate,
        companyIds: selectedCompanies.map(c => c.id),
        appraisals: appraisalEntries,
      });
      await setSharedDocsAsync(docPayload);
      toast.success('Draft updated');
      onClose();
    } catch (err: unknown) {
      const apiErr = err as { apiError?: { detail?: string } };
      toast.error(apiErr?.apiError?.detail ?? 'Failed to update draft');
    }
  };

  const isCompanySelected = (id: string) => selectedCompanies.some(c => c.id === id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Draft Quotation" size="xl">
      <div className="flex flex-col gap-5">
        {/* Due Date */}
        <DateTimePickerInput
          label="Cutoff (Due Date)"
          required
          helperText="Deadline for companies to submit their quotation responses"
          disablePastDates
          value={dueDate}
          onChange={v => setDueDate(v)}
        />

        {/* Appraisals — per-row Max Days + expandable Shared Documents */}
        {(quotation.appraisals ?? []).length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Appraisals ({quotation.appraisals?.length ?? 0})
            </label>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 grid grid-cols-[1fr_auto_auto_auto] gap-3 text-[11px] font-medium uppercase tracking-wide text-gray-500">
                <span>Appraisal</span>
                <span className="w-28 text-right">Max Days</span>
                <span className="w-28 text-right">Shared Docs</span>
                <span className="w-6" aria-hidden />
              </div>
              <div className="divide-y divide-gray-100">
                {(quotation.appraisals ?? []).map(a => {
                  const isExpanded = expandedAppraisalId === a.appraisalId;
                  const docCount = Object.keys(docSelections[a.appraisalId] ?? {}).length;
                  return (
                    <div key={a.appraisalId}>
                      <div className="px-3 py-2 grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {a.appraisalNumber ?? a.appraisalId.slice(0, 8)}
                          </p>
                          {a.customerName && (
                            <p className="text-xs text-gray-500 truncate">{a.customerName}</p>
                          )}
                        </div>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={appraisalDays[a.appraisalId] ?? ''}
                          onChange={e => {
                            const v = e.target.value;
                            setAppraisalDays(prev => ({
                              ...prev,
                              [a.appraisalId]: v === '' ? null : Math.max(1, Number(v)),
                            }));
                          }}
                          placeholder="—"
                          aria-label={`Max appraisal days for ${a.appraisalNumber ?? a.appraisalId}`}
                          className="w-28 px-2 py-1 text-right text-sm tabular-nums border border-gray-200 rounded-md focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                        />
                        <span className="w-28 text-right text-xs text-gray-600 tabular-nums">
                          {docCount} selected
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedAppraisalId(isExpanded ? null : a.appraisalId)
                          }
                          className="size-6 rounded-md hover:bg-gray-100 text-gray-500 transition-colors flex items-center justify-center"
                          aria-label={
                            isExpanded
                              ? `Hide documents for ${a.appraisalNumber ?? a.appraisalId}`
                              : `Show documents for ${a.appraisalNumber ?? a.appraisalId}`
                          }
                        >
                          <Icon
                            name={isExpanded ? 'chevron-up' : 'chevron-down'}
                            style="solid"
                            className="size-3"
                          />
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-gray-100 bg-gray-50">
                          <AppraisalDocPicker
                            appraisal={a}
                            apSelection={docSelections[a.appraisalId] ?? {}}
                            onToggle={handleToggleDoc}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Selected companies chips */}
        {selectedCompanies.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Selected Companies ({selectedCompanies.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedCompanies.map(c => (
                <div
                  key={c.id}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm"
                >
                  <Icon name="building" style="solid" className="size-3.5" />
                  <span className="font-medium">{c.companyName}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCompany(c.id)}
                    className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                    aria-label={`Remove ${c.companyName}`}
                  >
                    <Icon name="xmark" style="solid" className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Company selection */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-1.5">
            Invited Companies <span className="text-danger">*</span>
          </div>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-2 border-b border-gray-100">
              <div className="relative">
                <Icon
                  name="magnifying-glass"
                  style="regular"
                  className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400"
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
                <div className="flex items-center justify-center px-4 py-6 gap-2 text-gray-400">
                  <Icon name="spinner" style="solid" className="size-4 animate-spin" />
                  <span className="text-xs">Loading...</span>
                </div>
              ) : filteredCompanies.length === 0 ? (
                <div className="px-4 py-6 text-center text-sm text-gray-500">
                  No companies found
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCompanies.map(c => {
                    const selected = isCompanySelected(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleToggleCompany(c)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors',
                          selected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50',
                        )}
                      >
                        <div
                          className={clsx(
                            'size-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                            selected
                              ? 'bg-purple-500 border-purple-500'
                              : 'border-gray-300 bg-white',
                          )}
                        >
                          {selected && (
                            <Icon name="check" style="solid" className="size-3 text-white" />
                          )}
                        </div>
                        <div className="size-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                          <Icon name="building" style="solid" className="size-4 text-purple-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900 truncate flex-1">
                          {c.companyName}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !dueDate || selectedCompanies.length === 0}
            isLoading={isPending}
          >
            {!isPending && <Icon name="floppy-disk" style="solid" className="size-4 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Per-appraisal document picker ───────────────────────────────────────────

interface AppraisalDocPickerProps {
  appraisal: AppraisalSummaryDto;
  apSelection: Record<string, SharedDocumentSelectionDto['level']>;
  onToggle: (
    appraisalId: string,
    documentId: string,
    level: SharedDocumentSelectionDto['level'],
    checked: boolean,
  ) => void;
}

const AppraisalDocPicker = ({ appraisal, apSelection, onToggle }: AppraisalDocPickerProps) => {
  const { data, isLoading } = useGetRequestDocuments(appraisal.requestId ?? undefined);
  const sections = data?.sections ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 px-3 text-xs text-gray-400">
        <Icon name="spinner" style="solid" className="size-3.5 animate-spin" />
        Loading documents...
      </div>
    );
  }

  if (!appraisal.requestId) {
    return (
      <div className="px-3 py-3 text-xs text-amber-600 flex items-center gap-1.5">
        <Icon name="triangle-exclamation" style="solid" className="size-3.5 shrink-0" />
        No request linked to this appraisal. Documents cannot be loaded.
      </div>
    );
  }

  const hasUploaded = sections.some(s => s.documents.some(d => d.documentId));
  if (!hasUploaded) {
    return (
      <div className="px-3 py-3 text-xs text-gray-400">
        No uploaded documents found for this request.
      </div>
    );
  }

  return (
    <div className="flex flex-col divide-y divide-gray-100 max-h-[280px] overflow-y-auto">
      {sections.map((section, sIdx) => {
        const level: SharedDocumentSelectionDto['level'] =
          section.titleId == null ? 'RequestLevel' : 'TitleLevel';
        const uploadedDocs = section.documents.filter(d => d.documentId);
        if (uploadedDocs.length === 0) return null;

        const allSelected = uploadedDocs.every(d => !!apSelection[d.documentId!]);
        const handleSelectAll = (checked: boolean) => {
          uploadedDocs.forEach(d =>
            onToggle(appraisal.appraisalId, d.documentId!, level, checked),
          );
        };

        return (
          <div key={sIdx} className="px-3 py-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
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

export default EditDraftQuotationModal;

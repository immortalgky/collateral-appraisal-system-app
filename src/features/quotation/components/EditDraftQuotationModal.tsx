import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import Modal from '@/shared/components/Modal';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';
import {
  useAddAppraisalToDraft,
  useEditDraftQuotation,
  useGetLoanTypeMatchedCompanies,
  useRemoveAppraisalFromDraft,
  useSetSharedDocuments,
} from '../api/quotation';
import type {
  EditDraftAppraisalEntry,
  QuotationRequestDetailDto,
  SharedDocumentSelectionDto,
} from '../schemas/quotation';
import { AppraisalPicker, SelectedAppraisalRow, SetMaxDaysBar } from './AppraisalPicker';
import type { SelectedAppraisal } from './AppraisalPicker';

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
 * per-appraisal shared documents, invited companies, and adding/removing appraisals.
 *
 * State model:
 *  - `appraisals`           — unified working list (existing + newly-added)
 *  - `docSelections`        — shared-doc selections per appraisalId
 *  - `markedForRemovalIds`  — existing IDs the user wants removed (shown struck-through; need DELETE on save)
 *  - `addedAppraisalIds`    — IDs picked from the picker this session (need POST on save)
 *
 * Enhancement #3: picker is lazy-mounted behind [+ Add or change appraisals] button.
 * Enhancement #5: removals of existing rows are marked (not deleted) until Save.
 */
const EditDraftQuotationModal = ({ isOpen, onClose, quotation }: EditDraftQuotationModalProps) => {
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [docSelections, setDocSelections] = useState<DocSelections>({});

  // Unified appraisal list (existing + added)
  const [appraisals, setAppraisals] = useState<SelectedAppraisal[]>([]);
  // Track which existing IDs are marked for removal (shown struck-through; need DELETE on save)
  const [markedForRemovalIds, setMarkedForRemovalIds] = useState<Set<string>>(new Set());
  // Track which IDs were added via picker (need POST on save)
  const [addedAppraisalIds, setAddedAppraisalIds] = useState<Set<string>>(new Set());

  // Lazy-mount picker toggle (Enhancement #3)
  const [showPicker, setShowPicker] = useState(false);

  // Expanded rows in the compact summary list (Enhancement #1)
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<string>>(new Set());

  const handleToggleSummaryExpanded = (id: string) => {
    setExpandedSummaryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { mutateAsync: editDraftAsync, isPending: isEditing } = useEditDraftQuotation(quotation.id);
  const { mutateAsync: setSharedDocsAsync, isPending: isSavingDocs } = useSetSharedDocuments(
    quotation.id,
  );
  const { mutateAsync: addAppraisalAsync, isPending: isAddingAppraisal } = useAddAppraisalToDraft(
    quotation.id,
  );
  const { mutateAsync: removeAppraisalAsync, isPending: isRemovingAppraisal } =
    useRemoveAppraisalFromDraft(quotation.id);

  const isPending = isEditing || isSavingDocs || isAddingAppraisal || isRemovingAppraisal;

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

  // Seed form once per open
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
    setAppraisals(
      (quotation.appraisals ?? []).map(a => ({
        id: a.appraisalId,
        requestId: a.requestId ?? null,
        appraisalNumber: a.appraisalNumber ?? a.appraisalId.slice(0, 8),
        customerName: a.customerName ?? null,
        maxAppraisalDays: a.maxAppraisalDays ?? null,
      })),
    );
    const seededDocs: DocSelections = {};
    for (const entry of quotation.sharedDocuments ?? []) {
      const apMap = (seededDocs[entry.appraisalId] ??= {});
      apMap[entry.documentId] = entry.level;
    }
    setDocSelections(seededDocs);
    setSearchQuery('');
    setMarkedForRemovalIds(new Set());
    setAddedAppraisalIds(new Set());
    setShowPicker(false);
    setExpandedSummaryIds(new Set());
  }, [isOpen, quotation.id]);

  const handleToggleCompany = (company: SelectedCompany) => {
    setSelectedCompanies(prev => {
      const exists = prev.some(c => c.id === company.id);
      return exists ? prev.filter(c => c.id !== company.id) : [...prev, company];
    });
  };

  const handleSetAllVisibleCompanies = (companies: SelectedCompany[], selectAll: boolean) => {
    setSelectedCompanies(prev => {
      const ids = new Set(companies.map(c => c.id));
      if (selectAll) {
        const merged = [...prev];
        for (const c of companies) {
          if (!merged.some(x => x.id === c.id)) merged.push(c);
        }
        return merged;
      }
      return prev.filter(c => !ids.has(c.id));
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

  // Called when the picker adds an appraisal
  const handleAddAppraisal = (a: SelectedAppraisal) => {
    setAppraisals(prev => (prev.some(x => x.id === a.id) ? prev : [...prev, a]));

    // If it was marked for removal, undo the mark (still exists on server — no POST needed)
    if (markedForRemovalIds.has(a.id)) {
      setMarkedForRemovalIds(prev => {
        const next = new Set(prev);
        next.delete(a.id);
        return next;
      });
      return;
    }
    // Truly new pick — schedule a POST on save
    setAddedAppraisalIds(prev => new Set([...prev, a.id]));
  };

  // Called when user clicks Undo on a marked-for-removal row
  const handleUndoRemoval = (id: string) => {
    setMarkedForRemovalIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  // Called when user X-clicks a row in the compact summary or in the picker
  const handleRemoveAppraisal = (id: string) => {
    setAddedAppraisalIds(prev => {
      if (prev.has(id)) {
        // Was newly-added this session — drop from both lists (never persisted)
        setAppraisals(prevA => prevA.filter(a => a.id !== id));
        setDocSelections(prevD => {
          if (!(id in prevD)) return prevD;
          const next = { ...prevD };
          delete next[id];
          return next;
        });
        const next = new Set(prev);
        next.delete(id);
        return next;
      }
      // Was an existing backend row — mark for removal (keep in appraisals list)
      setMarkedForRemovalIds(r => new Set([...r, id]));
      return prev;
    });
  };

  // Called when a row's max-days input changes
  const handleUpdateMaxDays = (id: string, maxAppraisalDays: number | null) => {
    setAppraisals(prev =>
      prev.map(a => (a.id === id ? { ...a, maxAppraisalDays } : a)),
    );
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
    const activeAppraisals = appraisals.filter(a => !markedForRemovalIds.has(a.id));
    if (activeAppraisals.length === 0) {
      toast.error('At least one appraisal is required');
      return;
    }

    // Step 1 — DELETE removals
    for (const id of markedForRemovalIds) {
      try {
        await removeAppraisalAsync(id);
      } catch (err: unknown) {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(apiErr?.apiError?.detail ?? `Failed to remove appraisal`);
        return;
      }
    }

    // Step 2 — POST additions
    for (const id of addedAppraisalIds) {
      try {
        await addAppraisalAsync(id);
      } catch (err: unknown) {
        const apiErr = err as { apiError?: { detail?: string } };
        toast.error(apiErr?.apiError?.detail ?? `Failed to add appraisal`);
        return;
      }
    }

    // Step 3 — PATCH: update due date, companies, per-appraisal max days
    const appraisalEntries: EditDraftAppraisalEntry[] = activeAppraisals.map(a => ({
      appraisalId: a.id,
      maxAppraisalDays: a.maxAppraisalDays ?? null,
    }));

    // Step 4 — PUT shared-docs: only for active appraisals
    const activeIds = new Set(activeAppraisals.map(a => a.id));
    const docPayload: SharedDocumentSelectionDto[] = [];
    for (const [appraisalId, docs] of Object.entries(docSelections)) {
      if (!activeIds.has(appraisalId)) continue;
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

  const activeAppraisalCount = appraisals.filter(a => !markedForRemovalIds.has(a.id)).length;

  return (
    <>
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Draft Quotation" size="3xl">
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

        {/* Compact appraisal summary + lazy picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Appraisals ({activeAppraisalCount})
          </label>

          {/* Compact summary list — always visible; picker hides its internal selected panel via hideSelectedPanel */}
          {appraisals.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden mb-2">
              {/* "Set max days for all" bar */}
              <SetMaxDaysBar
                appraisals={appraisals}
                markedForRemovalIds={markedForRemovalIds}
                onUpdateMaxDays={handleUpdateMaxDays}
              />
              <div className="divide-y divide-gray-100">
                {appraisals.map(a => (
                  <SelectedAppraisalRow
                    key={a.id}
                    appraisal={a}
                    isExpanded={expandedSummaryIds.has(a.id)}
                    onToggleExpanded={handleToggleSummaryExpanded}
                    onUpdateMaxDays={handleUpdateMaxDays}
                    docSelections={docSelections}
                    onToggleDoc={handleToggleDoc}
                    isMarkedForRemoval={markedForRemovalIds.has(a.id)}
                    onUndoRemoval={handleUndoRemoval}
                    onRemove={handleRemoveAppraisal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Open picker popup */}
          <Button variant="outline" size="sm" onClick={() => setShowPicker(true)}>
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            Add or change appraisals
          </Button>
        </div>

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
            {!isLoadingCompanies && filteredCompanies.length > 0 && (() => {
              const selectedSet = new Set(selectedCompanies.map(c => c.id));
              const allVisibleSelected = filteredCompanies.every(c => selectedSet.has(c.id));
              const someVisibleSelected = filteredCompanies.some(c => selectedSet.has(c.id));
              return (
                <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={el => {
                      if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                    }}
                    onChange={() => handleSetAllVisibleCompanies(filteredCompanies, !allVisibleSelected)}
                    className="size-3.5 accent-purple-600 rounded shrink-0 cursor-pointer"
                    aria-label="Select all visible companies"
                  />
                  <span className="text-xs text-gray-600">
                    {allVisibleSelected ? 'Clear all' : 'Select all'}
                    {searchQuery.trim() && (
                      <span className="text-gray-400"> ({filteredCompanies.length} matching)</span>
                    )}
                  </span>
                </div>
              );
            })()}
            <div className="max-h-96 overflow-y-auto">
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
            disabled={isPending || !dueDate || selectedCompanies.length === 0 || activeAppraisalCount === 0}
            isLoading={isPending}
          >
            {!isPending && <Icon name="floppy-disk" style="solid" className="size-4 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>
    </Modal>

    {/* Picker popup — child modal stacks above the edit modal */}
    <Modal
      isOpen={showPicker}
      onClose={() => setShowPicker(false)}
      title="Add or change appraisals"
      size="3xl"
    >
      <div className="flex flex-col gap-4">
        <AppraisalPicker
          selected={appraisals}
          onAdd={handleAddAppraisal}
          onRemove={handleRemoveAppraisal}
          onUpdateMaxDays={handleUpdateMaxDays}
          docSelections={docSelections}
          onToggleDoc={handleToggleDoc}
          excludeQuotationRequestId={quotation.id}
          markedForRemovalIds={markedForRemovalIds}
          onUndoRemoval={handleUndoRemoval}
          hideSelectedPanel
        />
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <Button onClick={() => setShowPicker(false)}>
            <Icon name="check" style="solid" className="size-3.5 mr-1.5" />
            Done
          </Button>
        </div>
      </div>
    </Modal>
    </>
  );
};

export default EditDraftQuotationModal;

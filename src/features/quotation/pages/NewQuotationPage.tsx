import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';

import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Modal from '@/shared/components/Modal';
import DateTimePickerInput from '@/shared/components/inputs/DateTimePickerInput';

import axios from '@shared/api/axiosInstance';
import { useAuthStore } from '@features/auth/store.ts';
import { useCreateQuotation, useGetLoanTypeMatchedCompanies } from '../api/quotation';
import type { SharedDocumentSelectionDto } from '../schemas/quotation';
import {
  AppraisalPicker,
  SelectedAppraisalRow,
  SetMaxDaysBar,
} from '../components/AppraisalPicker';
import type { SelectedAppraisal, DocSelections } from '../components/AppraisalPicker';

// ─── Zod Schema ───────────────────────────────────────────────────────────────

const newQuotationSchema = z.object({
  dueDate: z.string().min(1, 'Due date is required'),
  appraisalIds: z.array(z.string()).min(1, 'Select at least one appraisal'),
  invitedCompanyIds: z.array(z.string()).min(1, 'Invite at least one company'),
});

type NewQuotationFormValues = z.infer<typeof newQuotationSchema>;

// ─── Internal types ───────────────────────────────────────────────────────────

interface SelectedCompany {
  id: string;
  companyName: string;
}

// ─── CompanyPicker ────────────────────────────────────────────────────────────

interface CompanyPickerProps {
  selected: SelectedCompany[];
  onToggle: (c: SelectedCompany) => void;
  onSetAllVisible: (companies: SelectedCompany[], selectAll: boolean) => void;
  error?: string;
}

function CompanyPicker({ selected, onToggle, onSetAllVisible, error }: CompanyPickerProps) {
  const [query, setQuery] = useState('');
  const selectedIds = new Set(selected.map(c => c.id));

  const { data: rawCompanies, isLoading } = useGetLoanTypeMatchedCompanies(undefined, true);

  const companies: SelectedCompany[] = useMemo(
    () => (rawCompanies ?? []).map(c => ({ id: c.id, companyName: c.name })),
    [rawCompanies],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return companies;
    const q = query.toLowerCase();
    return companies.filter(c => c.companyName.toLowerCase().includes(q));
  }, [companies, query]);

  return (
    <div className="flex flex-col gap-2">
      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map(c => (
            <div
              key={c.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium"
            >
              <Icon name="building" style="solid" className="size-3" />
              <span>{c.companyName}</span>
              <button
                type="button"
                onClick={() => onToggle(c)}
                className="p-0.5 rounded-full hover:bg-purple-200 transition-colors"
                aria-label={`Remove ${c.companyName}`}
              >
                <Icon name="xmark" style="solid" className="size-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search + list */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="relative p-2 border-b border-gray-100">
          <Icon
            name="magnifying-glass"
            style="solid"
            className="absolute left-4 top-1/2 -translate-y-1/2 size-3.5 text-gray-400"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search company name..."
            className="w-full pl-8 pr-3 py-1.5 text-sm border-0 outline-none bg-transparent"
          />
        </div>
        {!isLoading && filtered.length > 0 && (() => {
          const allVisibleSelected = filtered.every(c => selectedIds.has(c.id));
          const someVisibleSelected = filtered.some(c => selectedIds.has(c.id));
          return (
            <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                ref={el => {
                  if (el) el.indeterminate = !allVisibleSelected && someVisibleSelected;
                }}
                onChange={() => onSetAllVisible(filtered, !allVisibleSelected)}
                className="size-3.5 accent-purple-600 rounded shrink-0 cursor-pointer"
                aria-label="Select all visible companies"
              />
              <span className="text-xs text-gray-600">
                {allVisibleSelected ? 'Clear all' : 'Select all'}
                {query.trim() && <span className="text-gray-400"> ({filtered.length} matching)</span>}
              </span>
            </div>
          );
        })()}
        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 gap-2 text-gray-400">
              <Icon name="spinner" style="solid" className="size-4 animate-spin" />
              <span className="text-xs">Loading companies...</span>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4 italic">No companies found</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {filtered.map(c => {
                const isSelected = selectedIds.has(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onToggle(c)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      isSelected ? 'bg-purple-50 hover:bg-purple-100' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className={`size-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isSelected ? 'bg-purple-500 border-purple-500' : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isSelected && (
                        <Icon name="check" style="solid" className="size-2.5 text-white" />
                      )}
                    </div>
                    <div className="size-7 rounded bg-purple-100 flex items-center justify-center shrink-0">
                      <Icon name="building" style="solid" className="size-3.5 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-900 flex-1 truncate">{c.companyName}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

// ─── NewQuotationPage ─────────────────────────────────────────────────────────

function NewQuotationPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  const [selectedAppraisals, setSelectedAppraisals] = useState<SelectedAppraisal[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<SelectedCompany[]>([]);
  const [docSelections, setDocSelections] = useState<DocSelections>({});
  const [showPicker, setShowPicker] = useState(false);
  const [expandedSummaryIds, setExpandedSummaryIds] = useState<Set<string>>(new Set());

  const handleToggleSummaryExpanded = (id: string) => {
    setExpandedSummaryIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { mutateAsync: createQuotationAsync, isPending: isCreating } = useCreateQuotation();

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<NewQuotationFormValues>({
    resolver: zodResolver(newQuotationSchema),
    defaultValues: {
      dueDate: '',
      appraisalIds: [],
      invitedCompanyIds: [],
    },
  });

  useEffect(() => {
    setValue(
      'appraisalIds',
      selectedAppraisals.map(a => a.id),
      { shouldValidate: true },
    );
  }, [selectedAppraisals, setValue]);

  useEffect(() => {
    setValue(
      'invitedCompanyIds',
      selectedCompanies.map(c => c.id),
      { shouldValidate: true },
    );
  }, [selectedCompanies, setValue]);

  const handleAddAppraisal = (a: SelectedAppraisal) => {
    setSelectedAppraisals(prev => (prev.some(x => x.id === a.id) ? prev : [...prev, a]));
  };

  const handleRemoveAppraisal = (id: string) => {
    setSelectedAppraisals(prev => prev.filter(a => a.id !== id));
    setDocSelections(prev => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
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

  const handleUpdateMaxDays = (id: string, maxAppraisalDays: number | null) => {
    setSelectedAppraisals(prev =>
      prev.map(a => (a.id === id ? { ...a, maxAppraisalDays } : a)),
    );
  };

  const handleToggleCompany = (c: SelectedCompany) => {
    setSelectedCompanies(prev =>
      prev.some(x => x.id === c.id) ? prev.filter(x => x.id !== c.id) : [...prev, c],
    );
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

  const [isSavingDocs, setIsSavingDocs] = useState(false);
  const isPending = isCreating || isSavingDocs;

  const onSubmit = async (values: NewQuotationFormValues) => {
    try {
      const { id } = await createQuotationAsync({
        dueDate: values.dueDate,
        requestedBy: currentUser?.username ?? '',
        appraisals: selectedAppraisals.map(a => ({
          appraisalId: a.id,
          maxAppraisalDays: a.maxAppraisalDays,
        })),
        invitedCompanyIds: values.invitedCompanyIds,
      });

      const docPayload: SharedDocumentSelectionDto[] = [];
      for (const [appraisalId, docs] of Object.entries(docSelections)) {
        for (const [documentId, level] of Object.entries(docs)) {
          docPayload.push({ appraisalId, documentId, level });
        }
      }

      if (docPayload.length > 0) {
        setIsSavingDocs(true);
        try {
          await axios.put(`/quotations/${id}/shared-documents`, { documents: docPayload });
        } finally {
          setIsSavingDocs(false);
        }
      }

      toast.success('Quotation draft created');
      navigate(`/quotations/${id}`);
    } catch (err: unknown) {
      const apiErr = err as { apiError?: { detail?: string } };
      toast.error(apiErr?.apiError?.detail ?? 'Failed to create quotation');
    }
  };

  return (
    <div className="w-full py-6 px-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/quotations')}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          aria-label="Back to quotations"
        >
          <Icon name="arrow-left" style="solid" className="size-4" />
        </button>
        <div>
          <h2 className="text-base font-semibold text-gray-900">New Quotation</h2>
          <p className="text-xs text-gray-500 mt-0.5">Create a standalone RFQ draft</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
        {/* Appraisals */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium text-gray-800">
              Appraisals to include <span className="text-danger">*</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Search and add one or more appraisals to this RFQ
            </p>
          </div>
          {/* Compact summary list (always visible) */}
          {selectedAppraisals.length > 0 && (
            <div className="rounded-lg border border-gray-200 overflow-hidden">
              <SetMaxDaysBar
                appraisals={selectedAppraisals}
                onUpdateMaxDays={handleUpdateMaxDays}
              />
              <div className="divide-y divide-gray-100">
                {selectedAppraisals.map(a => (
                  <SelectedAppraisalRow
                    key={a.id}
                    appraisal={a}
                    isExpanded={expandedSummaryIds.has(a.id)}
                    onToggleExpanded={handleToggleSummaryExpanded}
                    onUpdateMaxDays={handleUpdateMaxDays}
                    docSelections={docSelections}
                    onToggleDoc={handleToggleDoc}
                    onRemove={handleRemoveAppraisal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Open picker popup */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPicker(true)}
          >
            <Icon name="plus" style="solid" className="size-3.5 mr-1.5" />
            Add or change appraisals
          </Button>

          {errors.appraisalIds?.message && (
            <p className="text-xs text-danger">{errors.appraisalIds.message}</p>
          )}
        </div>

        {/* Companies */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-3">
          <div>
            <div className="text-sm font-medium text-gray-800">
              Invited companies <span className="text-danger">*</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Select external companies to invite for this quotation
            </p>
          </div>
          <CompanyPicker
            selected={selectedCompanies}
            onToggle={handleToggleCompany}
            onSetAllVisible={handleSetAllVisibleCompanies}
            error={errors.invitedCompanyIds?.message}
          />
        </div>

        {/* Due Date */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DateTimePickerInput
                label="Cutoff (Due Date)"
                required
                helperText="Deadline for companies to submit their quotation responses"
                placeholder="dd/mm/yyyy hh:mm"
                disablePastDates
                value={field.value || null}
                onChange={v => field.onChange(v ?? '')}
                onBlur={field.onBlur}
                error={errors.dueDate?.message}
              />
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/quotations')}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending} isLoading={isPending}>
            {!isPending && <Icon name="file-circle-plus" style="solid" className="size-4 mr-1.5" />}
            Create Draft
          </Button>
        </div>
      </form>

      {/* Picker popup */}
      <Modal
        isOpen={showPicker}
        onClose={() => setShowPicker(false)}
        title="Add or change appraisals"
        size="3xl"
      >
        <div className="flex flex-col gap-4">
          <AppraisalPicker
            selected={selectedAppraisals}
            onAdd={handleAddAppraisal}
            onRemove={handleRemoveAppraisal}
            onUpdateMaxDays={handleUpdateMaxDays}
            docSelections={docSelections}
            onToggleDoc={handleToggleDoc}
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
    </div>
  );
}

export default NewQuotationPage;

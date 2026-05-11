import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import { TableRowSkeleton } from '@/shared/components/Skeleton';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import { useGetEligibleAssignments, useCreateInvoice, useSubmitInvoice } from '../api/invoice';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const ExtCreateInvoicePage = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState('');

  const { data: assignments = [], isLoading, isError, error } = useGetEligibleAssignments();
  const { mutateAsync: createInvoice, isPending: isCreating } = useCreateInvoice();
  const { mutateAsync: submitInvoice, isPending: isSubmitting } = useSubmitInvoice();

  const allSelected = assignments.length > 0 && selectedIds.size === assignments.length;
  const someSelected = selectedIds.size > 0 && selectedIds.size < assignments.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(assignments.map(a => a.assignmentId)));
    }
  };

  const toggleItem = (assignmentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(assignmentId)) {
        next.delete(assignmentId);
      } else {
        next.add(assignmentId);
      }
      return next;
    });
  };

  const selectedAssignments = assignments.filter(a => selectedIds.has(a.assignmentId));
  const totalAmount = selectedAssignments.reduce((sum, a) => sum + a.bankAbsorbAmount, 0);

  const handleSaveDraft = async () => {
    const result = await createInvoice({
      assignmentIds: Array.from(selectedIds),
      notes: notes || undefined,
    });
    navigate(`/ext/invoices/${result.id}`);
  };

  const handleSaveAndSubmit = async () => {
    const result = await createInvoice({
      assignmentIds: Array.from(selectedIds),
      notes: notes || undefined,
    });
    try {
      await submitInvoice(result.id);
    } catch {
      // Draft was saved but submit failed — navigate to draft so user can retry submission
    }
    navigate(`/ext/invoices/${result.id}`);
  };

  const isActionPending = isCreating || isSubmitting;

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-12 text-red-500" />
        <p className="text-gray-600">Failed to load eligible assignments</p>
        <p className="text-sm text-gray-400">{(error as Error)?.message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/ext/invoices')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Icon style="solid" name="chevron-left" className="size-4" />
            </button>
            <h3 className="text-sm font-semibold text-gray-900">Create Invoice</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 ml-7">
            Select assignments to include in this invoice
          </p>
        </div>
      </div>

      {/* Assignments Table */}
      <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <tr className="border-b border-gray-200">
                <th className="px-4 py-2.5 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => {
                      if (el) el.indeterminate = someSelected;
                    }}
                    onChange={toggleSelectAll}
                    disabled={assignments.length === 0}
                    className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                  />
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Appraisal No.
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Customer Name</th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5">Product Type</th>
                <th className="text-right font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Bank Absorb Amount
                </th>
                <th className="text-left font-medium text-gray-600 px-4 py-2.5 whitespace-nowrap">
                  Received Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <TableRowSkeleton
                  columns={[
                    { width: 'w-6' },
                    { width: 'w-28' },
                    { width: 'w-40' },
                    { width: 'w-24' },
                    { width: 'w-28' },
                    { width: 'w-24' },
                  ]}
                  rows={5}
                />
              ) : assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <div className="flex flex-col items-center gap-2">
                      <Icon style="regular" name="folder-open" className="size-10 text-gray-300" />
                      <p className="text-gray-500 font-medium">No eligible assignments</p>
                      <p className="text-xs text-gray-400">
                        Assignments with bank-absorbed fees that have not yet been invoiced will
                        appear here
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                assignments.map(item => {
                  const isSelected = selectedIds.has(item.assignmentId);
                  return (
                    <tr
                      key={item.assignmentId}
                      onClick={() => toggleItem(item.assignmentId)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5' : 'hover:bg-gray-50 even:bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(item.assignmentId)}
                          className="rounded border-gray-300 text-primary focus:ring-primary/20 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-2.5 font-medium text-primary whitespace-nowrap">
                        {item.appraisalNumber ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{item.customerName ?? '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{item.productType ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                        {formatCurrency(item.bankAbsorbAmount)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {item.receivedDate
                          ? formatLocaleDate(item.receivedDate, i18n.language)
                          : '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      <div className="shrink-0 bg-white rounded-lg border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add any notes for this invoice..."
          rows={3}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none resize-none"
        />
      </div>

      {/* Summary + Actions */}
      <div className="shrink-0 bg-white rounded-lg border border-gray-200 p-4 flex items-center justify-between gap-4">
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-900">{selectedIds.size}</span> item
          {selectedIds.size !== 1 ? 's' : ''} selected
          {selectedIds.size > 0 && (
            <>
              {' '}
              &middot; Total:{' '}
              <span className="font-semibold text-gray-900">{formatCurrency(totalAmount)}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/ext/invoices')}
            disabled={isActionPending}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={selectedIds.size === 0 || isActionPending}
            isLoading={isCreating && !isSubmitting}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            onClick={handleSaveAndSubmit}
            disabled={selectedIds.size === 0 || isActionPending}
            isLoading={isSubmitting}
          >
            Save &amp; Submit
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ExtCreateInvoicePage;

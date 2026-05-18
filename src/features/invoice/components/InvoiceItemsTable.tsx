import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import Icon from '@/shared/components/Icon';
import type { InvoiceItem } from '../types/invoice';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  /**
   * Hide payment-state columns (Paid / Remaining). Used by the Mark-as-Paid flow
   * where the focus is on the bank-absorb amount being paid, not the customer's
   * outstanding balance.
   */
  hidePaymentColumns?: boolean;
  /**
   * Show the Cost Center column. Only internal-admin surfaces care about cost-center
   * routing — external company users don't need it.
   */
  showCostCenter?: boolean;
  /**
   * Hide the Last Payment column. The internal admin processes the bank-absorb
   * portion; the customer-side last-payment date is not relevant.
   */
  hideLastPayment?: boolean;
}

type SortField =
  | 'appraisalNumber'
  | 'customerName'
  | 'feeBeforeVAT'
  | 'totalFeeAfterVAT'
  | 'payPartialAmount'
  | 'bankAbsorbAmount'
  | 'remainingFee'
  | 'lastPaymentDate'
  | 'submittedDate';

type SortDir = 'asc' | 'desc';

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const compare = (a: InvoiceItem, b: InvoiceItem, field: SortField, dir: SortDir): number => {
  const av = a[field];
  const bv = b[field];
  const aNull = av == null;
  const bNull = bv == null;
  // Nulls always sort last regardless of direction (so empty rows don't drift to the top).
  if (aNull && bNull) return 0;
  if (aNull) return 1;
  if (bNull) return -1;

  let cmp = 0;
  if (typeof av === 'number' && typeof bv === 'number') {
    cmp = av - bv;
  } else {
    cmp = String(av).localeCompare(String(bv));
  }
  return dir === 'asc' ? cmp : -cmp;
};

interface SortableHeaderProps {
  label: string;
  field: SortField;
  active: SortField | null;
  dir: SortDir;
  align?: 'left' | 'right';
  onSort: (field: SortField) => void;
}

// Matches the project-standard sort affordance from the task list (ActivityTaskTable):
// click the entire <th>, primary-colored text + single-chevron icon when active,
// dual-arrow ghost icon when inactive.
const SortableHeader = ({ label, field, active, dir, align = 'left', onSort }: SortableHeaderProps) => {
  const isActive = active === field;
  const iconName = isActive ? (dir === 'asc' ? 'sort-up' : 'sort-down') : 'sort';
  return (
    <th
      onClick={() => onSort(field)}
      className={`font-semibold px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap select-none cursor-pointer hover:text-gray-900 ${
        align === 'right' ? 'text-right' : 'text-left'
      } ${isActive ? 'text-primary' : 'text-gray-600'}`}
    >
      <div className={`inline-flex items-center gap-1 ${align === 'right' ? 'flex-row-reverse' : ''}`}>
        <span>{label}</span>
        <Icon
          style="solid"
          name={iconName}
          className={`size-2.5 ${isActive ? 'text-primary' : 'text-gray-300'}`}
        />
      </div>
    </th>
  );
};

const InvoiceItemsTable = ({
  items,
  hidePaymentColumns = false,
  showCostCenter = false,
  hideLastPayment = false,
}: InvoiceItemsTableProps) => {
  const { i18n, t } = useTranslation('invoice');

  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  // Three-stage cycle: unsorted → asc → desc → unsorted. Clicking a different
  // column restarts the cycle at asc on that column.
  const handleSort = (field: SortField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDir('asc');
      return;
    }
    if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // currently desc → clear
      setSortField(null);
      setSortDir('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortField) return items;
    return [...items].sort((a, b) => compare(a, b, sortField, sortDir));
  }, [items, sortField, sortDir]);

  const sumFee = items.reduce((s, i) => s + i.feeBeforeVAT, 0);
  const sumTotal = items.reduce((s, i) => s + i.totalFeeAfterVAT, 0);
  const sumPaid = items.reduce((s, i) => s + i.payPartialAmount, 0);
  const sumBankAbsorb = items.reduce((s, i) => s + i.bankAbsorbAmount, 0);
  const sumRemaining = items.reduce((s, i) => s + i.remainingFee, 0);

  const headColCount =
    (hidePaymentColumns ? 9 : 11) +
    (showCostCenter ? 1 : 0) -
    (hideLastPayment ? 1 : 0);

  return (
    <div className="overflow-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr className="border-b-2 border-gray-300">
            <th className="text-center font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide w-10">#</th>
            <SortableHeader
              label={t('book.col.appraisalReportNo')}
              field="appraisalNumber"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              label={t('book.col.customerName')}
              field="customerName"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
            {showCostCenter && (
              <th className="text-left font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap">
                {t('book.col.costCenter')}
              </th>
            )}
            <SortableHeader
              label={t('book.col.feeAmount')}
              field="feeBeforeVAT"
              align="right"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
            <th className="text-right font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide">
              {t('book.col.vat')}
            </th>
            <SortableHeader
              label={t('book.col.totalAmount')}
              field="totalFeeAfterVAT"
              align="right"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
            {!hidePaymentColumns && (
              <SortableHeader
                label={t('book.col.payPartialAmount')}
                field="payPartialAmount"
                align="right"
                active={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
            )}
            <SortableHeader
              label={t('book.col.bankAbsorbAmount')}
              field="bankAbsorbAmount"
              align="right"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
            {!hidePaymentColumns && (
              <SortableHeader
                label={t('book.col.remainingFee')}
                field="remainingFee"
                align="right"
                active={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
            )}
            {!hideLastPayment && (
              <SortableHeader
                label={t('book.col.lastPaymentDate')}
                field="lastPaymentDate"
                active={sortField}
                dir={sortDir}
                onSort={handleSort}
              />
            )}
            <SortableHeader
              label={t('book.col.submittedDate')}
              field="submittedDate"
              active={sortField}
              dir={sortDir}
              onSort={handleSort}
            />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedItems.length === 0 ? (
            <tr>
              <td colSpan={headColCount} className="text-center py-10 text-gray-400 text-xs">
                {t('draft.noItems')}
              </td>
            </tr>
          ) : (
            sortedItems.map((item, index) => (
              <tr key={item.id} className="even:bg-gray-50/50">
                <td className="px-4 py-2.5 text-center text-gray-400 tabular-nums">
                  {index + 1}
                </td>
                <td className="px-4 py-2.5 font-medium text-primary whitespace-nowrap">
                  {item.appraisalNumber ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{item.customerName ?? '—'}</td>
                {showCostCenter && (
                  <td className="px-4 py-2.5 text-gray-400 whitespace-nowrap italic">
                    {t('book.col.notAvailable')}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                  {formatCurrency(item.feeBeforeVAT)}
                </td>
                <td className="px-4 py-2.5 text-right text-gray-600 tabular-nums whitespace-nowrap">
                  {formatCurrency(item.vatAmount)}{' '}
                  <span className="text-gray-400">({item.vatRate}%)</span>
                </td>
                <td className="px-4 py-2.5 text-right font-medium text-gray-900 tabular-nums whitespace-nowrap">
                  {formatCurrency(item.totalFeeAfterVAT)}
                </td>
                {!hidePaymentColumns && (
                  <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                    {formatCurrency(item.payPartialAmount)}
                  </td>
                )}
                <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                  {formatCurrency(item.bankAbsorbAmount)}
                </td>
                {!hidePaymentColumns && (
                  <td className="px-4 py-2.5 text-right text-gray-700 tabular-nums whitespace-nowrap">
                    {formatCurrency(item.remainingFee)}
                  </td>
                )}
                {!hideLastPayment && (
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                    {item.lastPaymentDate
                      ? formatLocaleDate(item.lastPaymentDate, i18n.language)
                      : '—'}
                  </td>
                )}
                <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                  {item.submittedDate
                    ? formatLocaleDate(item.submittedDate, i18n.language)
                    : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
        {items.length > 0 && (
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-300">
              <td
                colSpan={3 + (showCostCenter ? 1 : 0)}
                className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide"
              >
                {t('list.grandTotal')}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-sm">
                {formatCurrency(sumFee)}
              </td>
              <td />
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-sm">
                {formatCurrency(sumTotal)}
              </td>
              {!hidePaymentColumns && (
                <td className="px-4 py-2.5 text-right font-semibold text-gray-700 tabular-nums whitespace-nowrap text-sm">
                  {formatCurrency(sumPaid)}
                </td>
              )}
              <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums whitespace-nowrap text-sm">
                {formatCurrency(sumBankAbsorb)}
              </td>
              {!hidePaymentColumns && (
                <td className="px-4 py-2.5 text-right font-semibold text-gray-700 tabular-nums whitespace-nowrap text-sm">
                  {formatCurrency(sumRemaining)}
                </td>
              )}
              <td colSpan={hideLastPayment ? 1 : 2} />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default InvoiceItemsTable;

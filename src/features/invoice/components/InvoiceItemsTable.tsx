import { useTranslation } from 'react-i18next';
import { formatLocaleDate } from '@/shared/utils/dateUtils';
import type { InvoiceItem } from '../types/invoice';

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
}

const formatCurrency = (amount: number) =>
  `฿${amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}`;

const InvoiceItemsTable = ({ items }: InvoiceItemsTableProps) => {
  const { i18n, t } = useTranslation('invoice');

  return (
    <div className="overflow-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 sticky top-0">
          <tr className="border-b-2 border-gray-300">
            <th className="text-center font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide w-10">#</th>
            <th className="text-left font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap">
              {t('book.col.appraisalReportNo')}
            </th>
            <th className="text-left font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide">
              {t('book.col.customerName')}
            </th>
            <th className="text-right font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap">
              {t('book.col.feeAmount')}
            </th>
            <th className="text-right font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide">
              {t('book.col.vat')}
            </th>
            <th className="text-right font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap">
              {t('book.col.totalAmount')}
            </th>
            <th className="text-left font-semibold text-gray-600 px-4 py-2.5 text-xs uppercase tracking-wide whitespace-nowrap">
              {t('book.col.submittedDate')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                {t('draft.noItems')}
              </td>
            </tr>
          ) : (
            items.map((item, index) => (
              <tr key={item.id} className="even:bg-gray-50/50">
                <td className="px-4 py-2.5 text-center text-gray-400 tabular-nums">
                  {index + 1}
                </td>
                <td className="px-4 py-2.5 font-medium text-primary whitespace-nowrap">
                  {item.appraisalNumber ?? '—'}
                </td>
                <td className="px-4 py-2.5 text-gray-700">{item.customerName ?? '—'}</td>
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
              <td colSpan={3} className="px-4 py-2.5 text-xs font-semibold text-gray-600 uppercase tracking-wide">
                {t('list.grandTotal')}
              </td>
              <td className="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums whitespace-nowrap text-sm">
                {formatCurrency(items.reduce((s, i) => s + i.feeBeforeVAT, 0))}
              </td>
              <td />
              <td className="px-4 py-2.5 text-right font-bold text-primary tabular-nums whitespace-nowrap text-sm">
                {formatCurrency(items.reduce((s, i) => s + i.bankAbsorbAmount, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export default InvoiceItemsTable;

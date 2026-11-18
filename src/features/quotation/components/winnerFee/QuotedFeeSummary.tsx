import { useTranslation } from 'react-i18next';
import type { CompanyQuotationItemDto } from '../../schemas/quotation';
import { deriveFeeTotals } from '../QuotationFeeBreakdown';
import { splitPayment } from '../../utils/winnerFee';

const amount = new Intl.NumberFormat('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface QuotedFeeSummaryProps {
  item: CompanyQuotationItemDto;
  maxDays?: number | null;
  bankAbsorbAmount: number | null;
  isFullAbsorb: boolean;
}

const Line = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-(--palette-ink-2)">{label}</span>
    <span className="tabular-nums">{value}</span>
  </div>
);

/** One company's quote for one appraisal, with the bank / customer split. */
const QuotedFeeSummary = ({
  item,
  maxDays,
  bankAbsorbAmount,
  isFullAbsorb,
}: QuotedFeeSummaryProps) => {
  const { t } = useTranslation('quotation');
  const { vatAmount } = deriveFeeTotals(
    item.feeAmount,
    item.discount,
    item.negotiatedDiscount,
    item.vatPercent,
  );
  const { bankPays, customerPays } = splitPayment(item.quotedPrice, bankAbsorbAmount, isFullAbsorb);
  const discount = item.discount + (item.negotiatedDiscount ?? 0);
  const daysOver = maxDays != null ? item.estimatedDays - maxDays : 0;

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-(--palette-line) bg-(--palette-surface) p-3 text-sm">
      <Line label={t('winnerFee.feeAmount')} value={amount.format(item.feeAmount)} />
      <Line
        label={t('winnerFee.discount')}
        value={`${discount > 0 ? '−' : ''} ${amount.format(discount)}`}
      />
      <Line
        label={t('winnerFee.vat', { percent: item.vatPercent })}
        value={`+ ${amount.format(vatAmount)}`}
      />
      <Line label={t('winnerFee.net')} value={amount.format(item.quotedPrice)} />
      {bankPays > 0 && (
        <div className="mt-1 flex items-center justify-between gap-3 border-t border-(--palette-line-soft) pt-1.5">
          <span>{t('winnerFee.bankAbsorb')}</span>
          <span className="tabular-nums">
            {bankPays > 0 && '−'} {amount.format(bankPays)}
          </span>
        </div>
      )}
      <div className="mt-1 flex items-center justify-between gap-3 border-t border-(--palette-line-soft) pt-1.5 font-semibold text-(--palette-ink)">
        <span>{t('winnerFee.customerPays')}</span>
        <span className="tabular-nums">{amount.format(customerPays)}</span>
      </div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-(--palette-ink-2)">{t('winnerFee.mandays')}</span>
        <span className={daysOver > 0 ? 'text-danger-600' : 'text-(--palette-ink)'}>
          {item.estimatedDays}
          {daysOver !== 0 && (
            <span className={daysOver > 0 ? 'ml-0.5' : 'ml-0.5 text-primary'}>
              ({Math.abs(daysOver)} {daysOver > 0 ? '↑' : '↓'})
            </span>
          )}
        </span>
      </div>
      {item.itemNotes && (
        <p className="truncate text-xs text-(--palette-ink-2)" title={item.itemNotes}>
          {t('winnerFee.remarks')}: {item.itemNotes}
        </p>
      )}
    </div>
  );
};

export default QuotedFeeSummary;

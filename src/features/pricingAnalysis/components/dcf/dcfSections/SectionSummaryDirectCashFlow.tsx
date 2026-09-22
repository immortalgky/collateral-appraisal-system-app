import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import { RHFInputCell } from '../../table/RHFInputCell';
import { STK2_CLASS, STK2_CLASS_FLEX, STK_CLASS, YEAR_CELL_CLASS } from '../dcfTableCellStyles';

interface SectionSummaryDirectCashFlowProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
export function SectionSummaryDirectCashFlow({
  name,
  totalNumberOfYears,
  isReadOnly,
}: SectionSummaryDirectCashFlowProps) {
  return (
    <SummarySectionTable
      name={name}
      totalNumberOfYears={totalNumberOfYears}
      isReadOnly={isReadOnly}
    />
  );
}

interface SummarySectionTableProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
function SummarySectionTable({ name, totalNumberOfYears, isReadOnly }: SummarySectionTableProps) {
  const { t } = useTranslation('pricingAnalysis');
  const rowHover = 'hover:bg-secondary/10';
  const rowStk = clsx(STK_CLASS, 'bg-white', rowHover);
  const rowStk2 = clsx(STK2_CLASS, 'bg-white', rowHover);
  const rowYear = clsx(YEAR_CELL_CLASS, 'bg-white text-gray-700', rowHover);

  return (
    <>
      {/* last section */}
      <tr>
        <td className={rowStk} title={t('dcf.summaryDCF.contractRentalFee')}>{t('dcf.summaryDCF.contractRentalFee')}</td>
        <td className={rowStk2} />
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={rowYear}>
            <RHFInputCell
              fieldName={`${name}.contractRentalFee.${idx}`}
              inputType="display"
              accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
            />
          </td>
        ))}
      </tr>
      <tr>
        <td className={rowStk} title={t('dcf.summaryDCF.noiGrossRevenue')}>{t('dcf.summaryDCF.noiGrossRevenue')}</td>
        <td className={clsx(STK2_CLASS_FLEX, 'bg-white', rowHover)}>
          <div className="flex flex-row gap-1 items-center">
            <div className="w-14">
              <RHFInputCell
                fieldName="capitalizeRate"
                inputType="number"
                disabled={isReadOnly}
                number={{
                  decimalPlaces: 2,
                  maxIntegerDigits: 5,
                  maxValue: 100,
                  allowNegative: false,
                }}
              />
            </div>
            <span className="text-[11px] text-gray-500">%</span>
          </div>
        </td>
        <td className={rowYear}>
          <RHFInputCell
            fieldName={`${name}.totalNet`}
            inputType="display"
            accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
          />
        </td>
        {Array.from({ length: Math.max(totalNumberOfYears - 1, 0) }, (_, idx) => (
          <td key={idx} className={rowYear} />
        ))}
      </tr>
      <tr>
        <td className={clsx(STK_CLASS, 'bg-gray-100 font-bold border-t border-gray-400')} title={t('dcf.summaryDCF.finalValue')}>
          {t('dcf.summaryDCF.finalValue')}
        </td>
        <td className={clsx(STK2_CLASS, 'bg-gray-100 font-bold border-t border-gray-400')}>
          <RHFInputCell
            fieldName={`${name}.presentValue`}
            inputType="display"
            accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : ''}</span>}
          />
        </td>
        <td
          colSpan={totalNumberOfYears}
          className="px-[8px] py-0 h-[26px] text-[12px] leading-[25px] bg-gray-100 border-t border-gray-400"
        />
      </tr>
    </>
  );
}

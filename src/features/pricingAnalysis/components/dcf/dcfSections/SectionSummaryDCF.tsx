import clsx from 'clsx';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SectionHeader } from './DynamicSection';
import { RHFInputCell } from '../../table/RHFInputCell';
import { STK2_CLASS, STK2_CLASS_FLEX, STK_CLASS, YEAR_CELL_CLASS } from '../dcfTableCellStyles';

interface SectionSummaryDCFProps {
  name: string;
  totalNumberOfYears: number;
  isReadOnly?: boolean;
}
export function SectionSummaryDCF({
  name,
  totalNumberOfYears,
  isReadOnly,
}: SectionSummaryDCFProps) {
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
  // mock tableDCF(): band('dcfval', 'มูลค่าปัจจุบัน') wraps Terminal → PV; collapsible.
  const [pvOpen, setPvOpen] = useState(true);
  // Plain row (mock's row(), cls='') — stk label + empty/muted stk2 + per-year values.
  const rowStk = clsx(STK_CLASS, 'bg-white');
  const rowStk2 = clsx(STK2_CLASS, 'bg-white text-gray-400');
  const rowYear = clsx(YEAR_CELL_CLASS, 'bg-white text-gray-700');
  // 'tot' row (mock: font-weight 600, bg var(--surface-2)).
  const totStk = clsx(STK_CLASS, 'bg-gray-50 font-semibold');
  const totStk2 = clsx(STK2_CLASS, 'bg-gray-50');
  const totYear = clsx(YEAR_CELL_CLASS, 'bg-gray-50 font-semibold text-gray-700');

  return (
    <>
      {/* last section */}
      <tr>
        <td className={rowStk} title={t('dcf.summaryDCF.contractRentalFee')}>
          {t('dcf.summaryDCF.contractRentalFee')}
        </td>
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
        <td className={totStk} title={t('dcf.summaryDCF.noiGrossRevenue')}>
          {t('dcf.summaryDCF.noiGrossRevenue')}
        </td>
        {/* mock's `as` param on this row is "EBITDA" — a muted marker in stk2, not a value. */}
        <td className={clsx(totStk2, 'text-[11px] text-gray-400')}>EBITDA</td>
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={totYear}>
            <div className="text-right">
              <RHFInputCell
                fieldName={`${name}.grossRevenue.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      {/* mock's dtl2 (muted, 11px) — the NOI ratio sub-line under NOI. */}
      <tr>
        <td
          className={clsx(STK_CLASS, 'bg-white text-[11px] text-gray-400')}
          title={t('dcf.summaryDCF.noiGrossRevenueRatio')}
        >
          {t('dcf.summaryDCF.noiGrossRevenueRatio')}
        </td>
        <td className={clsx(STK2_CLASS, 'bg-white')} />
        {Array.from({ length: totalNumberOfYears }, (_, idx) => (
          <td key={idx} className={clsx(YEAR_CELL_CLASS, 'bg-white text-[11px] text-gray-400')}>
            <div className="text-right">
              <RHFInputCell
                fieldName={`${name}.grossRevenueProportional.${idx}`}
                inputType="display"
                accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
              />
            </div>
          </td>
        ))}
      </tr>
      <SectionHeader
        title={t('methodTabs.dcf.presentValueBand')}
        totalNumberOfYears={totalNumberOfYears}
        open={pvOpen}
        onToggle={() => setPvOpen(o => !o)}
      />
      {pvOpen && (
        <>
          <tr>
            <td className={rowStk} title={t('dcf.summaryDCF.terminalRevenue')}>
              {t('dcf.summaryDCF.terminalRevenue')}
            </td>
            {/* mock puts the cap-rate control in stk2 (`<span class="fc">cap {input}%</span>`),
            not sharing the label cell with a justify-between flex row. */}
            <td className={clsx(STK2_CLASS_FLEX, 'bg-white')}>
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
            {Array.from({ length: totalNumberOfYears }, (_, idx) => {
              return (
                <td key={idx} className={rowYear}>
                  {idx === totalNumberOfYears - 2 && (
                    <RHFInputCell
                      fieldName={`${name}.terminalRevenue.${idx}`}
                      inputType="display"
                      accessor={({ value }) => (
                        <span>{value ? Number(value).toLocaleString() : 0}</span>
                      )}
                    />
                  )}
                </td>
              );
            })}
          </tr>
          <tr>
            <td className={totStk} title={t('dcf.summaryDCF.totalNetCashflow')}>
              {t('dcf.summaryDCF.totalNetCashflow')}
            </td>
            <td className={totStk2} />
            {Array.from({ length: totalNumberOfYears }, (_, idx) => (
              <td key={idx} className={totYear}>
                {idx !== totalNumberOfYears - 1 && (
                  <RHFInputCell
                    fieldName={`${name}.totalNet.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span>{value ? Number(value).toLocaleString() : 0}</span>
                    )}
                  />
                )}
              </td>
            ))}
          </tr>
          <tr>
            <td className={rowStk} title={t('dcf.summaryDCF.discountRate')}>
              {t('dcf.summaryDCF.discountRate')}
            </td>
            <td className={clsx(STK2_CLASS_FLEX, 'bg-white')}>
              <div className="flex flex-row gap-1 items-center">
                <div className="w-14">
                  <RHFInputCell
                    fieldName="discountedRate"
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
            {Array.from({ length: totalNumberOfYears }, (_, idx) => (
              <td key={idx} className={rowYear}>
                <RHFInputCell
                  fieldName={`${name}.discount.${idx}`}
                  inputType="display"
                  accessor={({ value }) => <span>{value ? Number(value).toFixed(6) : ''}</span>}
                />
              </td>
            ))}
          </tr>
          <tr>
            <td className={totStk} title={t('dcf.summaryDCF.presentValueOfCashflows')}>
              {t('dcf.summaryDCF.presentValueOfCashflows')}
            </td>
            <td className={totStk2} />
            {Array.from({ length: totalNumberOfYears }, (_, idx) => (
              <td key={idx} className={totYear}>
                {idx !== totalNumberOfYears - 1 && (
                  <RHFInputCell
                    fieldName={`${name}.presentValue.${idx}`}
                    inputType="display"
                    accessor={({ value }) => (
                      <span>{value ? Number(value).toLocaleString() : 0}</span>
                    )}
                  />
                )}
              </td>
            ))}
          </tr>
        </>
      )}
      {/* Final Value — mock's tr.fin: font-weight 700, bg surface-2, border-top separating
          it from the row above. stk2 holds the value itself (not empty/muted) here. */}
      <tr>
        <td
          className={clsx(STK_CLASS, 'bg-gray-100 font-bold border-t border-gray-400')}
          title={t('dcf.summaryDCF.finalValue')}
        >
          {t('dcf.summaryDCF.finalValue')}
        </td>
        <td className={clsx(STK2_CLASS, 'bg-gray-100 font-bold border-t border-gray-400')}>
          <RHFInputCell
            fieldName={'finalValue'}
            inputType="display"
            accessor={({ value }) => <span>{value ? Number(value).toLocaleString() : 0}</span>}
          />
        </td>
        <td
          colSpan={totalNumberOfYears}
          className="px-[8px] py-0 h-[26px] text-[12px] leading-[25px] bg-gray-100 border-t border-gray-400 text-gray-400"
        />
      </tr>
    </>
  );
}

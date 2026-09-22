import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import type { LeaseholdTableResult } from '../domain/calculateLeasehold';

interface LeaseholdTableProps {
  result: LeaseholdTableResult;
  /** Appointment date — first year column's second line prefixes it (mock:2506 `tableLH`,
   * `t===0?'18/09/':''`); every other column shows the bare Buddhist year. */
  appraisalDate?: string;
  /** Forwarded to the scroll container — e.g. `flex-1 min-h-0` when this table sits in
   * a bounded-height column (MethodWorkArea's main column) instead of a page scroll. */
  className?: string;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPv = (n: number) => n.toFixed(2);

/** "18/09/" — day/month of the appraisal date, trailing slash included so the mock's
 * `${t===0?'18/09/':''}${year}` concatenation reads as a single literal string. */
const dayMonthSlash = (dateStr: string): string => {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/`;
};

export function LeaseholdTable({ result, appraisalDate, className }: LeaseholdTableProps) {
  const { rows } = result;

  const { t } = useTranslation('pricingAnalysis');
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const colHl = 'bg-blue-50/60';

  // Border/background hex values are the mock's --line-soft/--line/--line-strong/--surface-2/
  // --ink/--ink-2 tokens verbatim (mock:271-276 kpis aside — the .g rules are further up its
  // stylesheet) — Tailwind v4's palette is OKLCH so named grays don't equal these hexes.
  const stickyCell =
    'sticky left-0 z-10 bg-white px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2] pa-sticky-edge';
  const stickyCellBold =
    'sticky left-0 z-10 bg-[#f8fafa] px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2] border-t border-t-[#cbd5d3] pa-sticky-edge';

  const dataCls = (col: number) =>
    `px-[8px] py-0 h-[26px] text-right text-gray-700 border-b border-b-[#eef2f2] border-r border-r-[#eef2f2] ${hoveredCol === col ? colHl : ''}`;
  const dataBoldCls = (col: number) =>
    `px-[8px] py-0 h-[26px] text-right text-gray-800 font-bold border-b border-b-[#eef2f2] border-r border-r-[#eef2f2] border-t border-t-[#cbd5d3] ${hoveredCol === col ? colHl : ''}`;
  // `.g th.yr` (mock CSS) — two-line year header: shorter line-height and padding,
  // plus its own min-width.
  const yearHeadCls = (col: number) =>
    `px-[8px] py-[4px] leading-[14px] text-right text-[#55636f] font-medium min-w-[96px] bg-[#f8fafa] border-b border-b-[#e3e9e8] border-r border-r-[#eef2f2] ${hoveredCol === col ? colHl : ''}`;

  const cp = (col: number) => ({
    onMouseEnter: () => setHoveredCol(col),
    onMouseLeave: () => setHoveredCol(null),
  });

  // Buddhist year of the appraisal date's own calendar year; column i's year is
  // Y0 + i (mock:2506 `LH_Y0 + t`) — each column is one elapsed year of the schedule.
  const buddhistYear0 = appraisalDate ? new Date(appraisalDate).getFullYear() + 543 : null;

  return (
    <ScrollableTableContainer
      edgeShadow
      columnNavSelector="thead th[data-nav-col]"
      stickyWidth={360}
      className={className}
    >
      <table
        className="w-full text-[12px] leading-[25px] border-separate border-spacing-0 tabular-nums"
        onMouseLeave={() => setHoveredCol(null)}
      >
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[#f8fafa] px-[8px] py-0 h-[26px] leading-[26px] text-left text-[#55636f] font-medium min-w-[360px] border-b border-b-[#e3e9e8] pa-sticky-edge">
              {t('leasehold.table.year')}
            </th>
            {rows.map((r, i) => (
              <th key={r.year} data-nav-col className={yearHeadCls(i)} {...cp(i)}>
                {r.year.toFixed(1)}
                {buddhistYear0 != null && (
                  <span className="block text-[10px] text-[#8a96a0] font-normal leading-[12px]">
                    {i === 0 && appraisalDate ? dayMonthSlash(appraisalDate) : ''}
                    {buddhistYear0 + i}
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Detail label row */}
          <tr className="bg-gray-100">
            <td className="sticky left-0 z-10 bg-gray-100 px-[8px] py-0 h-[26px] border-b border-b-[#eef2f2] pa-sticky-edge">
              <span className="text-gray-700 font-semibold">{t('leasehold.table.detail')}</span>
            </td>
            {rows.map((r, i) => (
              <td
                key={r.year}
                className={`border-b border-b-[#eef2f2] border-r border-r-[#eef2f2] bg-gray-100 ${hoveredCol === i ? colHl : ''}`}
                {...cp(i)}
              />
            ))}
          </tr>

          {/* Land Value */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="font-medium text-gray-700">{t('leasehold.table.landValue')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {fmt(r.landValue)}
              </td>
            ))}
          </tr>

          {/* Land Growth (%) */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.landGrowthPercent')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {i > 0 && r.landGrowthPercent !== 0 ? `${r.landGrowthPercent.toFixed(2)} %` : ''}
              </td>
            ))}
          </tr>

          {/* Building Value */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.buildingValue')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {r.buildingValue ? fmt(r.buildingValue) : ''}
              </td>
            ))}
          </tr>

          {/* Depreciation (%) */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.depreciationPercent')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {r.depreciationPercent !== 0 ? `${r.depreciationPercent.toFixed(2)} %` : ''}
              </td>
            ))}
          </tr>

          {/* Depreciation Amount */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.depreciationAmount')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {r.depreciationAmount ? fmt(r.depreciationAmount) : ''}
              </td>
            ))}
          </tr>

          {/* Building value after depreciation */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">
                {t('leasehold.table.buildingAfterDepreciation')}
              </span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {r.buildingAfterDepreciation ? fmt(r.buildingAfterDepreciation) : ''}
              </td>
            ))}
          </tr>

          {/* Total value of land and buildings */}
          <tr className="bg-[#f8fafa] font-bold">
            <td className={stickyCellBold}>
              <span className="text-gray-800 font-bold">
                {t('leasehold.table.totalLandAndBuilding')}
              </span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataBoldCls(i)} {...cp(i)}>
                {fmt(r.totalLandAndBuilding)}
              </td>
            ))}
          </tr>

          {/* Rental Income */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.rentalIncome')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {fmt(r.rentalIncome)}
              </td>
            ))}
          </tr>

          {/* PV Factor */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">{t('leasehold.table.pvFactor')}</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {fmtPv(r.pvFactor)}
              </td>
            ))}
          </tr>

          {/* Net Current Rental Income */}
          <tr className="bg-[#f8fafa] font-bold">
            <td className={stickyCellBold}>
              <span className="text-gray-800 font-bold">
                {t('leasehold.table.netCurrentRentalIncome')}
              </span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataBoldCls(i)} {...cp(i)}>
                {fmt(r.netCurrentRentalIncome)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </ScrollableTableContainer>
  );
}

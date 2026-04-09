import { useState } from 'react';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import type { LeaseholdTableResult } from '../domain/calculateLeasehold';

interface LeaseholdTableProps {
  result: LeaseholdTableResult;
}

const fmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPv = (n: number) => n.toFixed(2);

export function LeaseholdTable({ result }: LeaseholdTableProps) {
  const { rows, totalIncomeOverLeaseTerm, valueAtLeaseExpiry, finalValue, finalValueRounded } =
    result;

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const colHl = 'bg-blue-50/60';

  const stickyCell = 'sticky left-0 z-10 bg-white px-3 py-1.5 border-b border-gray-100';
  const stickyCellBold = 'sticky left-0 z-10 bg-gray-50 px-3 py-1.5 border-b border-gray-200';

  const dataCls = (col: number) =>
    `px-3 py-1.5 text-right text-gray-700 border-b border-gray-100 ${hoveredCol === col ? colHl : ''}`;
  const dataBoldCls = (col: number) =>
    `px-3 py-1.5 text-right text-gray-800 font-medium border-b border-gray-200 ${hoveredCol === col ? colHl : ''}`;
  const headCls = (col: number) =>
    `px-3 py-2 text-right text-gray-600 font-medium min-w-[130px] border-b border-gray-200 ${hoveredCol === col ? colHl : ''}`;

  const cp = (col: number) => ({
    onMouseEnter: () => setHoveredCol(col),
    onMouseLeave: () => setHoveredCol(null),
  });

  return (
    <>
    <ScrollableTableContainer>
      <table className="w-full text-xs border-collapse" onMouseLeave={() => setHoveredCol(null)}>
        <thead>
          <tr className="bg-gray-50">
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left text-gray-600 font-medium min-w-[360px] border-b border-gray-200">
              Year
            </th>
            {rows.map((r, i) => (
              <th key={r.year} className={headCls(i)} {...cp(i)}>
                {r.year}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Detail label row */}
          <tr className="bg-gray-100">
            <td className="sticky left-0 z-10 bg-gray-100 px-3 py-1.5 border-b border-gray-200">
              <span className="text-gray-700 font-semibold">Detail</span>
            </td>
            {rows.map((r, i) => (
              <td
                key={r.year}
                className={`border-b border-gray-200 bg-gray-100 ${hoveredCol === i ? colHl : ''}`}
                {...cp(i)}
              />
            ))}
          </tr>

          {/* Land Value */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="font-medium text-gray-700">Land Value</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                <div>{fmt(r.landValue)}</div>
                {i > 0 && r.landGrowthPercent !== 0 && (
                  <div className="text-[10px] text-gray-400 mt-0.5">{r.landGrowthPercent.toFixed(2)} %</div>
                )}
              </td>
            ))}
          </tr>

          {/* Building Value */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">Building Value</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>{r.buildingValue ? fmt(r.buildingValue) : ''}</td>
            ))}
          </tr>

          {/* Depreciation */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">Depreciation</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>
                {r.depreciationAmount ? (
                  <>
                    <div>{fmt(r.depreciationAmount)}</div>
                    {r.depreciationPercent !== 0 && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{r.depreciationPercent.toFixed(2)} %</div>
                    )}
                  </>
                ) : ''}
              </td>
            ))}
          </tr>

          {/* Building value after depreciation */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">Building after depreciation</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>{r.buildingAfterDepreciation ? fmt(r.buildingAfterDepreciation) : ''}</td>
            ))}
          </tr>

          {/* Total value of land and buildings */}
          <tr className="bg-gray-50 font-medium">
            <td className={stickyCellBold}>
              <span className="text-gray-800 font-semibold">Total value of land and buildings</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataBoldCls(i)} {...cp(i)}>{fmt(r.totalLandAndBuilding)}</td>
            ))}
          </tr>

          {/* Rental Income */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">Rental income</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>{fmt(r.rentalIncome)}</td>
            ))}
          </tr>

          {/* PV Factor */}
          <tr className="hover:bg-gray-50/50">
            <td className={stickyCell}>
              <span className="text-gray-700">PV Factor</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataCls(i)} {...cp(i)}>{fmtPv(r.pvFactor)}</td>
            ))}
          </tr>

          {/* Net Current Rental Income */}
          <tr className="bg-gray-50 font-medium">
            <td className={stickyCellBold}>
              <span className="text-gray-800 font-semibold">Net Current Rental Income</span>
            </td>
            {rows.map((r, i) => (
              <td key={r.year} className={dataBoldCls(i)} {...cp(i)}>{fmt(r.netCurrentRentalIncome)}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </ScrollableTableContainer>

    {/* Summary — outside scroll container */}
    <div className="text-xs border-t border-gray-300">
      <div className="flex bg-gray-50 border-b border-gray-200">
        <div className="px-3 py-2 text-gray-800 font-medium min-w-[360px]">Total income over the lease term</div>
        <div className="px-3 py-2 text-right text-gray-800 font-medium flex-1">{fmt(totalIncomeOverLeaseTerm)}</div>
      </div>
      <div className="flex bg-gray-50 border-b border-gray-200">
        <div className="px-3 py-2 text-gray-800 font-medium min-w-[360px]">Total value of land and buildings when the lease expires</div>
        <div className="px-3 py-2 text-right text-gray-800 font-medium flex-1">{fmt(valueAtLeaseExpiry)}</div>
      </div>
      <div className="flex bg-gray-100 border-b border-gray-200">
        <div className="px-3 py-2 text-gray-900 font-semibold min-w-[360px]">Final Value</div>
        <div className="px-3 py-2 text-right text-gray-900 font-semibold flex-1">{fmt(finalValue)}</div>
      </div>
      <div className="flex bg-gray-200">
        <div className="px-3 py-2 text-gray-900 font-bold min-w-[360px]">Final Value (Rounded)</div>
        <div className="px-3 py-2 text-right text-gray-900 font-bold text-sm flex-1">{fmt(finalValueRounded)}</div>
      </div>
    </div>
    </>
  );
}

import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { LeaseholdTableResult } from '../domain/calculateLeasehold';

interface LeaseholdChartProps {
  result: LeaseholdTableResult;
}

const fmtCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtTooltip = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function IncomeTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  const rental = row.rentalIncome ?? 0;
  const netPv = row.netPvRental ?? 0;
  const cumPct = row.cumulativePvPct ?? 0;
  const reversion = row.reversionPvToday ?? 0;
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="text-gray-500 mb-1">Year {Number(label).toFixed(1)}</div>
      <div style={{ color: '#f97316' }}>Rental Income: {fmtTooltip(rental)}</div>
      <div style={{ color: '#22c55e' }}>Net PV Rental: {fmtTooltip(netPv)}</div>
      <div className="border-t border-gray-100 mt-1 pt-1 font-medium text-gray-700">
        Cumulative PV: {cumPct.toFixed(1)}%
      </div>
      <div style={{ color: '#6366f1' }} className="text-[10px]">
        + Reversion PV (constant): {fmtTooltip(reversion)}
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PropertyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  // The full data row is always available on payload[0].payload, even for
  // fields that aren't bound to a chart series.
  const row = payload[0]?.payload ?? {};
  const landPv = row.landValuePv ?? 0;
  const buildingPv = row.buildingAfterDeprePv ?? 0;
  const totalPv = landPv + buildingPv;
  const landNominal = row.landValue ?? 0;
  const buildingNominal = row.buildingAfterDepre ?? 0;
  const totalNominal = landNominal + buildingNominal;
  const encumbered = row.encumberedCollateralValue ?? 0;
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="text-gray-500 mb-1">Year {Number(label).toFixed(1)}</div>
      <div style={{ color: '#22c55e' }}>Land (PV today): {fmtTooltip(landPv)}</div>
      <div style={{ color: '#3b82f6' }}>Building (PV today): {fmtTooltip(buildingPv)}</div>
      <div className="font-medium text-gray-700">Total L&B (PV today): {fmtTooltip(totalPv)}</div>
      <div className="border-t border-gray-100 mt-1 pt-1 text-[10px] text-gray-400">
        <div>Land (nominal): {fmtTooltip(landNominal)}</div>
        <div>Building (nominal): {fmtTooltip(buildingNominal)}</div>
        <div>Total L&B (nominal): {fmtTooltip(totalNominal)}</div>
      </div>
      <div className="border-t border-gray-100 mt-1 pt-1" style={{ color: '#6366f1' }}>
        <span className="font-medium">Encumbered Collateral: {fmtTooltip(encumbered)}</span>
        <div className="text-[10px] text-gray-500 font-normal">PV(remaining rent) + PV(reversion)</div>
      </div>
    </div>
  );
}

/** Generate integer year ticks across the chart's year range (every 5y by default). */
function buildYearTicks(minYear: number, maxYear: number, step = 5): number[] {
  const start = Math.ceil(minYear);
  const end = Math.floor(maxYear);
  const ticks: number[] = [];
  for (let y = start; y <= end; y += step) ticks.push(y);
  if (ticks[ticks.length - 1] !== end) ticks.push(end);
  return ticks;
}

export function LeaseholdChart({ result }: LeaseholdChartProps) {
  const rows = result.rows;
  const totalNetPv = rows.reduce((sum, r) => sum + r.netCurrentRentalIncome, 0);

  // Derive a discount factor from the LAST row's PV/nominal rent ratio.
  // Used to discount the reversion (property at lease end) back to today's PV.
  const lastRow = rows[rows.length - 1];
  const lastPvFactor =
    lastRow && lastRow.rentalIncome > 0
      ? lastRow.netCurrentRentalIncome / lastRow.rentalIncome
      : 0;
  const reversionPvToday = lastRow ? lastRow.totalLandAndBuilding * lastPvFactor : 0;

  // Composition of total leasehold value (PV today): rent stream + reversion.
  const totalRentPv = totalNetPv;
  const totalLeaseholdValuePv = totalRentPv + reversionPvToday;
  const rentPercent =
    totalLeaseholdValuePv > 0 ? (totalRentPv / totalLeaseholdValuePv) * 100 : 0;
  const reversionPercent =
    totalLeaseholdValuePv > 0 ? (reversionPvToday / totalLeaseholdValuePv) * 100 : 0;

  // Reverse-pass: remaining rent PV from row i to end (in today's money).
  const remainingRentPv: number[] = new Array(rows.length).fill(0);
  let runningTail = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    runningTail += rows[i].netCurrentRentalIncome;
    remainingRentPv[i] = runningTail;
  }

  let cumulative = 0;
  const data = rows.map((r, i) => {
    cumulative += r.netCurrentRentalIncome;
    // Per-row PV factor: derived from this year's rent PV / nominal rent.
    // Used to discount nominal property values back to today's baht so the
    // chart's series are all in the same unit (apples-to-apples for the bank).
    const pvFactor = r.rentalIncome > 0 ? r.netCurrentRentalIncome / r.rentalIncome : 0;
    return {
      year: r.year,
      // Nominal (kept for tooltip secondary section + backwards compat)
      landValue: r.landValue,
      buildingAfterDepre: r.buildingAfterDepreciation,
      totalLandAndBuilding: r.totalLandAndBuilding,
      // PV today (used by the chart Areas)
      landValuePv: r.landValue * pvFactor,
      buildingAfterDeprePv: r.buildingAfterDepreciation * pvFactor,
      totalLandAndBuildingPv: r.totalLandAndBuilding * pvFactor,
      rentalIncome: r.rentalIncome,
      netPvRental: r.netCurrentRentalIncome,
      cumulativePvPct: totalNetPv > 0 ? (cumulative / totalNetPv) * 100 : 0,
      // Bank's recoverable value during the lease (in today's money):
      // PV of all rent remaining + PV of reversion at lease end.
      encumberedCollateralValue: remainingRentPv[i] + reversionPvToday,
      // Constant on every row, but exposed so the tooltip can read it.
      reversionPvToday,
    };
  });

  const firstYear = data[0]?.year ?? 0;
  const lastYear = data[data.length - 1]?.year ?? 0;
  const yearTicks = buildYearTicks(firstYear, lastYear, 5);

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: Property Value */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="text-[11px] font-medium text-gray-500">Collateral Value Over Lease Term</div>
        <div className="text-[9px] text-gray-400 mb-1">All values in today's PV baht</div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }} stackOffset="none">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              type="number"
              domain={[firstYear, lastYear]}
              ticks={yearTicks}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => String(Math.round(v))}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={fmtCompact}
              width={45}
            />
            <Tooltip content={<PropertyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
            <Area
              type="monotone"
              dataKey="buildingAfterDeprePv"
              name="Building (PV today)"
              stackId="property"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="landValuePv"
              name="Total L&B (PV today)"
              stackId="property"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
            <Line
              type="monotone"
              dataKey="encumberedCollateralValue"
              name="Encumbered Collateral (PV today)"
              stroke="#6366f1"
              strokeWidth={2}
              strokeDasharray="4 3"
              dot={false}
            />
            <ReferenceLine
              x={lastYear}
              stroke="#ef4444"
              strokeDasharray="3 3"
              label={{ value: 'Lease End', position: 'insideTopRight', fontSize: 9, fill: '#ef4444' }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Right: Leasehold Value Composition */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="text-[11px] font-medium text-gray-500">Leasehold Value Composition</div>
        <div className="text-[9px] text-gray-400 mb-1">
          Rent: {fmtCompact(totalRentPv)} ({rentPercent.toFixed(0)}%) ·
          Reversion: {fmtCompact(reversionPvToday)} ({reversionPercent.toFixed(0)}%) ·
          Total: {fmtCompact(totalLeaseholdValuePv)}
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              type="number"
              domain={[firstYear, lastYear]}
              ticks={yearTicks}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => String(Math.round(v))}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={fmtCompact}
              width={45}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => `${v}%`}
              width={32}
            />
            <Tooltip content={<IncomeTooltip />} />
            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
            <Bar
              yAxisId="left"
              dataKey="rentalIncome"
              name="Rental Income"
              fill="#f97316"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="netPvRental"
              name="Net PV Rental"
              fill="#22c55e"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePvPct"
              name="Cumulative PV %"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import {
  ComposedChart,
  AreaChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tooltipFormatter = ((value: number, name: string) => [fmtTooltip(value), name]) as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const labelFormatter = ((label: any) => `Year ${Number(label).toFixed(1)}`) as any;
const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PropertyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const land = payload.find((p: any) => p.dataKey === 'landValue')?.value ?? 0;
  const building = payload.find((p: any) => p.dataKey === 'buildingAfterDepre')?.value ?? 0;
  const total = land + building;
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="text-gray-500 mb-1">Year {Number(label).toFixed(1)}</div>
      <div style={{ color: '#22c55e' }}>Land Value: {fmtTooltip(land)}</div>
      <div style={{ color: '#3b82f6' }}>Building (After Depre.): {fmtTooltip(building)}</div>
      <div className="border-t border-gray-100 mt-1 pt-1 font-medium text-gray-700">Total L&B: {fmtTooltip(total)}</div>
    </div>
  );
}

export function LeaseholdChart({ result }: LeaseholdChartProps) {
  const data = result.rows.map((r) => ({
    year: r.year,
    landValue: r.landValue,
    buildingAfterDepre: r.buildingAfterDepreciation,
    totalLandAndBuilding: r.totalLandAndBuilding,
    rentalIncome: r.rentalIncome,
    netPvRental: r.netCurrentRentalIncome,
  }));

  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Left: Property Value */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="text-[11px] font-medium text-gray-500 mb-1.5">Property Value Over Lease Term</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }} stackOffset="none">
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => v.toFixed(1)}
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
              dataKey="buildingAfterDepre"
              name="Building (After Depre.)"
              stackId="property"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
            <Area
              type="monotone"
              dataKey="landValue"
              name="Land Value"
              stackId="property"
              stroke="#22c55e"
              fill="#22c55e"
              fillOpacity={0.3}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Right: Income Analysis */}
      <div className="rounded-lg border border-gray-200 p-3">
        <div className="text-[11px] font-medium text-gray-500 mb-1.5">Income Analysis</div>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="year"
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <YAxis
              tick={{ fontSize: 9, fill: '#9ca3af' }}
              tickFormatter={fmtCompact}
              width={45}
            />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={tooltipFormatter}
              labelFormatter={labelFormatter}
            />
            <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
            <Bar
              dataKey="rentalIncome"
              name="Rental Income"
              fill="#f97316"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
            <Bar
              dataKey="netPvRental"
              name="Net PV Rental"
              fill="#22c55e"
              fillOpacity={0.6}
              radius={[2, 2, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

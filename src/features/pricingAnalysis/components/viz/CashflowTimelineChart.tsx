import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface CashflowTimelineDataPoint {
  year: number;
  income: number;
  expenses: number;
  noi: number;
  presentValue: number;
  terminalRevenue?: number;
}

export interface CashflowTimelineChartProps {
  data: CashflowTimelineDataPoint[];
  discountRate: number;
  capitalizeRate: number;
}

const fmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtFull = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

interface ChartRow extends CashflowTimelineDataPoint {
  noiBar: number;
  terminalBar: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CashflowTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row = (payload[0]?.payload ?? {}) as ChartRow;
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="text-gray-500 mb-1">Year {label}</div>
      <div style={{ color: '#22c55e' }}>Income: {fmtFull(row.income ?? 0)}</div>
      <div style={{ color: '#f97316' }}>Expenses: {fmtFull(row.expenses ?? 0)}</div>
      <div style={{ color: '#3b82f6' }} className="font-medium">
        NOI: {fmtFull(row.noi ?? 0)}
      </div>
      {row.terminalBar > 0 && (
        <div style={{ color: '#8b5cf6' }}>
          Terminal value: {fmtFull(row.terminalBar)}
        </div>
      )}
      <div style={{ color: '#0ea5e9' }} className="mt-1">
        PV contribution: {fmtFull(row.presentValue ?? 0)}
      </div>
    </div>
  );
}

export function CashflowTimelineChart({
  data,
  discountRate,
  capitalizeRate,
}: CashflowTimelineChartProps) {
  // Split NOI and terminal value into two stack segments so the bar visually
  // shows how much of the terminal-year bar comes from the cap-rate residual.
  const rows: ChartRow[] = data.map(d => ({
    ...d,
    noiBar: d.noi,
    terminalBar: d.terminalRevenue ?? 0,
  }));

  const totalPv = data.reduce((sum, d) => sum + (d.presentValue ?? 0), 0);
  const terminalRow = rows.find(r => r.terminalBar > 0);
  const terminalPv = terminalRow
    ? (terminalRow.terminalBar / (terminalRow.noiBar + terminalRow.terminalBar || 1)) *
      (terminalRow.presentValue ?? 0)
    : 0;
  const terminalShare = totalPv > 0 ? (terminalPv / totalPv) * 100 : 0;

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[11px] font-medium text-gray-500">Cashflow &amp; Present Value</div>
        <div className="text-[9px] text-gray-400">
          Discount: {(discountRate * 100).toFixed(1)}% · Cap: {(capitalizeRate * 100).toFixed(1)}%
        </div>
      </div>

      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={rows} margin={{ top: 8, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="year" tick={{ fontSize: 9, fill: '#9ca3af' }} />
          <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickFormatter={fmtCompact} width={45} />
          <Tooltip content={<CashflowTooltip />} cursor={{ fill: '#f3f4f6' }} />
          <Legend wrapperStyle={{ fontSize: 9, paddingTop: 2 }} />
          <Bar
            dataKey="noiBar"
            name="NOI"
            stackId="cf"
            fill="#3b82f6"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="terminalBar"
            name="Terminal value"
            stackId="cf"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
          />
          <Line
            type="monotone"
            dataKey="presentValue"
            name="Present value"
            stroke="#0ea5e9"
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={{ r: 3, fill: '#0ea5e9' }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      <div className="mt-2 grid grid-cols-3 gap-3 text-[10px]">
        <Stat label="NPV (Σ PV)" value={fmtFull(totalPv)} accent="text-sky-600" />
        <Stat
          label="Terminal share"
          value={`${terminalShare.toFixed(1)}%`}
          accent="text-violet-600"
        />
        <Stat
          label="Discount rate"
          value={`${(discountRate * 100).toFixed(1)}%`}
          accent="text-gray-700"
        />
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md border border-gray-100 bg-gray-50/60 px-2 py-1">
      <span className="text-gray-500 uppercase tracking-wide">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${accent}`}>{value}</span>
    </div>
  );
}

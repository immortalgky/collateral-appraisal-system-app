import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export type WaterfallStepType = 'start' | 'add' | 'subtract' | 'total';

export interface WaterfallStep {
  label: string;
  value: number;
  type: WaterfallStepType;
  color?: string;
}

export interface WaterfallChartProps {
  steps: WaterfallStep[];
  title?: string;
}

const fmtCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtTooltip = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const tooltipStyle = { fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' };

const DEFAULT_COLORS: Record<WaterfallStepType, string> = {
  start: '#3b82f6',
  add: '#22c55e',
  subtract: '#f97316',
  total: '#3b82f6',
};

interface WaterfallDatum {
  label: string;
  base: number;
  segment: number;
  runningTotal: number;
  type: WaterfallStepType;
  color: string;
  originalValue: number;
}

function buildWaterfallData(steps: WaterfallStep[]): WaterfallDatum[] {
  let running = 0;
  return steps.map((step) => {
    const color = step.color ?? DEFAULT_COLORS[step.type];
    let base: number;
    let segment: number;

    if (step.type === 'start') {
      base = 0;
      segment = step.value;
      running = step.value;
    } else if (step.type === 'add') {
      base = running;
      segment = step.value;
      running += step.value;
    } else if (step.type === 'subtract') {
      base = running - step.value;
      segment = step.value;
      running -= step.value;
    } else {
      // total: bar from 0 to current running total
      base = 0;
      segment = running;
    }

    return {
      label: step.label,
      base,
      segment,
      runningTotal: running,
      type: step.type,
      color,
      originalValue: step.value,
    };
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function WaterfallTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const row: WaterfallDatum = payload[0]?.payload ?? {};
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="text-gray-500 mb-1">{label}</div>
      <div style={{ color: row.color }} className="font-medium">
        {row.type === 'subtract' ? '−' : '+'}
        {fmtTooltip(row.originalValue)}
      </div>
      <div className="border-t border-gray-100 mt-1 pt-1 text-gray-600">
        Running Total: {fmtTooltip(row.runningTotal)}
      </div>
    </div>
  );
}

export function WaterfallChart({ steps, title = 'Value Breakdown' }: WaterfallChartProps) {
  const data = buildWaterfallData(steps);

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-[11px] font-medium text-gray-500 mb-1">{title}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickFormatter={fmtCompact}
            width={45}
          />
          <Tooltip content={<WaterfallTooltip />} />
          {/* Invisible base bar that offsets the visible segment */}
          <Bar dataKey="base" stackId="waterfall" fill="transparent" legendType="none" />
          {/* Visible colored segment */}
          <Bar
            dataKey="segment"
            stackId="waterfall"
            legendType="none"
            shape={({ x, y, width, height, payload }: any) => (
              <rect x={x} y={y} width={width} height={height} fill={payload.color} rx={2} />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

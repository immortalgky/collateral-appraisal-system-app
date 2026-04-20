import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  LabelList,
} from 'recharts';

export interface ComparablePoint {
  name: string;
  pricePerSqm: number;
  adjustmentScore: number;
  isSubject?: boolean;
}

export interface ComparablePositionChartProps {
  points: ComparablePoint[];
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ComparableTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point: ComparablePoint = payload[0]?.payload ?? {};
  return (
    <div style={tooltipStyle} className="bg-white px-3 py-2 shadow-md">
      <div className="font-medium text-gray-700 mb-1">{point.name}</div>
      <div style={{ color: point.isSubject ? '#3b82f6' : '#f97316' }}>
        Price/SqM: {fmtTooltip(point.pricePerSqm)}
      </div>
      <div className="text-gray-600">
        Adj. Score: {point.adjustmentScore.toFixed(1)}%
      </div>
    </div>
  );
}

export function ComparablePositionChart({
  points,
  title = 'Comparable Position',
}: ComparablePositionChartProps) {
  const subject = points.find((p) => p.isSubject);
  const comparables = points.filter((p) => !p.isSubject);

  // Build scatter data with a shape field so we can apply per-point styling
  const subjectData = subject ? [{ ...subject, r: 8 }] : [];
  const comparableData = comparables.map((p) => ({ ...p, r: 5 }));

  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-[11px] font-medium text-gray-500 mb-1">
        {title}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 10, right: 20, left: 5, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="pricePerSqm"
            name="Price/SqM"
            type="number"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickFormatter={fmtCompact}
            label={{
              value: 'Price/SqM',
              position: 'insideBottom',
              offset: -5,
              fontSize: 9,
              fill: '#9ca3af',
            }}
            width={45}
          />
          <YAxis
            dataKey="adjustmentScore"
            name="Adjustment Score (%)"
            type="number"
            tick={{ fontSize: 9, fill: '#9ca3af' }}
            tickFormatter={(v) => `${v.toFixed(0)}%`}
            width={38}
            label={{
              value: 'Adj. Score (%)',
              angle: -90,
              position: 'insideLeft',
              offset: 10,
              fontSize: 9,
              fill: '#9ca3af',
            }}
          />
          <Tooltip content={<ComparableTooltip />} />

          {/* Zero adjustment reference */}
          <ReferenceLine
            y={0}
            stroke="#9ca3af"
            strokeDasharray="3 3"
          />

          {/* Subject price reference */}
          {subject && (
            <ReferenceLine
              x={subject.pricePerSqm}
              stroke="#9ca3af"
              strokeDasharray="3 3"
              label={{
                value: 'Subject',
                position: 'insideTopRight',
                fontSize: 9,
                fill: '#9ca3af',
              }}
            />
          )}

          {/* Comparable dots */}
          {comparableData.length > 0 && (
            <Scatter
              data={comparableData}
              fill="#f97316"
              fillOpacity={0.8}
              r={5}
            >
              <LabelList
                dataKey="name"
                position="top"
                style={{ fontSize: 8, fill: '#6b7280' }}
              />
            </Scatter>
          )}

          {/* Subject dot (rendered on top) */}
          {subjectData.length > 0 && (
            <Scatter
              data={subjectData}
              fill="#3b82f6"
              r={8}
            >
              <LabelList
                dataKey="name"
                position="top"
                style={{ fontSize: 9, fill: '#3b82f6', fontWeight: 600 }}
              />
            </Scatter>
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}

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
import type { ProfitRentTableResult } from '../domain/calculateProfitRent';
import { useTranslation } from 'react-i18next';

interface ProfitRentChartProps {
  result: ProfitRentTableResult;
}

const fmtCompact = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtTooltip = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function ProfitRentChart({ result }: ProfitRentChartProps) {
  const { t } = useTranslation('pricingAnalysis');
  const data = result.rows.map(r => ({
    year: r.year,
    marketRental: r.marketRentalFeePerYear,
    contractRental: r.contractRentalFeePerYear,
    returns: r.returnsFromLease,
    presentValue: r.presentValue,
  }));

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="text-xs font-medium text-gray-500 mb-2">
        {t('viz.profitRentChart.title')}
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={v => v.toFixed(1)}
          />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={fmtCompact}
            width={50}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickFormatter={fmtCompact}
            width={50}
          />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb' }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={((value: number, name: string) => [fmtTooltip(value), name]) as any}
            labelFormatter={label => t('viz.profitRentChart.year', { n: Number(label).toFixed(1) })}
          />
          <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
          <Bar
            yAxisId="left"
            dataKey="marketRental"
            name={t('viz.profitRentChart.marketRental')}
            fill="#93c5fd"
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Bar
            yAxisId="left"
            dataKey="contractRental"
            name={t('viz.profitRentChart.contractRental')}
            fill="#d1d5db"
            fillOpacity={0.7}
            radius={[2, 2, 0, 0]}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="presentValue"
            name={t('viz.profitRentChart.presentValue')}
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

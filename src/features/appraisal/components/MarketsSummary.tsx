import { type ReactNode, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { PriceUnitLabel } from './MarketsLabels';
import { useMarketFormatters } from '../hooks/useMarketFormatters';
import {
  daysSince,
  median,
  unitPriceOf,
  usedInMethods,
  type Comparable,
} from '../utils/marketComparableFormat';

interface MarketsSummaryProps {
  comparables: Comparable[];
  /** Keyed by the comparable link id. */
  distances: Map<string, number | null>;
}

/**
 * The questions asked of the whole set before opening any one comparable: where the prices sit,
 * how widely they spread, how close the nearest one is, how fresh the data is, and how many
 * already feed the pricing.
 *
 * One box per price unit. A price per square wa and a price per unit are not the same quantity,
 * so they cannot share a median — but giving each unit a "range" box and a "median" box, each
 * repeating the unit after the number, turned three units into six boxes over two lines. Here the
 * unit and the count head the box, the range is the figure, and the median follows it in
 * brackets, named — a bare second number read as a typo, not a median. A unit with a single price shows just that price — "70,000 – 70,000 (70,000)" says
 * the same thing three times.
 */
export const MarketsSummary = ({ comparables, distances }: MarketsSummaryProps) => {
  const { t } = useTranslation('appraisal');
  const f = useMarketFormatters();

  const byUnit = useMemo(() => {
    const groups = new Map<string, number[]>();
    for (const c of comparables) {
      const price = unitPriceOf(c);
      if (!price) continue;
      const key = price.unit ?? '';
      groups.set(key, [...(groups.get(key) ?? []), price.value]);
    }
    return [...groups]
      .map(([unit, values]) => ({
        unit: unit || null,
        count: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        median: median(values),
      }))
      .sort((a, b) => b.count - a.count); // the unit this appraisal mostly uses comes first
  }, [comparables]);

  const nearest = useMemo(() => {
    const known = [...distances.values()].filter((d): d is number => d != null);
    return known.length > 0 ? Math.min(...known) : null;
  }, [distances]);

  const latest = useMemo(() => {
    const known = comparables
      .map(c => daysSince(c.comparableInfoDateTime))
      .filter((d): d is number => d != null);
    return known.length > 0 ? Math.min(...known) : null;
  }, [comparables]);

  const used = comparables.filter(c => usedInMethods(c).length > 0).length;

  const Item = ({ label, value }: { label: ReactNode; value: ReactNode }) => (
    <div className="min-w-0">
      <div className="whitespace-nowrap text-[11px] text-gray-400">{label}</div>
      <div className="whitespace-nowrap text-[14px] font-semibold tabular-nums text-gray-900">
        {value}
      </div>
    </div>
  );

  return (
    <div className="flex flex-wrap items-start gap-x-7 gap-y-2 rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2.5">
      {byUnit.map(g => (
        <Item
          key={g.unit ?? 'none'}
          label={
            <>
              {g.unit ? <PriceUnitLabel unit={g.unit} /> : t('markets.summary.noUnit')}
              {' · '}
              {t('markets.summary.count', { n: g.count })}
            </>
          }
          value={
            g.min === g.max ? (
              f.money(g.min)
            ) : (
              <>
                {f.money(g.min)} – {f.money(g.max)}
                {g.median != null && (
                  <span className="ml-1 text-[12px] font-normal text-gray-500">
                    ({t('markets.summary.medianValue', { price: f.money(g.median) })})
                  </span>
                )}
              </>
            )
          }
        />
      ))}
      {nearest != null && <Item label={t('markets.summary.nearest')} value={f.distance(nearest)} />}
      {latest != null && <Item label={t('markets.summary.latest')} value={f.ago(latest)} />}
      <Item
        label={t('markets.summary.used')}
        value={t('markets.summary.usedValue', { used, total: comparables.length })}
      />
    </div>
  );
};

export default MarketsSummary;

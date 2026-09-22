/**
 * Residual waterfall for the Hypothesis Summary tabs.
 *
 * Tells the residual story as CSS bars (mock v94 `wfHtml`), then the cost mix as one stacked bar:
 *   Revenue → minus categorical costs → pre-discount value → discount drag → final value.
 *
 * Reads pre-computed totals from the existing summary DTOs — no calculation
 * happens here, the BE :preview endpoint is still the source of truth.
 */
import type { LandBuildingSummaryDto, CondominiumSummaryDto } from '../../types/hypothesis';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

interface WaterfallStep {
  label: string;
  value: number;
  type: 'start' | 'subtract' | 'total';
  targetId?: string;
}

type Props =
  | { variant: 'LandBuilding'; summary?: LandBuildingSummaryDto | null }
  | { variant: 'Condominium'; summary?: CondominiumSummaryDto | null };

// mock v94 `wfHtml` — CSS bars, not a chart library: each step is a bar on one shared scale
// (the revenue), costs hang off the running total, subtotals restart from zero.
const MIX_TONES = ['bg-[#0d9488]', 'bg-[#b45309]', 'bg-[#8a96a0]', 'bg-[#dc2626]'];
const pctW = (x: number) => `${x.toFixed(1)}%`;
const money = (x: number) =>
  `${x < 0 ? '−' : ''}${Math.abs(x).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function HypothesisResidualWaterfall(props: Props) {
  const { t } = useTranslation('pricingAnalysis');
  const steps = buildSteps(props, t);
  if (!steps) return null;

  const R = Math.max(steps[0]?.value ?? 0, 1);
  let run = 0;
  const rows = steps.map((st, i) => {
    const neg = st.type === 'subtract';
    const x = neg ? -st.value : st.value;
    let left: number;
    let w: number;
    if (neg) {
      left = run + x;
      w = -x;
      run += x;
    } else {
      left = 0;
      w = x;
      run = x;
    }
    left = Math.max(0, Math.min(left, R));
    w = Math.min(w, R - left);
    const kind = i === 0 ? 'pos' : neg ? 'neg' : i === steps.length - 1 ? 'fin' : 'sub';
    return { label: st.label, x, left: (left / R) * 100, w: Math.max(0.6, (w / R) * 100), kind };
  });
  const barTone = {
    pos: 'bg-[#0d9488] opacity-70',
    neg: 'bg-[#dc2626] opacity-55',
    sub: 'bg-[#0f766e] opacity-50',
    fin: 'bg-[#0d9488]',
  } as const;

  // Cost mix = the four cost categories (the steps between revenue and the first subtotal).
  const mix = steps.slice(1, 5).map(st => ({ label: st.label, value: Math.max(0, st.value) }));
  const mixTotal = mix.reduce((acc, m) => acc + m.value, 0) || 1;

  return (
    <div className="flex flex-col">
      <h4 className="mt-[4px] mb-[8px] text-[12px] font-semibold text-gray-800">
        {t('hypothesis.ledger.chartSource')}
      </h4>
      <div className="grid gap-[5px] mb-[14px]">
        {rows.map(r => (
          <div
            key={r.label}
            className="grid grid-cols-[112px_1fr_96px] items-center gap-[6px] text-[11.5px]"
          >
            <span
              className={`truncate ${r.kind === 'fin' ? 'text-[#0f766e] font-semibold' : 'text-[#55636f]'}`}
            >
              {r.label}
            </span>
            <span className="relative h-[12px] bg-[#f8fafa] rounded-[3px]">
              <i
                className={`absolute top-0 bottom-0 rounded-[3px] ${barTone[r.kind as keyof typeof barTone]}`}
                style={{ left: pctW(r.left), width: pctW(r.w) }}
              />
            </span>
            <b
              className={`text-right tabular-nums ${r.kind === 'fin' ? 'text-[#0f766e] font-semibold' : 'font-medium text-gray-800'}`}
            >
              {money(r.x)}
            </b>
          </div>
        ))}
      </div>

      <h4 className="mt-[4px] mb-[8px] text-[12px] font-semibold text-gray-800">
        {t('hypothesis.ledger.chartMix')}
      </h4>
      <div className="flex h-[12px] rounded-[4px] overflow-hidden">
        {mix.map((m, i) => (
          <i
            key={m.label}
            className={MIX_TONES[i]}
            style={{ width: pctW((m.value / mixTotal) * 100) }}
            title={`${m.label} ${((m.value / mixTotal) * 100).toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-[12px] gap-y-[4px] text-[11px] text-[#55636f] mt-[6px]">
        {mix.map((m, i) => (
          <span key={m.label} className="inline-flex items-center">
            <i className={`inline-block size-[8px] rounded-[2px] mr-[4px] ${MIX_TONES[i]}`} />
            {m.label} {Math.round((m.value / mixTotal) * 100)}%
          </span>
        ))}
      </div>
    </div>
  );
}

function buildSteps(props: Props, t: TFunction<'pricingAnalysis'>): WaterfallStep[] | null {
  if (props.variant === 'LandBuilding') {
    const s = props.summary;
    const revenue = s?.totalRevenue ?? 0;
    if (revenue <= 0) return null;

    const devCost = s?.totalProjectDevCost ?? 0;
    const projCost = s?.totalProjectCost ?? 0;
    const govTax = s?.totalGovTax ?? 0;
    const risk = s?.riskPremiumAmount ?? 0;
    const current = s?.currentPropertyValue ?? revenue - devCost - projCost - govTax - risk;
    const final = s?.finalPropertyValue ?? current;
    const discountDrag = Math.max(0, current - final);

    return [
      {
        label: t('viz.residualWaterfall.revenue'),
        value: revenue,
        type: 'start',
        targetId: 'hyp-section-revenue',
      },
      {
        label: t('viz.residualWaterfall.projectDev'),
        value: devCost,
        type: 'subtract',
        targetId: 'hyp-section-dev',
      },
      {
        label: t('viz.residualWaterfall.projectCost'),
        value: projCost,
        type: 'subtract',
        targetId: 'hyp-section-project',
      },
      {
        label: t('viz.residualWaterfall.govTax'),
        value: govTax,
        type: 'subtract',
        targetId: 'hyp-section-tax',
      },
      {
        label: t('viz.residualWaterfall.risk'),
        value: risk,
        type: 'subtract',
        targetId: 'hyp-section-risk',
      },
      {
        label: t('viz.residualWaterfall.currentValue'),
        value: current,
        type: 'total',
        targetId: 'hyp-section-final',
      },
      {
        label: t('viz.residualWaterfall.discount'),
        value: discountDrag,
        type: 'subtract',
        targetId: 'hyp-section-final',
      },
      {
        label: t('viz.residualWaterfall.finalValue'),
        value: final,
        type: 'total',
        targetId: 'hyp-section-final',
      },
    ];
  }

  const s = props.summary;
  const revenue = s?.totalRevenue ?? 0;
  if (revenue <= 0) return null;

  const hard = s?.totalHardCost ?? 0;
  const soft = s?.totalSoftCost ?? 0;
  const govTax = s?.totalGovTax ?? 0;
  const risk = s?.riskProfitTotal ?? 0;
  const remaining = s?.totalRemainingValue ?? revenue - hard - soft - govTax - risk;
  const finalRemaining = s?.finalRemainingValue ?? remaining;
  const discountDrag = Math.max(0, remaining - finalRemaining);

  return [
    {
      label: t('viz.residualWaterfall.revenueGdv'),
      value: revenue,
      type: 'start',
      targetId: 'hyp-section-revenue',
    },
    {
      label: t('viz.residualWaterfall.hardCost'),
      value: hard,
      type: 'subtract',
      targetId: 'hyp-section-hard',
    },
    {
      label: t('viz.residualWaterfall.softCost'),
      value: soft,
      type: 'subtract',
      targetId: 'hyp-section-soft',
    },
    {
      label: t('viz.residualWaterfall.govTax'),
      value: govTax,
      type: 'subtract',
      targetId: 'hyp-section-tax',
    },
    {
      label: t('viz.residualWaterfall.riskProfit'),
      value: risk,
      type: 'subtract',
      targetId: 'hyp-section-risk',
    },
    {
      label: t('viz.residualWaterfall.remaining'),
      value: remaining,
      type: 'total',
      targetId: 'hyp-section-total-dev',
    },
    {
      label: t('viz.residualWaterfall.discount'),
      value: discountDrag,
      type: 'subtract',
      targetId: 'hyp-section-final',
    },
    {
      label: t('viz.residualWaterfall.finalRemaining'),
      value: finalRemaining,
      type: 'total',
      targetId: 'hyp-section-final',
    },
  ];
}

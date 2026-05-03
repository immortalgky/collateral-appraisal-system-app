/**
 * Residual waterfall for the Hypothesis Summary tabs.
 *
 * Tells the residual story in one chart:
 *   Revenue → minus categorical costs → pre-discount value → discount drag → final value.
 *
 * Reads pre-computed totals from the existing summary DTOs — no calculation
 * happens here, the BE :preview endpoint is still the source of truth.
 */
import { WaterfallChart, type WaterfallStep } from './WaterfallChart';
import type { LandBuildingSummaryDto, CondominiumSummaryDto } from '../../types/hypothesis';

type Props =
  | { variant: 'LandBuilding'; summary?: LandBuildingSummaryDto | null }
  | { variant: 'Condominium'; summary?: CondominiumSummaryDto | null };

export function HypothesisResidualWaterfall(props: Props) {
  const steps = buildSteps(props);
  if (!steps) return null;

  return (
    <WaterfallChart
      steps={steps}
      title={props.variant === 'LandBuilding' ? 'Residual Value Breakdown' : 'Residual Value Breakdown (GDV → Final)'}
    />
  );
}

function buildSteps(props: Props): WaterfallStep[] | null {
  if (props.variant === 'LandBuilding') {
    const s = props.summary;
    const revenue = s?.totalRevenue ?? 0;
    if (revenue <= 0) return null;

    const devCost = s?.totalProjectDevCost ?? 0;
    const projCost = s?.totalProjectCost ?? 0;
    const govTax = s?.totalGovTax ?? 0;
    const risk = s?.riskPremiumAmount ?? 0;
    const current = s?.currentPropertyValue ?? (revenue - devCost - projCost - govTax - risk);
    const final = s?.finalPropertyValue ?? current;
    const discountDrag = Math.max(0, current - final);

    return [
      { label: 'Revenue', value: revenue, type: 'start', targetId: 'hyp-section-revenue' },
      { label: 'Project Dev', value: devCost, type: 'subtract', targetId: 'hyp-section-dev' },
      { label: 'Project Cost', value: projCost, type: 'subtract', targetId: 'hyp-section-project' },
      { label: 'Gov Tax', value: govTax, type: 'subtract', targetId: 'hyp-section-tax' },
      { label: 'Risk', value: risk, type: 'subtract', targetId: 'hyp-section-risk' },
      { label: 'Current Value', value: current, type: 'total', targetId: 'hyp-section-final' },
      { label: 'Discount', value: discountDrag, type: 'subtract', targetId: 'hyp-section-final' },
      { label: 'Final Value', value: final, type: 'total', targetId: 'hyp-section-final' },
    ];
  }

  const s = props.summary;
  const revenue = s?.totalRevenue ?? 0;
  if (revenue <= 0) return null;

  const hard = s?.totalHardCost ?? 0;
  const soft = s?.totalSoftCost ?? 0;
  const govTax = s?.totalGovTax ?? 0;
  const risk = s?.riskProfitTotal ?? 0;
  const remaining = s?.totalRemainingValue ?? (revenue - hard - soft - govTax - risk);
  const finalRemaining = s?.finalRemainingValue ?? remaining;
  const discountDrag = Math.max(0, remaining - finalRemaining);

  return [
    { label: 'Revenue (GDV)', value: revenue, type: 'start', targetId: 'hyp-section-revenue' },
    { label: 'Hard Cost', value: hard, type: 'subtract', targetId: 'hyp-section-hard' },
    { label: 'Soft Cost', value: soft, type: 'subtract', targetId: 'hyp-section-soft' },
    { label: 'Gov Tax', value: govTax, type: 'subtract', targetId: 'hyp-section-tax' },
    { label: 'Risk & Profit', value: risk, type: 'subtract', targetId: 'hyp-section-risk' },
    { label: 'Remaining', value: remaining, type: 'total', targetId: 'hyp-section-total-dev' },
    { label: 'Discount', value: discountDrag, type: 'subtract', targetId: 'hyp-section-final' },
    { label: 'Final Remaining', value: finalRemaining, type: 'total', targetId: 'hyp-section-final' },
  ];
}

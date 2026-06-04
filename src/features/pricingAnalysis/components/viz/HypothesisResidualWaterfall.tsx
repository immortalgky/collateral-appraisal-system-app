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
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type Props =
  | { variant: 'LandBuilding'; summary?: LandBuildingSummaryDto | null }
  | { variant: 'Condominium'; summary?: CondominiumSummaryDto | null };

export function HypothesisResidualWaterfall(props: Props) {
  const { t } = useTranslation('pricingAnalysis');
  const steps = buildSteps(props, t);
  if (!steps) return null;

  return (
    <WaterfallChart
      steps={steps}
      title={
        props.variant === 'LandBuilding'
          ? t('viz.residualWaterfall.lb')
          : t('viz.residualWaterfall.condo')
      }
    />
  );
}

function buildSteps(
  props: Props,
  t: TFunction<'pricingAnalysis'>,
): WaterfallStep[] | null {
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
      { label: t('viz.residualWaterfall.revenue'), value: revenue, type: 'start', targetId: 'hyp-section-revenue' },
      { label: t('viz.residualWaterfall.projectDev'), value: devCost, type: 'subtract', targetId: 'hyp-section-dev' },
      { label: t('viz.residualWaterfall.projectCost'), value: projCost, type: 'subtract', targetId: 'hyp-section-project' },
      { label: t('viz.residualWaterfall.govTax'), value: govTax, type: 'subtract', targetId: 'hyp-section-tax' },
      { label: t('viz.residualWaterfall.risk'), value: risk, type: 'subtract', targetId: 'hyp-section-risk' },
      { label: t('viz.residualWaterfall.currentValue'), value: current, type: 'total', targetId: 'hyp-section-final' },
      { label: t('viz.residualWaterfall.discount'), value: discountDrag, type: 'subtract', targetId: 'hyp-section-final' },
      { label: t('viz.residualWaterfall.finalValue'), value: final, type: 'total', targetId: 'hyp-section-final' },
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
    { label: t('viz.residualWaterfall.revenueGdv'), value: revenue, type: 'start', targetId: 'hyp-section-revenue' },
    { label: t('viz.residualWaterfall.hardCost'), value: hard, type: 'subtract', targetId: 'hyp-section-hard' },
    { label: t('viz.residualWaterfall.softCost'), value: soft, type: 'subtract', targetId: 'hyp-section-soft' },
    { label: t('viz.residualWaterfall.govTax'), value: govTax, type: 'subtract', targetId: 'hyp-section-tax' },
    { label: t('viz.residualWaterfall.riskProfit'), value: risk, type: 'subtract', targetId: 'hyp-section-risk' },
    { label: t('viz.residualWaterfall.remaining'), value: remaining, type: 'total', targetId: 'hyp-section-total-dev' },
    { label: t('viz.residualWaterfall.discount'), value: discountDrag, type: 'subtract', targetId: 'hyp-section-final' },
    {
      label: t('viz.residualWaterfall.finalRemaining'),
      value: finalRemaining,
      type: 'total',
      targetId: 'hyp-section-final',
    },
  ];
}

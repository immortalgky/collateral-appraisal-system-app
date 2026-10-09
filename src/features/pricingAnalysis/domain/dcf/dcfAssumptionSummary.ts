import type { TFunction } from 'i18next';
import type { DCFAssumption, DCFMethod, DCFSection } from '../../types/dcf';
import { dcfAssumptionLabel, dcfCategoryLabel, dcfSectionLabel } from './dcfNameLabel';

type PricingAnalysisTFn = TFunction<'pricingAnalysis'>;

// Loose view over every method's `detail` — each method only fills the fields it has.
interface AnyDetail {
  sumSaleableArea?: number;
  totalSaleableArea?: number;
  avgRoomRate?: number;
  avgRentalRatePerMonth?: number;
  seasonCount?: number;
  firstYearAmt?: number;
  sumRoomIncomePerMonth?: number;
  sumTotalRoomExpensePerDay?: number;
  sumTotalSalaryPerYear?: number;
  jobPositionDetails?: { numberOfEmployees?: number }[];
  energyCostIndex?: number;
  proportionPct?: number;
  increaseRatePct?: number;
  increaseRateYrs?: number;
  occupancyRateFirstYearPct?: number;
  occupancyRatePct?: number;
  occupancyRateYrs?: number;
  startIn?: number;
}

const num = (v: unknown, digits = 0) =>
  (Number(v) || 0).toLocaleString('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

/**
 * The DCF table's "สมมติฐาน" column — one row's assumption in plain words (HANDOFF §8,
 * mock `asmSummary()`), e.g. "60 ห้อง · ADR 1,717 · เข้าพัก 65% +2.0/ปี · +3.0%/ปี".
 * Read-only: it describes the stored `method.detail`, it never writes to it.
 * `refLabel` is the resolved "% of" target for method 13 — the caller owns that lookup.
 */
export function dcfAssumptionSummary(
  t: PricingAnalysisTFn,
  method: DCFMethod | undefined,
  refLabel?: string,
): string {
  if (!method) return '';
  const d = (method.detail ?? {}) as AnyDetail;

  const every = Number(d.increaseRateYrs) || 0;
  const growth = d.increaseRatePct
    ? ' · ' +
      (every > 1
        ? t('methodTabs.dcf.summary.growthEvery', { pct: num(d.increaseRatePct, 1), years: every })
        : t('methodTabs.dcf.summary.growthYearly', { pct: num(d.increaseRatePct, 1) }))
    : '';
  const start =
    (Number(d.startIn) || 0) > 1
      ? ' · ' + t('methodTabs.dcf.summary.startYear', { year: d.startIn })
      : '';
  const occEvery = Number(d.occupancyRateYrs) || 0;
  const occ =
    ' · ' +
    t('methodTabs.dcf.summary.occupancy', { pct: num(d.occupancyRateFirstYearPct) }) +
    (d.occupancyRatePct
      ? occEvery > 1
        ? ' ' +
          t('methodTabs.dcf.summary.occGrowthEvery', {
            pct: num(d.occupancyRatePct, 1),
            years: occEvery,
          })
        : ' ' + t('methodTabs.dcf.summary.occGrowthYearly', { pct: num(d.occupancyRatePct, 1) })
      : '');
  const tail = growth + start;
  const rooms = (n: unknown) => t('methodTabs.dcf.summary.rooms', { count: num(n) });

  switch (method.methodType) {
    case '01':
      return `${rooms(d.sumSaleableArea)} · ADR ${num(d.avgRoomRate)}${occ}${tail}`;
    case '02':
      return `${t('methodTabs.dcf.summary.seasons', { count: num(d.seasonCount) })} · ${rooms(d.totalSaleableArea)}${occ}${tail}`;
    case '03':
    case '14':
      return `${t('methodTabs.dcf.summary.perYear', { amount: num(d.firstYearAmt) })}${tail}`;
    case '04':
      return `${t('methodTabs.dcf.summary.perYear', { amount: num(d.firstYearAmt) })}${occ}${tail}`;
    case '05':
      return `${rooms(d.sumSaleableArea)} · ${t('methodTabs.dcf.summary.perMonth', { amount: num(d.sumRoomIncomePerMonth) })}${tail}`;
    case '06':
      return `${t('methodTabs.dcf.summary.sqm', { area: num(d.sumSaleableArea) })} · ${t('methodTabs.dcf.summary.perSqmMonth', { amount: num(d.avgRentalRatePerMonth) })} · ${t('methodTabs.dcf.summary.leased', { pct: num(d.occupancyRateFirstYearPct) })}${tail}`;
    case '07':
      return `${rooms(d.sumSaleableArea)} · ${t('methodTabs.dcf.summary.perDay', { amount: num(d.sumTotalRoomExpensePerDay) })}${tail}`;
    case '08':
      return `${t('methodTabs.dcf.summary.perRoomDay', { amount: num(d.firstYearAmt) })}${tail}`;
    case '09': {
      const people = (d.jobPositionDetails ?? []).reduce(
        (sum, r) => sum + (Number(r.numberOfEmployees) || 0),
        0,
      );
      return `${t('methodTabs.dcf.summary.people', { count: num(people) })} · ${t('methodTabs.dcf.summary.perYear', { amount: num(d.sumTotalSalaryPerYear) })}${tail}`;
    }
    case '10':
      return `${t('methodTabs.dcf.summary.tieredTax')}${tail}`;
    case '11':
      return `${t('methodTabs.dcf.summary.energyIndex', { index: num(d.energyCostIndex, 2) })}${tail}`;
    case '12':
      return `${t('methodTabs.dcf.summary.ofReplacementCost', { pct: num(d.proportionPct, 2) })}${tail}`;
    case '13':
      return `${t('methodTabs.dcf.summary.percentOf', { pct: num(d.proportionPct, 1), target: refLabel || t('methodTabs.dcf.summary.notSelected') })}${start}`;
    default:
      return '';
  }
}

/**
 * Method 13's "% of" target as a label in the UI language — resolved by code through the
 * same label helpers the table uses (the option list the modal's select builds carries raw
 * English names). Shared by the calc table and the assumption summary tab.
 */
export function resolveM13RefLabel(
  t: PricingAnalysisTFn,
  sections: DCFSection[],
  assumption: DCFAssumption,
): string | undefined {
  if (assumption.method?.methodType !== '13') return undefined;
  const ref = (assumption.method?.detail as { refTarget?: { clientId?: string } } | undefined)
    ?.refTarget?.clientId;
  if (!ref) return undefined;
  const [kind, id] = ref.split(':');
  for (const sec of sections) {
    const secLabel = dcfSectionLabel(t, sec.sectionType, sec.sectionName);
    if (kind === 'section' && sec.clientId === id)
      return t('methodTabs.dcf.summary.totalOf', { name: secLabel });
    for (const cat of sec.categories ?? []) {
      if (kind === 'category' && cat.clientId === id) {
        const catLabel = dcfCategoryLabel(t, cat.categoryName, cat.categoryName ?? '');
        // A category that is itself a total ("รายได้รวม" / "Gross Income") would read
        // "รวมรายได้รวม" — name it as is.
        return /รวม|\btotal\b|\bgross\b/i.test(catLabel)
          ? catLabel
          : t('methodTabs.dcf.summary.totalOf', { name: catLabel });
      }
      const asm = (cat.assumptions ?? []).find(a => a.clientId === id);
      if (kind === 'assumption' && asm)
        return `${secLabel} - ${dcfAssumptionLabel(t, asm.assumptionType, asm.assumptionName ?? '')}`;
    }
  }
  return undefined;
}

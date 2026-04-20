import { useMemo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import type { CashflowTimelineDataPoint } from '../components/viz/CashflowTimelineChart';
import type { KpiItem } from '../components/viz/KpiDashboard';
import type { DCFSection, DCFSummarySection } from '../types/dcf';

interface IncomeScenarioResults {
  cashflowData: CashflowTimelineDataPoint[];
  primaryKpi: KpiItem;
  secondaryKpis: KpiItem[];
  discountRate: number;
  capitalizeRate: number;
  totalNoi: number;
  totalPv: number;
  finalValue: number;
  finalValueRounded: number;
}

function isSummarySection(
  section: DCFSection | DCFSummarySection,
): section is DCFSummarySection {
  return 'grossRevenue' in section;
}

export function useIncomeScenarioResults(): IncomeScenarioResults {
  const { control } = useFormContext();
  const sections = useWatch({ control, name: 'sections' }) ?? [];
  const discountRate = useWatch({ control, name: 'discountedRate' }) ?? 0;
  const capitalizeRate = useWatch({ control, name: 'capitalizeRate' }) ?? 0;
  const totalNumberOfYears = useWatch({ control, name: 'totalNumberOfYears' }) ?? 0;
  const finalValue = useWatch({ control, name: 'finalValue' }) ?? 0;
  const finalValueRounded = useWatch({ control, name: 'finalValueRounded' }) ?? 0;

  return useMemo(() => {
    const incomeSections = (sections as (DCFSection | DCFSummarySection)[]).filter(
      (s) => !isSummarySection(s) && s.sectionType === 'income',
    ) as DCFSection[];

    const expenseSections = (sections as (DCFSection | DCFSummarySection)[]).filter(
      (s) => !isSummarySection(s) && s.sectionType === 'expenses',
    ) as DCFSection[];

    const summarySections = (sections as (DCFSection | DCFSummarySection)[]).filter(
      isSummarySection,
    );
    const summary = summarySections[0] as DCFSummarySection | undefined;

    const cashflowData: CashflowTimelineDataPoint[] = Array.from(
      { length: totalNumberOfYears },
      (_, i) => {
        const income = incomeSections.reduce(
          (sum, s) => sum + (s.totalSectionValues?.[i] ?? 0),
          0,
        );
        const expenses = expenseSections.reduce(
          (sum, s) => sum + Math.abs(s.totalSectionValues?.[i] ?? 0),
          0,
        );
        const noi = summary?.grossRevenue?.[i] ?? income - expenses;
        const presentValueVal = summary?.presentValue?.[i] ?? 0;
        const terminalRevenue = summary?.terminalRevenue?.[i] ?? undefined;

        return {
          year: i + 1,
          income,
          expenses,
          noi,
          presentValue: presentValueVal,
          terminalRevenue: terminalRevenue && terminalRevenue !== 0 ? terminalRevenue : undefined,
        };
      },
    );

    const totalNoi = cashflowData.reduce((sum, d) => sum + d.noi, 0);
    const totalPv = cashflowData.reduce((sum, d) => sum + d.presentValue, 0);

    const noiRatio =
      cashflowData[0]?.income > 0
        ? (cashflowData[0]?.noi / cashflowData[0].income) * 100
        : 0;

    const toKpiValue = (n: number | null | undefined): number | null =>
      n != null && Number.isFinite(n) ? n : null;

    const primaryKpi: KpiItem = {
      label: 'Final Value',
      value: toKpiValue(Number(finalValueRounded)) ?? toKpiValue(Number(finalValue)),
      icon: 'badge-dollar',
      color: 'green',
    };

    const secondaryKpis: KpiItem[] = [
      {
        label: 'NPV (Sum PV)',
        value: toKpiValue(totalPv),
        icon: 'chart-line-up',
        color: 'blue',
      },
      {
        label: 'Year 1 NOI',
        value: toKpiValue(cashflowData[0]?.noi),
        icon: 'circle-dollar',
        color: 'green',
      },
      {
        label: 'NOI Ratio',
        value: toKpiValue(noiRatio),
        icon: 'chart-pie',
        color: 'amber',
        suffix: '%',
      },
      {
        label: 'Discount Rate',
        value: toKpiValue(Number(discountRate)),
        icon: 'percent',
        color: 'gray',
        suffix: '%',
      },
    ];

    return {
      cashflowData,
      primaryKpi,
      secondaryKpis,
      discountRate: Number(discountRate),
      capitalizeRate: Number(capitalizeRate),
      totalNoi,
      totalPv,
      finalValue: Number(finalValue),
      finalValueRounded: Number(finalValueRounded),
    };
  }, [sections, discountRate, capitalizeRate, totalNumberOfYears, finalValue, finalValueRounded]);
}

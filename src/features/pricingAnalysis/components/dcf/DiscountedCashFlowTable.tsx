import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { DenseProvider } from '../table/RHFInputCell';
import { DiscountedCashFlowSectionRenderer } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowSectionRenderer';
import type { DCFSection } from '../../types/dcf';
import { StickyLabelTable } from '../layout/StickyLabelTable';
import { useEffect, useMemo, useRef } from 'react';
import { useDerivedFields } from '../../adapters/useDerivedFieldArray';
import {
  buildMethodCalculationRules,
  getMethodPerYearFieldPaths,
} from '../../domain/dcf/useCalculations';
import { useTranslation } from 'react-i18next';
import { STK_CLASS, STK2_CLASS, YEAR_CELL_CLASS } from './dcfTableCellStyles';

// mock:2106 — `<table class="g dcf" data-sticky="490">`. Widened from the mock's 230
// (item) + 260 (assumption) to 300+350 — see dcfTableCellStyles.ts for why.
// Measured, not guessed: the longest label rendered here is the locale string "Net Operating
// Income (EBIT…)" at 304px — wider than the longest name in dcfParameters.ts, which is what the
// 300px pass was sized against. STKW below stays STK + STK2 (320 + 350).
const DCF_STK_WIDTH = 230;

export interface SectionColor {
  bg: string;
  bgAccent: string;
  text: string;
  textAccent: string;
  textLight: string;
  light: string;
  badge: string;
}

const getSectionColor = (sectionType: string): SectionColor => {
  switch (sectionType) {
    case 'income':
      return {
        bg: 'bg-[#EFF8FF]',
        bgAccent: 'bg-[#2B7DE9]',
        text: 'text-[#1A5CB0]',
        textAccent: 'text-[#2B7DE9]',
        textLight: 'text-[#FFFFFF]',
        light: 'text-[#2B7DE9]',
        badge: 'bg-[#C4DFFA]',
      };
    case 'expenses':
      return {
        bg: 'bg-[#FFF5F0]',
        bgAccent: 'bg-[#E8652B]',
        text: 'text-[#167A3F]',
        textAccent: 'text-[#E8652B]',
        textLight: 'text-[#FFFFFF]',
        light: '',
        badge: 'bg-[#FACEBE]',
      };
    case 'other':
      return {
        bg: '',
        bgAccent: '',
        text: '',
        textAccent: '',
        textLight: '',
        light: '',
        badge: '',
      };
    default:
      return {
        bg: '',
        bgAccent: '',
        text: '',
        textAccent: '',
        textLight: '',
        light: '',
        badge: '',
      };
  }
};

const getIconSection = (identifier: string) => {
  switch (identifier) {
    case 'positive': {
      return 'circle-dollar';
    }
    case 'negative': {
      return 'cart-shopping';
    }
    default: {
      return 'badge-dollar';
    }
  }
};

interface DiscountedCashFlowTableProps {
  totalNumberOfYears: number;
  properties: Record<string, unknown>[];
  isReadOnly?: boolean;
  /** Buddhist year of projection year 1 — the year after the appraisal date. */
  firstYearBE?: number | null;
  onStructuralChange?: () => void;
  incomeAnalysisId?: string;
  hostMethodId?: string;
  marketSurveys?: import('@/features/pricingAnalysis/schemas').MarketComparableDetailType[];
  ensureIncomeAnalysisId?: () => Promise<string | undefined>;
}

export function DiscountedCashFlowTable({
  totalNumberOfYears,
  properties,
  isReadOnly,
  firstYearBE,
  onStructuralChange,
  incomeAnalysisId,
  hostMethodId,
  marketSurveys,
  ensureIncomeAnalysisId,
}: DiscountedCashFlowTableProps) {
  const { t } = useTranslation('pricingAnalysis');
  const { control, getValues, setValue } = useFormContext();
  const watchSections = useWatch({ control, name: 'sections' });

  const sections = useMemo(() => {
    return watchSections ?? [];
  }, [watchSections]);

  const prevTotalNumberOfYearsRef = useRef(totalNumberOfYears);
  useEffect(() => {
    // Guard BEFORE touching the ref: the projection-period input yields null while the
    // user is clearing it, and slice(0, null) would empty every per-year array. Bailing
    // out first keeps the ref on the last valid value, so re-typing a smaller number
    // still truncates correctly.
    if (!Number.isFinite(totalNumberOfYears) || totalNumberOfYears < 0) return;

    const prevTotalNumberOfYears = prevTotalNumberOfYearsRef.current;
    prevTotalNumberOfYearsRef.current = totalNumberOfYears;
    if (totalNumberOfYears >= prevTotalNumberOfYears) return;

    const truncate = (path: string) => {
      const current = getValues(path);
      if (Array.isArray(current) && current.length > totalNumberOfYears) {
        setValue(path, current.slice(0, totalNumberOfYears), { shouldDirty: true });
      }
    };

    const currentSections = (getValues('sections') as DCFSection[]) ?? [];
    currentSections.forEach((section, sectionIdx) => {
      const sectionPath = `sections.${sectionIdx}`;
      truncate(`${sectionPath}.totalSectionValues`);

      (section.categories ?? []).forEach((category, categoryIdx) => {
        const categoryPath = `${sectionPath}.categories.${categoryIdx}`;
        truncate(`${categoryPath}.totalCategoryValues`);

        (category.assumptions ?? []).forEach((assumption, assumptionIdx) => {
          const assumptionPath = `${categoryPath}.assumptions.${assumptionIdx}`;
          truncate(`${assumptionPath}.totalAssumptionValues`);

          const methodType = assumption.method?.methodType;
          if (!methodType) return;

          const methodPath = `${assumptionPath}.method`;
          getMethodPerYearFieldPaths(methodType).forEach(fieldPath => {
            truncate(`${methodPath}.${fieldPath}`);
          });
        });
      });
    });
  }, [totalNumberOfYears, getValues, setValue]);

  const methodCalculationRules = useMemo(() => {
    return buildMethodCalculationRules(sections, totalNumberOfYears);
  }, [sections, totalNumberOfYears]);

  const newReplacementCost = useMemo(() => {
    return (properties ?? [])
      .filter((p: any) => p.propertyType === 'B')
      .flatMap((p: any) => p.depreciationDetails ?? [])
      .filter((d: any) => d.isBuilding)
      .reduce((sum: number, d: any) => sum + Number(d.priceBeforeDepreciation ?? 0), 0);
  }, [properties]);

  const derivedCtx = useMemo(
    () => ({ newReplacementCost, sections }),
    [newReplacementCost, sections],
  );

  // Method 13 depends on referenced section/category/assumption totals, so use a stable snapshot
  // of only the values that can affect its reference-based calculations.
  // Method 13 also got the issue if select section, category that its stay
  useDerivedFields({
    rules: methodCalculationRules,
    ctx: derivedCtx,
    externalDeps: [
      newReplacementCost,
      JSON.stringify(
        sections.map((section: DCFSection) => ({
          clientId: section.clientId,
          totalSectionValues: section.totalSectionValues,
          categories: (section.categories ?? []).map(category => ({
            clientId: category.clientId,
            totalCategoryValues: category.totalCategoryValues,
            assumptions: (category.assumptions ?? []).map(assumption => ({
              clientId: assumption.clientId,
              totalAssumptionValues: assumption.totalAssumptionValues,
            })),
          })),
        })),
      ),
    ],
  });

  return (
    // DenseProvider — every RHFInputCell inside the DCF table (projection-period header
    // inputs, per-method rate inputs/selects in DiscountedCashFlowMethodRenderer's
    // Method* components) was rendering at the default (non-dense) size, whose ~32-38px
    // controls (see NumberInput/TDropdown non-dense branches) forced rows well past the
    // 26px BASE_CELL height — the root cause of the DCF table's uneven row heights. The
    // rest of this feature's tables (WQS/SAG/Cost/etc.) already wrap their scoring grids
    // the same way; the DCF table was the one left out.
    <DenseProvider value={true}>
      <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-200">
        <StickyLabelTable
          className="flex-1 min-h-0"
          secondStickyColumnLeft={DCF_STK_WIDTH}
          // Year pager (mock:2708 `nav: true`) — same opt-in LeaseholdTable uses. The
          // sticky block is STK + STK2 = 230 + 260 (mock:669-670).
          columnNavSelector="thead th[data-nav-col]"
          stickyWidth={490}
          navGroupSize={5}
        >
        <table className="table min-w-max border-separate border-spacing-0 text-[12px] leading-[25px] tabular-nums rounded-none">
          <thead className="bg-neutral-50">
            <tr className="bg-white">
              {/* mock:2172 — static "รายการ | สมมติฐาน". The projection-period/days
                  editors that used to live here moved to the assumptions rail
                  (DiscountedCashFlowPanel), which binds the same RHF fields. */}
              <th className={clsx(STK_CLASS, 'font-medium text-left')}>
                {t('methodTabs.dcf.table.item')}
              </th>
              <th className={clsx(STK2_CLASS, 'font-medium text-left')}>
                {t('methodTabs.dcf.table.assumption')}
              </th>
              {Array.from({ length: totalNumberOfYears }, (_, i) => (
                <th
                  key={i}
                  data-nav-col
                  // mock `.g th.yr` — two lines (ปีที่ N / BE year), line-height 14 + 4px pad.
                  className={clsx(YEAR_CELL_CLASS, 'font-medium leading-[14px]! py-[4px]!')}
                >
                  {t('dcf.common.yearColumn', { year: i + 1 })}
                  {firstYearBE != null && (
                    <span className="block text-[10px] text-[#8a96a0] font-normal leading-[12px]">
                      {firstYearBE + i}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sections ?? []).map((section: DCFSection, sectionIdx: number) => {
              return (
                <DiscountedCashFlowSectionRenderer
                  key={section.dbId ?? section.clientId ?? sectionIdx}
                  name={`sections.${sectionIdx}`}
                  properties={properties}
                  section={section}
                  color={getSectionColor(section.sectionType)}
                  totalNumberOfYears={totalNumberOfYears}
                  icon={getIconSection(section.identifier)}
                  isReadOnly={isReadOnly}
                  onStructuralChange={onStructuralChange}
                  incomeAnalysisId={incomeAnalysisId}
                  hostMethodId={hostMethodId}
                  marketSurveys={marketSurveys}
                  ensureIncomeAnalysisId={ensureIncomeAnalysisId}
                />
              );
            })}
          </tbody>
        </table>
      </StickyLabelTable>
      </div>
    </DenseProvider>
  );
}

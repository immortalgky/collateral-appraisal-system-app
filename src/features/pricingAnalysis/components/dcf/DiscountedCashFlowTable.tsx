import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from '../table/RHFInputCell';
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
  // of only the values that can affect resolveRefTarget-based calculations.
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
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl p-1.5">
      <StickyLabelTable className="flex-1 min-h-0">
        <table className="table table-xs min-w-max border-separate border-spacing-0">
          <thead className="bg-neutral-50">
            <tr className="bg-white">
              <td className="flex-1 text-xs px-1 py-1 font-medium whitespace-nowrap border-b border-gray-300">
                <div className="flex flex-row justify-end items-center gap-1.5">
                  <span>{t('dcf.common.projectionPeriod')}</span>
                  <div className="w-16">
                    <RHFInputCell
                      fieldName="totalNumberOfYears"
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 0,
                        maxIntegerDigits: 2,
                        maxValue: 99,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>{t('dcf.common.years')}</span>
                  <span>/</span>
                  <span>{t('dcf.common.daysPerYear')}</span>
                  <div className="w-16">
                    <RHFInputCell
                      fieldName="totalNumberOfDayInYear"
                      inputType="number"
                      disabled={isReadOnly}
                      number={{
                        decimalPlaces: 0,
                        maxIntegerDigits: 3,
                        maxValue: 370,
                        allowNegative: false,
                      }}
                    />
                  </div>
                  <span>{t('dcf.common.days')}</span>
                </div>
              </td>
              {Array.from({ length: totalNumberOfYears }, (_, i) => (
                <th
                  key={i}
                  className={clsx(
                    'text-right text-xs px-1 py-1 font-medium whitespace-nowrap border-b border-gray-300 min-w-[120px]',
                  )}
                >
                  {t('dcf.common.yearColumn', { year: i + 1 })}
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
  );
}

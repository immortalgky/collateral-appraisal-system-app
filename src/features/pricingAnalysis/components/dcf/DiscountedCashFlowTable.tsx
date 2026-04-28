import clsx from 'clsx';
import { useFormContext, useWatch } from 'react-hook-form';
import { RHFInputCell } from '../table/RHFInputCell';
import { DiscountedCashFlowSectionRenderer } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowSectionRenderer';
import type { DCFSection } from '../../types/dcf';
import { StickyLabelTable } from '../layout/StickyLabelTable';
import { useMemo } from 'react';
import { useDerivedFields } from '../../adapters/useDerivedFieldArray';
import { buildMethodCalculationRules } from '../../domain/dcf/useCalculations';

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
}

export function DiscountedCashFlowTable({
  totalNumberOfYears,
  properties,
  isReadOnly,
  onStructuralChange,
}: DiscountedCashFlowTableProps) {
  const { control } = useFormContext();
  const watchSections = useWatch({ control, name: 'sections' });

  const sections = useMemo(() => {
    return watchSections ?? [];
  }, [watchSections]);

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
                  <span>Years</span>
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
                  <span>Days in a year</span>
                </div>
              </td>
              {Array.from({ length: totalNumberOfYears }, (_, i) => (
                <th
                  key={i}
                  className={clsx(
                    'text-right text-xs px-1 py-1 font-medium whitespace-nowrap border-b border-gray-300 min-w-[120px]',
                  )}
                >
                  Year {i + 1}
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
                />
              );
            })}
          </tbody>
        </table>
      </StickyLabelTable>
    </div>
  );
}

import clsx from 'clsx';
import { useWatch } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import { DiscountedCashFlowSectionRenderer } from '@features/pricingAnalysis/components/DiscountedCashFlowSectionRenderer.tsx';
import type { DCFSection } from '../types/dcf';
import { ScrollableTableContainer } from './ScrollableTableContainer';

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
  property: Record<string, unknown> | undefined;
}

export function DiscountedCashFlowTable({
  totalNumberOfYears,
  property,
}: DiscountedCashFlowTableProps) {
  const sections = useWatch({ name: 'sections' });

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl p-1.5">
      <ScrollableTableContainer className="flex-1 min-h-0">
        <table className="table table-xs min-w-max border-separate border-spacing-0">
          <thead className="bg-neutral-50">
            <tr className="bg-white">
              <td className="flex-1 text-sm px-1.5 py-1.5 font-medium whitespace-nowrap border-b border-gray-300">
                <div className="flex flex-col justify-end items-end">
                  <div className="w-16">
                    <RHFInputCell
                      fieldName="totalNumberOfDayInYear"
                      inputType="number"
                      number={{
                        decimalPlaces: 0,
                        maxIntegerDigits: 3,
                        maxValue: 367,
                        allowNegative: false,
                      }}
                    />
                  </div>
                </div>
              </td>
              {Array.from({ length: totalNumberOfYears }, (_, i) => (
                <td
                  key={i}
                  className={clsx(
                    'text-right text-sm px-1.5 py-1.5 font-medium whitespace-nowrap border-b border-gray-300',
                  )}
                >
                  Year {i}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* style? data? */}
            {(sections ?? []).map((section: DCFSection, index) => {
              return (
                <DiscountedCashFlowSectionRenderer
                  key={section.clientId ?? `section.${index}`}
                  name={`sections.${index}`}
                  property={property}
                  section={section}
                  color={getSectionColor(section.sectionType)}
                  totalNumberOfYears={totalNumberOfYears}
                  icon={getIconSection(section.identifier)}
                />
              );
            })}
          </tbody>
        </table>
      </ScrollableTableContainer>
    </div>
  );
}

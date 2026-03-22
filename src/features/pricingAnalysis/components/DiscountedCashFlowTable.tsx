import clsx from 'clsx';
import type { DCFSectionFormType } from '../schemas/dcfForm';
import { DiscountedCashFlowCategory } from './DiscountedCashFlowCategory';
import { Icon } from '@/shared/components';
import { useFormContext } from 'react-hook-form';
import { RHFInputCell } from './table/RHFInputCell';
import type { ReactNode } from 'react';
import { DiscountedCashFlowSectionRenderer } from '@features/pricingAnalysis/components/DiscountedCashFlowSectionRenderer.tsx';

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

// function AddAssumptionButton({ color }) {
//   return (
//     <tr>
//       <td colSpan={7} style={{ padding: '6px 20px 6px 36px' }}>
//         <button
//           style={{
//             display: 'inline-flex',
//             alignItems: 'center',
//             gap: '5px',
//             padding: '4px 12px',
//             borderRadius: '6px',
//             border: `1px dashed ${color.accent}50`,
//             background: 'transparent',
//             color: color.accent,
//             fontSize: '12px',
//             fontWeight: 500,
//             cursor: 'pointer',
//             transition: 'all 0.15s ease',
//           }}
//           onMouseEnter={e => {
//             e.currentTarget.style.background = color.bg;
//             e.currentTarget.style.borderColor = color.accent;
//           }}
//           onMouseLeave={e => {
//             e.currentTarget.style.background = 'transparent';
//             e.currentTarget.style.borderColor = `${color.accent}50`;
//           }}
//         >
//           <PlusIcon /> Add Category
//         </button>
//       </td>
//     </tr>
//   );
// }

interface DiscountedCashFlowTableProps {
  totalNumberOfYears: number;
}

export function DiscountedCashFlowTable({ totalNumberOfYears }: DiscountedCashFlowTableProps) {
  const { getValues } = useFormContext();
  const sections = getValues('sections');

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl">
      <table className="table table-xs min-w-max border-separate border-spacing-0 overflow-clip">
        <thead className="bg-neutral-50">
          <tr className="bg-white">
            <td className="flex-1">
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
                className={clsx('text-right text-sm px-3 py-4 font-medium whitespace-nowrap')}
              >
                Year {i}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* style? data? */}
          {(sections ?? []).map((section: DCFSectionFormType, index) => {
            return (
              <DiscountedCashFlowSectionRenderer
                key={section.id ?? index}
                section={section}
                color={getSectionColor(section.sectionType)}
                totalNumberOfYears={totalNumberOfYears}
                icon={getIconSection(section.identifier)}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

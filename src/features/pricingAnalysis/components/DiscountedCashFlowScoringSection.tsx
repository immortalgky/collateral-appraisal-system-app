import clsx from 'clsx';
import type { DCFSectionFormType } from '../schemas/dcfForm';
import { DiscountedCashFlowCategory } from './DiscountedCashFlowCategory';
import { Icon } from '@/shared/components';
import { useFormContext } from 'react-hook-form';

// const colors = {
//   bg: '#FAFBFC',
//   surface: '#FFFFFF',
//   border: '#E8ECF0',
//   borderLight: '#F0F2F5',
//   textPrimary: '#1A2332',
//   textSecondary: '#5A6B7F',
//   textMuted: '#94A3B8',
//   income: {
//     bg: 'bg-[#EFF8FF]',
//     accent: '#2B7DE9',
//     text: '#1A5CB0',
//     light: '#DCEEFB',
//     badge: 'bg-[#C4DFFA]',
//   },
//   expense: {
//     bg: 'bg-[#FFF5F0]',
//     accent: '#E8652B',
//     text: '#B94817',
//     light: '#FDE8DD',
//     badge: '#FACEBE',
//   },
//   capex: { bg: '#F5F3FF', accent: '#7C5CFC', text: '#5B3FBF', light: '#EBE5FF', badge: '#D4C8FE' },
//   financing: {
//     bg: '#F0FDF4',
//     accent: '#22A85B',
//     text: '#167A3F',
//     light: '#DCFAE6',
//     badge: '#B5F0CB',
//   },
//   summary: {
//     bg: '#FFF8EB',
//     accent: '#E6A117',
//     text: '#9A6B00',
//     gradient: 'linear-gradient(135deg, #FFF8EB 0%, #FFF1D4 100%)',
//   },
//   positive: '#16A34A',
//   negative: '#DC2626',
// };

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

interface SectionHeaderProps {
  title: string;
  color: SectionColor;
  icon: string;
  totalNumberOfYears: number;
}
function SectionHeader({ title, color, icon, totalNumberOfYears }: SectionHeaderProps) {
  return (
    <tr>
      <td colSpan={totalNumberOfYears + 1} className={clsx('border-b border-gray-300', color.bg)}>
        <div className={clsx('flex items-center gap-2.5 px-1 py-1.5')}>
          <div className={clsx('w-1 h-10 rounded-lg', color.bgAccent)}></div>
          <div
            className={clsx(
              'flex items-center justify-center w-8 h-8 rounded-md text-xl',
              color.bgAccent,
            )}
          >
            <Icon
              name={icon ?? 'x'}
              style="solid"
              className={clsx('size-4 shrink-0', color.textLight)}
            />
          </div>
          <span className={clsx('text-sm font-bold tracking-wide uppercase', color.textAccent)}>
            {title}
          </span>
        </div>
      </td>
    </tr>
  );
}

interface SectionTotalRowProps {
  section: DCFSectionFormType;
  label: string;
  color: SectionColor;
  variant?: 'section' | 'final';
}
function SectionTotalRow({ section, label, color }: SectionTotalRowProps) {
  const sortedValues = (section.totalSectionValues ?? []).sort((a, b) => a.year - b.year);
  return (
    <tr className={color.bg}>
      <td className={clsx('border-b border-gray-300', color.bg)}>
        <div className={clsx('flex items-center gap-2.5 px-1 py-1.5')}>
          <div className={clsx('w-1 h-5 rounded-lg', color.bgAccent)}></div>
          <span className={clsx('text-sm font-bold tracking-wide uppercase', color.textAccent)}>
            {label}
          </span>
        </div>
      </td>
      {sortedValues.map((v, i) => (
        <td
          key={i}
          className={clsx(
            'border-b border-gray-300 font-medium text-right text-sm px-1 py-1.5',
            color.bg,
            color.textAccent,
          )}
        >
          {v.value}
        </td>
      ))}
    </tr>
  );
}

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

interface DynamicSectionProps {
  section: DCFSectionFormType;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
  onEditAssumption: () => void;
}
function DynamicSection({
  section,
  totalNumberOfYears,
  icon,
  color,
  onEditAssumption,
}: DynamicSectionProps) {
  console.log('check pasing section', section);
  return (
    <>
      <SectionHeader
        title={section.sectionName}
        color={color}
        icon={icon}
        totalNumberOfYears={totalNumberOfYears}
      />
      {(section?.categories ?? []).map(category => {
        return (
          <DiscountedCashFlowCategory
            key={category.id}
            category={category}
            color={color}
            onEditAssumption={onEditAssumption}
          />
        );
      })}
      <SectionTotalRow section={section} label={'Total'} color={color} variant={'section'} />
    </>
  );
}

interface DiscountedCashFlowScoringSectionProps {
  totalNumberOfYears: number;
}

export function DiscountedCashFlowScoringSection({
  totalNumberOfYears,
}: DiscountedCashFlowScoringSectionProps) {
  const { getValues } = useFormContext();
  const sections = getValues('sections');

  return (
    <div className="flex-1 min-h-0 min-w-0 bg-white flex flex-col border border-gray-300 rounded-xl">
      <table className="table table-xs min-w-max border-separate border-spacing-0 overflow-clip">
        <thead className="bg-neutral-50">
          <tr className="bg-white">
            <td></td>
            {Array.from({ length: totalNumberOfYears }, (_, i) => (
              <td
                key={i}
                className={clsx('text-right px-3 py-4 font-medium whitespace-nowrap text-[14px]')}
              >
                Year {i}
              </td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* style? data? */}
          {(sections ?? []).map((section: DCFSectionFormType) => {
            return (
              <DynamicSection
                key={section.id}
                section={section}
                icon={'circle-dollar'}
                totalNumberOfYears={totalNumberOfYears}
                color={getSectionColor(section.sectionType)}
                onEditAssumption={() => null}
              />
            );
          })}
        </tbody>
      </table>
      {/* pop-up modal */}
    </div>
  );
}

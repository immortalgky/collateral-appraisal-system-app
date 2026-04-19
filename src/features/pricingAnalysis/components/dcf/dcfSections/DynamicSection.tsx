import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { type ReactNode } from 'react';
import clsx from 'clsx';
import { Icon } from '@shared/components';
import type { DCFSection } from '../../../types/dcf';

interface SectionHeaderProps {
  title: string;
  color: SectionColor;
  icon: string;
  totalNumberOfYears: number;
}
function SectionHeader({ title, color, icon, totalNumberOfYears }: SectionHeaderProps) {
  return (
    <tr className={color.bg}>
      <td className={clsx('border-b border-gray-200', color.bg)}>
        <div className={clsx('flex items-center gap-2 px-1 py-0.5')}>
          <div
            className={clsx(
              'flex items-center justify-center w-5 h-5 rounded-md',
              color.bgAccent,
            )}
          >
            <Icon name={icon} style="solid" className={clsx('size-3 shrink-0', color.textLight)} />
          </div>
          <span className={clsx('text-xs font-bold tracking-wide uppercase', color.textAccent)}>
            {title}
          </span>
        </div>
      </td>
      {Array.from({ length: totalNumberOfYears }, (_, index) => (
        <td key={index} className={clsx('border-b border-gray-200', color.bg)} />
      ))}
    </tr>
  );
}

interface SectionTotalRowProps {
  name: string;
  totalSectionValues: number[];
  label: string;
  color: SectionColor;
  variant?: 'section' | 'final';
}
function SectionTotalRow({ totalSectionValues, label, color }: SectionTotalRowProps) {
  return (
    <tr className={color.bg}>
      <td className={clsx('border-b border-gray-200', color.bg)}>
        <div className={clsx('flex items-center gap-2 px-1 py-0.5')}>
          <div className={clsx('w-0.5 h-3 rounded', color.bgAccent)}></div>
          <span className={clsx('text-[11px] font-bold tracking-wide uppercase', color.textAccent)}>
            {label}
          </span>
        </div>
      </td>
      {(totalSectionValues ?? []).map((val, index) => {
        return (
          <td
            key={index}
            className={clsx(
              'border-b border-gray-200 font-medium text-right text-xs px-1 py-0.5',
              color.bg,
              color.textAccent,
            )}
          >
            <span>{val.toLocaleString() ?? 0}</span>
          </td>
        );
      })}
    </tr>
  );
}

interface DynamicSectionProps {
  name: string;
  section: DCFSection;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
  children: ReactNode;
  totalSectionValues?: number[];
}
export function DynamicSection({
  name,
  section,
  totalNumberOfYears,
  icon,
  color,
  children,
}: DynamicSectionProps) {
  return (
    <>
      <SectionHeader
        title={section.sectionName}
        color={color}
        icon={icon}
        totalNumberOfYears={totalNumberOfYears}
      />
      {children}
      <SectionTotalRow
        name={name}
        totalSectionValues={section.totalSectionValues}
        label={'Total'}
        color={color}
        variant={'section'}
      />
    </>
  );
}

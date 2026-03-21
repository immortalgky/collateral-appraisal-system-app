import type { DCFSectionFormType } from '@features/pricingAnalysis/schemas/dcfForm.ts';
import type { SectionColor } from '@features/pricingAnalysis/components/DiscountedCashFlowTable.tsx';
import type { ReactNode } from 'react';
import clsx from 'clsx';
import { Icon } from '@shared/components';

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
            <Icon name={icon} style="solid" className={clsx('size-4 shrink-0', color.textLight)} />
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
  totalNumberOfYears: number;
  totalSectionValues?: number[];
  label: string;
  color: SectionColor;
  variant?: 'section' | 'final';
}
function SectionTotalRow({
  totalNumberOfYears,
  totalSectionValues,
  label,
  color,
}: SectionTotalRowProps) {
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
      {Array.from({ length: totalNumberOfYears }, (_, index) => {
        return (
          <td
            key={index}
            className={clsx(
              'border-b border-gray-300 font-medium text-right text-sm px-1.5 py-1.5',
              color.bg,
              color.textAccent,
            )}
          >
            {totalSectionValues?.[index] ?? 0}
          </td>
        );
      })}
    </tr>
  );
}

interface DynamicSectionProps {
  sectionName: string;
  totalNumberOfYears: number;
  icon: string;
  color: SectionColor;
  children: ReactNode;
  totalSectionValues?: number[];
  onEditAssumption: () => void;
}
export function DynamicSection({
  sectionName,
  totalNumberOfYears,
  icon,
  color,
  children,
  totalSectionValues,
  // onEditAssumption,
}: DynamicSectionProps) {
  return (
    <>
      <SectionHeader
        title={sectionName}
        color={color}
        icon={icon}
        totalNumberOfYears={totalNumberOfYears}
      />
      {children}
      <SectionTotalRow
        totalNumberOfYears={totalNumberOfYears}
        totalSectionValues={totalSectionValues}
        label={'Total'}
        color={color}
        variant={'section'}
      />
    </>
  );
}

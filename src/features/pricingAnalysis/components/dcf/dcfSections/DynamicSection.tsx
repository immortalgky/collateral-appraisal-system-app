import type { SectionColor } from '@/features/pricingAnalysis/components/dcf/DiscountedCashFlowTable';
import { useState, type ReactNode } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import type { DCFSection } from '../../../types/dcf';
import { dcfSectionLabel } from '../../../domain/dcf/dcfNameLabel';
import { STK_CLASS, STK2_CLASS, YEAR_CELL_CLASS } from '../dcfTableCellStyles';

interface SectionHeaderProps {
  title: string;
  totalNumberOfYears: number;
  open: boolean;
  onToggle: () => void;
}
/** mock `band()` (mock:1412, CSS mock:172) — the grey collapsible band, not a coloured one. */
export function SectionHeader({ title, totalNumberOfYears, open, onToggle }: SectionHeaderProps) {
  return (
    <tr onClick={onToggle} className="cursor-pointer select-none">
      <td
        colSpan={2}
        className="border-b border-gray-300 px-[8px] py-0 h-[22px] leading-[21px] truncate bg-[#edf1f1] text-[11px] font-semibold tracking-[0.02em] text-[#55636f]"
      >
        <span
          className={clsx('inline-block w-[10px] transition-transform', !open && '-rotate-90')}
          aria-hidden
        >
          ▾
        </span>{' '}
        {title}
      </td>
      <td colSpan={totalNumberOfYears} className="border-b border-gray-300 h-[22px] bg-[#edf1f1]" />
    </tr>
  );
}

interface SectionTotalRowProps {
  totalSectionValues: number[];
  label: string;
}
/** mock `tr.tot` — font-weight 600 on surface-2, stays visible while the band is shut. */
function SectionTotalRow({ totalSectionValues, label }: SectionTotalRowProps) {
  return (
    <tr>
      <td className={clsx(STK_CLASS, 'bg-[#f8fafa] font-semibold')} title={label}>
        {label}
      </td>
      <td className={clsx(STK2_CLASS, 'bg-[#f8fafa]')} />
      {(totalSectionValues ?? []).map((val, index) => (
        <td key={index} className={clsx(YEAR_CELL_CLASS, 'bg-[#f8fafa] font-semibold')}>
          {(val ?? 0).toLocaleString()}
        </td>
      ))}
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
export function DynamicSection({ section, totalNumberOfYears, children }: DynamicSectionProps) {
  const { t } = useTranslation('pricingAnalysis');
  const [open, setOpen] = useState(true);
  const totalLabel =
    section.sectionType === 'income'
      ? t('methodTabs.dcf.sectionTotal.income')
      : section.sectionType === 'expenses'
        ? t('methodTabs.dcf.sectionTotal.expenses')
        : t('dcf.common.total');
  return (
    <>
      <SectionHeader
        title={dcfSectionLabel(t, section.sectionType, section.sectionName)}
        totalNumberOfYears={totalNumberOfYears}
        open={open}
        onToggle={() => setOpen(o => !o)}
      />
      {open && children}
      <SectionTotalRow totalSectionValues={section.totalSectionValues} label={totalLabel} />
    </>
  );
}

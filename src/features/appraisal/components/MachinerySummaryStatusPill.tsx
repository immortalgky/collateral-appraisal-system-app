import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import Icon from '@shared/components/Icon';
import type { MachinerySummaryStatus } from '../hooks/useMachinerySummaryStatus';

/**
 * "ยังไม่ได้บันทึก" / "จำนวนไม่ตรงกับรายการ" in amber, "✓ บันทึกแล้ว" in green. One component for
 * the Properties tab's strip and the summary page's heading, so the two never word it differently.
 */
export const MachinerySummaryStatusPill = ({ status }: { status: MachinerySummaryStatus }) => {
  const { t } = useTranslation('appraisal');
  const needsWork = status !== 'done';
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 text-[10.5px] font-semibold leading-[1.6]',
        needsWork
          ? 'border-amber-300 bg-amber-100/60 text-amber-800'
          : 'border-green-300 bg-green-50 text-green-700',
      )}
    >
      {status === 'done' && <Icon name="check" style="solid" className="text-[9px]" />}
      {t(`properties.machinerySummary.status.${status}`)}
    </span>
  );
};

export default MachinerySummaryStatusPill;

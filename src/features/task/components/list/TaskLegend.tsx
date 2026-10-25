import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { SLA_SWATCH } from './rowMarks';

/** What the row marks mean, in the table's footer: the SLA bars. */
export function TaskLegend() {
  const { t } = useTranslation('task');
  return (
    <div className="flex items-center gap-4 text-xs text-gray-500">
      <span className="inline-flex items-center gap-1.5">
        <i className={clsx('inline-block h-3 w-[3px] rounded-sm', SLA_SWATCH.breached)} />
        {t('legend.slaBreached')}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className={clsx('inline-block h-3 w-[3px] rounded-sm', SLA_SWATCH.atRisk)} />
        {t('legend.slaAtRisk')}
      </span>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import Icon from '@shared/components/Icon';

interface MonitoringCrisisBannerProps {
  total: number;
  breached: number;
  avgLateHours?: number;
}

/**
 * Renders a soft red crisis banner when >= 50% of tasks are breached
 * and total >= 3. Not dismissible — disappears automatically when threshold
 * drops below the trigger condition.
 */
function MonitoringCrisisBanner({ total, breached, avgLateHours }: MonitoringCrisisBannerProps) {
  const { t } = useTranslation('monitoring');

  if (total < 3 || breached / total < 0.5) return null;

  return (
    <div className="shrink-0 mb-3 bg-red-50 border border-red-200 text-red-900 rounded-lg p-3 flex items-start gap-3">
      <Icon
        style="solid"
        name="triangle-exclamation"
        className="size-4 text-red-600 mt-0.5 shrink-0"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium leading-snug">
          {t('common.crisis.headline', { breached, total })}
        </p>
        {avgLateHours != null && avgLateHours > 0 && (
          <p className="text-xs text-red-700 mt-0.5">
            {t('common.crisis.context', { hours: avgLateHours })}
          </p>
        )}
      </div>
    </div>
  );
}

export default MonitoringCrisisBanner;

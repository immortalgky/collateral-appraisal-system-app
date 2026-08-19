import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useUIStore } from '@shared/store';
import { DENSITY_OPTIONS } from './densityConstants';

/**
 * Segmented control for the UI density preference. Scales the whole app by
 * driving the root font-size (see densityConstants.ts / ThemeProvider), which
 * is how a 1280x720 laptop gets more usable workspace without any zoom.
 */
export default function DensityPicker(): React.ReactNode {
  const { t } = useTranslation('nav');
  const density = useUIStore(s => s.density);
  const setDensity = useUIStore(s => s.setDensity);

  return (
    <div className="px-3 py-3">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('density.label')}
      </p>
      <div
        role="radiogroup"
        aria-label={t('density.label')}
        className="flex items-center gap-0.5 rounded-lg bg-gray-50 dark:bg-base-300 p-0.5"
      >
        {DENSITY_OPTIONS.map(option => {
          const isActive = density === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => setDensity(option)}
              className={clsx(
                // flex-auto (not flex-1): labels differ in length, so each segment grows
                // from its own content instead of being forced into an equal third that
                // "Comfortable" overflows. min-w-0 + truncate keeps it inside the menu.
                'min-w-0 flex-auto truncate rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-white dark:bg-base-100 text-gray-900 dark:text-base-content shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-base-content',
              )}
            >
              {t(`density.${option}` as never)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

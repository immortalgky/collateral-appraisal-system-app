import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useUIStore } from '@shared/store';
import { DENSITY_OPTIONS } from './densityConstants';

/**
 * Segmented control for the UI density preference. Scales the whole app by
 * driving the root font-size (see densityConstants.ts / ThemeProvider), which
 * is how a 1280x720 laptop gets more usable workspace without any zoom.
 *
 * Follows the radiogroup keyboard contract: one tab stop for the whole group
 * (roving tabIndex), then arrows / Home / End move between the options.
 */
export default function DensityPicker(): React.ReactNode {
  const { t } = useTranslation('nav');
  const density = useUIStore(s => s.density);
  const setDensity = useUIStore(s => s.setDensity);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setDensity(DENSITY_OPTIONS[index]);
    buttonsRef.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = DENSITY_OPTIONS.length - 1;
    const current = Math.max(0, DENSITY_OPTIONS.indexOf(density));
    let next: number;

    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        next = current === 0 ? last : current - 1;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        next = current === last ? 0 : current + 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      default:
        return;
    }

    event.preventDefault();
    // The picker lives inside a Headless UI menu panel, which drives its own item
    // navigation off Arrow keys. Without this, Up/Down would move the density and
    // the menu highlight at the same time.
    event.stopPropagation();
    select(next);
  };

  return (
    <div className="px-3 py-3">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('density.label')}
      </p>
      <div
        role="radiogroup"
        aria-label={t('density.label')}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-0.5 rounded-lg bg-gray-50 dark:bg-base-300 p-0.5"
      >
        {DENSITY_OPTIONS.map((option, index) => {
          const isActive = density === option;
          return (
            <button
              key={option}
              ref={element => {
                buttonsRef.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              // Roving tabIndex: the group is a single tab stop, and Tab moves past
              // it rather than through every option.
              tabIndex={isActive ? 0 : -1}
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

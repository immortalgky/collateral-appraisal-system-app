import { useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { useUIStore } from '@shared/store';
import { FORM_LAYOUT_OPTIONS } from './formLayoutConstants';

/**
 * Segmented control for the appraisal form layout. Writes `data-form-layout` on
 * <html> via ThemeProvider; styles/formLayout.css turns that into a label column
 * and one field per row for screens that opt in with `.cas-form-grid`.
 *
 * Same keyboard contract as DensityPicker, for the same reason: it lives inside a
 * Headless UI menu panel that drives its own item navigation off the arrow keys.
 */
export default function FormLayoutPicker(): React.ReactNode {
  const { t } = useTranslation('nav');
  const formLayout = useUIStore(s => s.formLayout);
  const setFormLayout = useUIStore(s => s.setFormLayout);
  const buttonsRef = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    setFormLayout(FORM_LAYOUT_OPTIONS[index]);
    buttonsRef.current[index]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const last = FORM_LAYOUT_OPTIONS.length - 1;
    const current = Math.max(0, FORM_LAYOUT_OPTIONS.indexOf(formLayout));
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
    event.stopPropagation();
    select(next);
  };

  return (
    <div className="px-3 py-3">
      <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
        {t('formLayout.label')}
      </p>
      <div
        role="radiogroup"
        aria-label={t('formLayout.label')}
        onKeyDown={handleKeyDown}
        className="flex items-center gap-0.5 rounded-lg bg-gray-50 dark:bg-base-300 p-0.5"
      >
        {FORM_LAYOUT_OPTIONS.map((option, index) => {
          const isActive = formLayout === option;
          return (
            <button
              key={option}
              ref={element => {
                buttonsRef.current[index] = element;
              }}
              type="button"
              role="radio"
              aria-checked={isActive}
              tabIndex={isActive ? 0 : -1}
              onClick={() => setFormLayout(option)}
              className={clsx(
                'min-w-0 flex-auto truncate rounded-md px-1.5 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-white dark:bg-base-100 text-gray-900 dark:text-base-content shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-base-content',
              )}
            >
              {t(`formLayout.${option}` as never)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

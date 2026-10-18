import type { Ref } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon';

/** Width the text field keeps clear on its right so typed text never runs under the button. */
export const CALENDAR_BUTTON_PADDING = 'pr-10';

interface CalendarButtonProps {
  buttonRef: Ref<HTMLButtonElement>;
  /** aria-expanded / aria-haspopup / aria-controls from useCalendarFloating. */
  triggerProps: Record<string, unknown>;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * The calendar icon at the right end of a date field, drawn as a button: a 1.8rem hit area with a
 * hover tint and a focus ring. It sits over the input's right padding (see CALENDAR_BUTTON_PADDING)
 * and is centred, so it does not change the field's height.
 */
export function CalendarButton({
  buttonRef,
  triggerProps,
  disabled,
  onClick,
}: CalendarButtonProps) {
  const { t } = useTranslation('common');
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={t('actions.openCalendar', { defaultValue: 'Open calendar' })}
      {...triggerProps}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'absolute right-1 top-1/2 flex size-[1.8rem] -translate-y-1/2 items-center justify-center rounded-md transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        disabled
          ? 'cursor-not-allowed text-gray-400'
          : 'cursor-pointer text-primary hover:bg-primary/10 hover:text-primary-700',
      )}
    >
      <Icon style="regular" name="calendar" className="text-base" />
    </button>
  );
}

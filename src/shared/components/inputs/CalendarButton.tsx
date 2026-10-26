import type { Ref } from 'react';
import clsx from 'clsx';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon';
import { useFormLayout } from '../form/formLayoutContext';

/**
 * Width the text field keeps clear on its right so typed text never runs under the button: the
 * dropdown's trailing icon slot (DESIGN.md 17.3), 2.2857rem.
 */
export const CALENDAR_BUTTON_PADDING = 'pr-[2.2857rem]';

interface CalendarButtonProps {
  buttonRef: Ref<HTMLButtonElement>;
  /** aria-expanded / aria-haspopup / aria-controls from useCalendarFloating. */
  triggerProps: Record<string, unknown>;
  disabled?: boolean;
  onClick: () => void;
}

/**
 * The calendar icon at the right end of a date field, drawn as a button: an in-field icon button
 * (2rem Standard, 1.7143rem Compact, 17.3) with a hover tint. The 1.0714rem icon sits 0.7857rem from
 * the edge, where the dropdown's chevron does. It sits over the input's right padding (see
 * CALENDAR_BUTTON_PADDING) and is centred, so it does not change the field's height. Focus is the
 * global outline.
 */
export function CalendarButton({
  buttonRef,
  triggerProps,
  disabled,
  onClick,
}: CalendarButtonProps) {
  const { t } = useTranslation('common');
  const layout = useFormLayout();
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={t('actions.openCalendar', { defaultValue: 'Open calendar' })}
      {...triggerProps}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'absolute top-1/2 flex -translate-y-1/2 items-center justify-center rounded-md transition-colors',
        layout === 'standard' ? 'right-[0.3214rem] size-8' : 'right-[0.4643rem] size-[1.7143rem]',
        disabled
          ? 'cursor-not-allowed text-(--palette-gray-400)'
          : 'cursor-pointer text-(--palette-ink-2) hover:bg-(--palette-surface-3)',
      )}
    >
      <Icon style="regular" name="calendar" className="text-base" />
    </button>
  );
}

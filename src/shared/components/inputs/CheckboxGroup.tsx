import { Fragment, useId, useState } from 'react';
import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon';
import { useParameterAsCheckboxOptions } from '../../utils/parameterUtils';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import {
  chipClass,
  chipGroupGap,
  chipTogglePad,
  NO_GLOBAL_OUTLINE,
  ERROR_TEXT,
  REQUIRED_MARK,
} from './controlStyles';
import { OtherInput, OtherNote, type OtherSpec } from './OtherText';
import type { AtLeastOne } from '@/shared/types';

export interface CheckboxOption {
  value: string;
  label: string;
  icon?: string;
}

interface CheckboxGroupBaseProps {
  name: string;
  label?: string;
  required?: boolean;
  className?: string;
  wrap?: boolean;
  /** @deprecated Ignored: there is one checkbox chip (DESIGN.md 17.5). Kept so field configs compile. */
  variant?: 'tag' | 'chip' | 'button';
  /** @deprecated Ignored: the chip height follows the form layout. Kept so field configs compile. */
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Show clear all button when items are selected */
  showClearAll?: boolean;
  /** Minimum selections before showing clear all (default: 2) */
  clearAllThreshold?: number;
  /** The "อื่นๆ" companion field, typed inside its chip while that option is selected. */
  other?: OtherSpec;
}

type CheckboxGroupProps = CheckboxGroupBaseProps &
  AtLeastOne<{ group: string; options: CheckboxOption[] }>;

const CheckboxGroup = ({
  name,
  label,
  group,
  options,
  required,
  className,
  wrap = true,
  disabled: disabledProp = false,
  showClearAll = true,
  clearAllThreshold = 2,
  other,
}: CheckboxGroupProps) => {
  const { t } = useTranslation('common');
  const formReadOnly = useFormReadOnly();
  const layout = useFormLayout();
  const labelId = useId();
  const disabled = disabledProp || formReadOnly;
  const parameterOptions = useParameterAsCheckboxOptions(group ?? '');
  const resolvedOptions = options ?? parameterOptions;
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  const selectedValues: string[] = field.value || [];

  // Set when the appraiser picks the "other" chip, so its input takes focus; not on a loaded value.
  const [focusOther, setFocusOther] = useState(false);

  const handleToggle = (value: string) => {
    if (disabled) return;
    setFocusOther(value === other?.is && !selectedValues.includes(value));
    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    field.onChange(newValues);
  };

  const handleClearAll = () => {
    if (disabled) return;
    field.onChange([]);
  };

  const showClearButton = showClearAll && selectedValues.length >= clearAllThreshold;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      {label && (
        <label id={labelId} className="text-xs font-medium text-(--palette-ink)">
          {label}
          {required && <span className={REQUIRED_MARK}>*</span>}
        </label>
      )}
      <div
        role="group"
        aria-labelledby={label ? labelId : undefined}
        className={clsx('flex', chipGroupGap(layout), wrap && 'flex-wrap')}
      >
        {resolvedOptions.map(option => {
          const isSelected = selectedValues.includes(option.value);
          const withInput = !!other && isSelected && option.value === other.is;
          const toggle = (
            <button
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
              title={option.label}
              className={
                withInput
                  ? clsx(
                      'inline-flex min-w-0 shrink-0 items-center self-stretch rounded-l-full leading-normal',
                      NO_GLOBAL_OUTLINE,
                      chipTogglePad(layout),
                      disabled ? 'cursor-not-allowed' : 'cursor-pointer',
                    )
                  : chipClass(layout, isSelected, disabled)
              }
            >
              {isSelected && (
                // The check mark: 0.6429rem wide, 2px stroke, white, 0.4286rem before the label.
                <svg
                  aria-hidden="true"
                  viewBox="0 0 10 8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-[0.4286rem] w-[0.6429rem] shrink-0"
                >
                  <path d="M1 4.2 3.7 7 9 1" />
                </svg>
              )}
              {option.icon && (
                <Icon style="solid" name={option.icon} className="mr-[0.4286rem] shrink-0" />
              )}
              <span className="min-w-0 truncate">
                {option.label}
                {withInput && ':'}
              </span>
            </button>
          );
          if (!withInput) return <Fragment key={option.value}>{toggle}</Fragment>;
          return (
            <span key={option.value} className={chipClass(layout, true, disabled, true)}>
              {toggle}
              <OtherInput spec={other} disabled={disabled} focusOnMount={focusOther} />
            </span>
          );
        })}
        {showClearButton && (
          // A plain text button closing the chip row: not chip-shaped, but the same height so it
          // sits on the chips' baseline. Focus is the global outline.
          <button
            type="button"
            onClick={handleClearAll}
            disabled={disabled}
            aria-label={`${t('actions.clearAll')} (${selectedValues.length})`}
            className={clsx(
              'inline-flex items-center gap-1 rounded-full px-1 text-sm leading-normal whitespace-nowrap text-(--palette-ink-2) transition-colors',
              layout === 'standard' ? 'h-chip' : 'h-chip-c',
              disabled
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer hover:text-(--palette-ink) hover:underline',
            )}
          >
            <Icon name="xmark" />
            {t('actions.clear')} ({selectedValues.length})
          </button>
        )}
      </div>
      {other && selectedValues.includes(other.is) && <OtherNote spec={other} />}
      {error && (
        <p className={ERROR_TEXT}>
          {error.message && <ValidationText message={error.message} label={label} />}
        </p>
      )}
    </div>
  );
};

export default CheckboxGroup;

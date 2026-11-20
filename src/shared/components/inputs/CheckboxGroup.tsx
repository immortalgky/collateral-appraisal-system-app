import { useId, useState } from 'react';
import clsx from 'clsx';
import { useController, useFormContext } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Icon from '../Icon';
import { useParameterAsCheckboxOptions } from '../../utils/parameterUtils';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import { chipClass, chipGroupGap, ERROR_TEXT, REQUIRED_MARK } from './controlStyles';
import { ChipCheck, OtherChip, OtherNote, type OtherSpec } from './OtherText';
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
  /** Option values that stand alone: picking one clears the rest, picking any other clears it. */
  exclusiveValues?: string[];
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
  exclusiveValues,
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
    if (selectedValues.includes(value)) {
      field.onChange(selectedValues.filter(v => v !== value));
    } else if (exclusiveValues?.includes(value)) {
      field.onChange([value]);
    } else {
      field.onChange([...selectedValues.filter(v => !exclusiveValues?.includes(v)), value]);
    }
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
          if (other && isSelected && option.value === other.is)
            return (
              <OtherChip
                key={option.value}
                spec={other}
                layout={layout}
                disabled={disabled}
                focusOnMount={focusOther}
                optionLabel={option.label}
                onRemove={() => handleToggle(option.value)}
              />
            );
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleToggle(option.value)}
              disabled={disabled}
              aria-pressed={isSelected}
              title={option.label}
              className={chipClass(layout, isSelected, disabled)}
            >
              {isSelected && <ChipCheck />}
              {option.icon && (
                <Icon style="solid" name={option.icon} className="mr-[0.4286rem] shrink-0" />
              )}
              <span className="min-w-0 truncate">{option.label}</span>
            </button>
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

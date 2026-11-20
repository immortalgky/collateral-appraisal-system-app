import {
  RadioGroup as HeadlessRadioGroup,
  Radio as HeadlessRadio,
  Field,
  Label,
  Description,
} from '@headlessui/react';
import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import Icon from '../Icon';
import { useParameterAsRadioOptions } from '../../utils/parameterUtils';
import type { AtLeastOne } from '@/shared/types';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import { chipClass, chipGroupGap, ERROR_TEXT } from './controlStyles';
import { OtherChip, OtherNote, type OtherSpec } from './OtherText';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
  /** A retired parameter row is `false`; with `activeOnly` the group leaves it out. */
  isActive?: boolean;
}

interface RadioGroupBaseProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  error?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  name?: string;
  required?: boolean;
  /** Visual variant for radio buttons */
  variant?: 'default' | 'card' | 'button';
  /** The "อื่นๆ" companion field, typed inside its chip while that option is selected. */
  other?: OtherSpec;
  /** Leave retired options out of the list; one the value still holds stays, so a saved record shows it. */
  activeOnly?: boolean;
}

export type RadioGroupProps = RadioGroupBaseProps &
  AtLeastOne<{ group: string; options: RadioOption[] }>;

const RadioGroup = ({
  value,
  defaultValue,
  onChange,
  group,
  options,
  label,
  labelAddon,
  error,
  disabled = false,
  className,
  size = 'md',
  orientation = 'vertical',
  name,
  variant = 'default',
  other,
  activeOnly,
}: RadioGroupProps) => {
  const layout = useFormLayout();
  // Set when the appraiser picks the "other" chip, so its input takes focus; not on a loaded value.
  const [focusOther, setFocusOther] = useState(false);
  const handleChange = (next: string) => {
    setFocusOther(next === other?.is);
    onChange?.(next);
  };
  const parameterOptions = useParameterAsRadioOptions(group ?? '');
  const resolvedOptions = (options ?? parameterOptions).filter(
    o => !activeOnly || o.isActive !== false || o.value === value,
  );
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-[18px] w-[18px]',
    lg: 'h-6 w-6',
  };

  const dotSizeStyles = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  // Radio pill (DESIGN.md 17.5), the one look of 'button' and 'default'. Only 'card' differs.
  if (variant !== 'card') {
    return (
      <Field className={clsx('flex flex-col', className)}>
        {labelAddon ? (
          <div className="flex items-center gap-1.5 mb-2">
            {label && (
              <Label className="block text-xs font-medium text-(--palette-ink)">{label}</Label>
            )}
            {labelAddon}
          </div>
        ) : (
          label && (
            <Label className="block text-xs font-medium text-(--palette-ink) mb-2">{label}</Label>
          )
        )}

        <HeadlessRadioGroup
          value={value}
          defaultValue={defaultValue}
          onChange={handleChange}
          disabled={disabled}
          name={name}
          className={clsx('flex flex-wrap', chipGroupGap(layout))}
        >
          {resolvedOptions.map(option => {
            const isChecked = value === option.value;
            const isDisabled = !!(option.disabled || disabled);
            if (other && isChecked && option.value === other.is)
              return (
                <OtherChip
                  key={option.value}
                  spec={other}
                  layout={layout}
                  disabled={isDisabled}
                  focusOnMount={focusOther}
                  optionLabel={option.label}
                  onRemove={() => onChange?.('')}
                  check={false}
                  // Still a radio of the group, so arrow keys reach it; a click edits its text.
                  renderTextChip={chip => (
                    <HeadlessRadio
                      value={option.value}
                      disabled={chip.disabled}
                      aria-label={chip.label}
                      title={chip.title}
                      onClick={chip.onClick}
                      // A radio is no button: Space would only re-select it and Enter does nothing. Both edit, like a click.
                      onKeyDown={e => {
                        if (e.key !== ' ' && e.key !== 'Enter') return;
                        e.preventDefault();
                        chip.onClick();
                      }}
                      className={chip.className}
                    >
                      {chip.children}
                    </HeadlessRadio>
                  )}
                />
              );
            return (
              <HeadlessRadio
                key={option.value}
                value={option.value}
                disabled={isDisabled}
                title={option.label}
                onClick={() => {
                  if (isChecked) onChange?.('');
                }}
                className={chipClass(layout, isChecked, isDisabled)}
              >
                {option.icon && (
                  <Icon style="solid" name={option.icon} className="mr-[0.4286rem] shrink-0" />
                )}
                <span className="min-w-0 truncate">{option.label}</span>
              </HeadlessRadio>
            );
          })}
        </HeadlessRadioGroup>

        {other && value === other.is && <OtherNote spec={other} />}
        {error && (
          <Description className={clsx('mt-1', ERROR_TEXT)}>
            <ValidationText message={error} label={label} />
          </Description>
        )}
      </Field>
    );
  }

  // Card variant - renders as selectable cards
  return (
    <Field className={clsx('flex flex-col', className)}>
      {labelAddon ? (
        <div className="flex items-center gap-1.5 mb-2">
          {label && (
            <Label className="block text-xs font-medium text-(--palette-ink)">{label}</Label>
          )}
          {labelAddon}
        </div>
      ) : (
        label && (
          <Label className="block text-xs font-medium text-(--palette-ink) mb-2">{label}</Label>
        )
      )}

      <HeadlessRadioGroup
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        disabled={disabled}
        name={name}
        className={clsx(
          'flex gap-3',
          orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        )}
      >
        {resolvedOptions.map(option => (
          <HeadlessRadio
            key={option.value}
            value={option.value}
            disabled={option.disabled || disabled}
            onClick={() => {
              if (value === option.value) onChange?.('');
            }}
            className={clsx(
              'group relative flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200',
              'cursor-pointer data-disabled:cursor-not-allowed',
              'border-(--palette-line) hover:border-primary/40 hover:bg-(--palette-surface-2)',
              'data-checked:border-primary data-checked:bg-(--palette-accent-wash)',
              'data-disabled:bg-(--palette-surface-2) data-disabled:border-(--palette-line)',
              error && 'border-danger',
            )}
          >
            {/* Radio indicator */}
            <span
              className={clsx(
                'flex items-center justify-center rounded-full border-2 transition-all duration-200 shrink-0',
                sizeStyles[size],
                'border-(--palette-input-edge-hover) group-hover:border-primary/60',
                'group-data-checked:border-primary',
                'group-data-disabled:bg-(--palette-surface-3) group-data-disabled:border-(--palette-line-strong)',
              )}
            >
              <span
                className={clsx(
                  'rounded-full bg-primary opacity-0 transition-all duration-200',
                  'group-data-checked:opacity-100',
                  dotSizeStyles[size],
                )}
              />
            </span>

            {/* Label content */}
            <div className="flex flex-col min-w-0">
              <Label
                className={clsx(
                  'text-sm font-medium select-none',
                  'group-data-disabled:text-(--palette-gray-400)',
                  !(option.disabled || disabled) && 'text-(--palette-ink)',
                )}
              >
                {option.label}
              </Label>
              {option.description && (
                <Description className="text-xs text-(--palette-gray-500) mt-0.5">
                  {option.description}
                </Description>
              )}
            </div>
          </HeadlessRadio>
        ))}
      </HeadlessRadioGroup>

      {error && (
        <Description className={clsx('mt-1', ERROR_TEXT)}>
          <ValidationText message={error} label={label} />
        </Description>
      )}
    </Field>
  );
};

// Single Radio component for custom layouts
interface RadioProps {
  value: string;
  label?: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: ReactNode;
}

export const Radio = ({
  value,
  label,
  description,
  disabled = false,
  className,
  size = 'md',
  children,
}: RadioProps) => {
  const sizeStyles = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const dotSizeStyles = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <HeadlessRadio
      value={value}
      disabled={disabled}
      className={clsx(
        'group flex items-start gap-3 cursor-pointer data-disabled:cursor-not-allowed',
        className,
      )}
    >
      <span
        className={clsx(
          'flex items-center justify-center rounded-full border-2 transition-all duration-200 mt-0.5',
          sizeStyles[size],
          'border-(--palette-input-edge-hover) group-hover:border-primary/60 group-data-disabled:bg-(--palette-surface-3) group-data-disabled:border-(--palette-line-strong)',
          'group-data-checked:border-primary',
        )}
      >
        <span
          className={clsx(
            'rounded-full bg-primary opacity-0 transition-opacity duration-200',
            'group-data-checked:opacity-100',
            dotSizeStyles[size],
          )}
        />
      </span>

      {(label || description || children) && (
        <div className="flex flex-col">
          {label && (
            <Label
              className={clsx(
                'text-sm font-medium cursor-pointer select-none',
                'group-data-disabled:text-(--palette-gray-400)',
                !disabled && 'text-(--palette-ink)',
              )}
            >
              {label}
            </Label>
          )}
          {description && (
            <Description className="text-sm text-(--palette-gray-500)">{description}</Description>
          )}
          {children}
        </div>
      )}
    </HeadlessRadio>
  );
};

export default RadioGroup;

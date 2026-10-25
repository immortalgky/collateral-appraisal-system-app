import {
  Listbox as HeadlessListBox,
  ListboxButton as HeadlessListboxButton,
  ListboxOption as HeadlessListboxOption,
  ListboxOptions as HeadlessListboxOptions,
} from '@headlessui/react';
import { forwardRef, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '@/shared/components/form';
import { useFormLayout } from '@/shared/components/form/formLayoutContext';
import { ValidationText } from '@/shared/components/form/ValidationText';
import { Icon } from '@/shared/components';
import {
  controlFrame,
  controlPad,
  controlSkin,
  ERROR_TEXT,
  REQUIRED_MARK,
} from '@/shared/components/inputs/controlStyles';
import type { AtLeastOne } from '@/shared/types';
import { useParameterOptions } from '@/shared/utils/parameterUtils';

type DropdownProps = DropdownBaseProps &
  AtLeastOne<{ queryParameters: string; options: ListBoxItem[] }>;

interface DropdownBaseProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  placeholder?: string;
  onChange?: (value: any) => void;
  showValue?: boolean;
  error?: string;
  /**
   * A table cell trigger (DESIGN.md 17.7): 28px in a Compact form, the plain Standard control in a
   * Standard one. Use it in the form table kit instead of `dense`.
   */
  cell?: boolean;
  /**
   * The pricing-analysis grids' 21px trigger (their own mock), outside the form system. Not for
   * forms: a form table cell uses `cell`.
   */
  dense?: boolean;
  /** False drops the blank "please select" entry, for fields that must always hold a value. */
  allowEmpty?: boolean;
  /** Missing-fields chip: the form path, and the label to name it by (see `RHFInputCell`). */
  'data-field'?: string;
  'data-grid-cell'?: string;
  'data-field-label'?: string;
}

interface ListBoxProps {
  value: string | null | unknown;
  onChange?: (value: any) => void;
  placeholder: string;
  selected?: ListBoxItem | null;
  children: ReactNode;
  disabled?: boolean;
  showValue?: boolean;
  error?: string;
  dense?: boolean;
  cell?: boolean;
}

interface ListBoxOptionProps {
  children: ReactNode;
  value: ListBoxItem | null;
}

export type ListBoxItem = {
  value: string | null | undefined;
  label: string;
  id?: string | number;
  colorClass?: string;
  showValue?: boolean;
};

const TDropdown = forwardRef<HTMLButtonElement, DropdownProps>(
  (
    {
      queryParameters,
      options,
      value,
      onChange,
      label,
      placeholder = 'Please select',
      error,
      required,
      disabled,
      showValue = true,
      dense = false,
      cell = false,
      allowEmpty = true,
      'data-field': dataField,
      'data-grid-cell': dataGridCell,
      'data-field-label': dataFieldLabel,
      ...props
    },
    ref,
  ) => {
    const isReadOnly = useFormReadOnly();
    const isDisabled = disabled || isReadOnly;

    const paramOptions = useParameterOptions(queryParameters ?? '');
    let dropdownOptions = useMemo<ListBoxItem[]>(() => {
      if (options !== undefined) return options;
      return paramOptions;
    }, [options, paramOptions]);

    // to allow selecting placeholder
    if (allowEmpty) {
      dropdownOptions = [{ value: null, label: placeholder, id: '' }, ...dropdownOptions];
    }

    const isControlled = onChange !== undefined && value !== undefined;

    // Derive the display label from current value
    const selectedOption = useMemo(
      () => dropdownOptions.find(o => o.value === value) ?? null,
      [dropdownOptions, value],
    );

    const selectedOnChange = (opt: ListBoxItem) => {
      if (isControlled) {
        onChange(opt.value);
      }
    };

    return (
      <div
        className={clsx('w-full', props.className)}
        data-field={dataField}
        data-grid-cell={dataGridCell}
        data-field-label={dataFieldLabel}
      >
        {label && (
          <div className="block text-xs font-medium text-(--palette-ink) mb-1">
            {label}
            {required && <span className={REQUIRED_MARK}>*</span>}
          </div>
        )}
        <ListBox
          ref={ref}
          value={value === undefined ? undefined : selectedOption}
          onChange={selectedOnChange}
          selected={selectedOption}
          placeholder={placeholder}
          disabled={isDisabled}
          showValue={showValue}
          error={error}
          dense={dense}
          cell={cell}
        >
          {dropdownOptions.map(option => (
            <ListBoxOption key={option.id ?? option.value} value={option}>
              <span className={clsx(option.colorClass, 'truncate')}>{option.label}</span>
            </ListBoxOption>
          ))}
        </ListBox>
        {error && (
          <div className={clsx('mt-1', ERROR_TEXT)}>
            <ValidationText message={error} label={label} />
          </div>
        )}
      </div>
    );
  },
);

const ListBox = forwardRef<HTMLButtonElement, ListBoxProps>(
  ({ placeholder, selected, children, disabled, showValue, error, dense, cell, ...props }, ref) => {
    const layout = useFormLayout();
    return (
      <HeadlessListBox disabled={disabled} by="value" {...props}>
        <div className="relative">
          <HeadlessListboxButton
            ref={ref}
            className={clsx(
              'relative w-full text-left',
              dense
                ? clsx(
                    // Dense follows the mock's `select.in` exactly (pricing-analysis-compact-mock.html:
                    // 192-198): 21px tall, 4px radius, 12px text, quiet #f6f9f9 fill with a
                    // transparent border at rest — border only on hover/focus. `ring-2` stays defined
                    // so an error state still gets a visible ring; the non-error case neutralises it
                    // with `focus:ring-transparent` instead of dropping the width utility.
                    // `block` is load-bearing, not cosmetic: a <button> is inline-block, so it
                    // sits in a line box and the strut's descender space is added under it.
                    // Inside a 26px scoring-grid cell that made the whole row 28px (21px button
                    // + ~7px of baseline gap) while every row without a select stayed at 26.
                    // As a block box it takes its own 21px and nothing else.
                    'block h-[21px] rounded-[4px] border text-[12px] leading-none pr-9 transition-colors duration-200 focus:outline-none focus:ring-2',
                    disabled
                      ? 'bg-(--palette-surface-2) text-(--palette-gray-500) cursor-not-allowed'
                      : 'bg-(--palette-surface-2) hover:border-(--palette-line-strong)',
                    error
                      ? 'border-danger text-danger-900 dark:text-(--palette-danger) focus:ring-danger/20 focus:border-danger'
                      : 'border-transparent text-(--palette-ink) focus:ring-transparent focus:border-primary-600 focus:bg-(--form-input-bg)',
                  )
                : // The form-system box (17.3): the same trigger as `inputs/Dropdown`.
                  clsx(
                    'flex items-center leading-normal',
                    controlFrame(layout, cell),
                    controlPad(layout, cell, 'l'),
                    'pr-[2.2857rem]',
                    controlSkin({ error: !!error, disabled, trigger: true }),
                  ),
            )}
          >
            <span
              className={clsx(
                'absolute inset-y-0 flex items-center pointer-events-none',
                dense
                  ? 'right-0 pr-3 text-(--palette-gray-400)'
                  : 'right-[0.7857rem] text-base text-(--palette-ink-2)',
              )}
            >
              <Icon style="regular" name="chevron-down" />
            </span>
            <span
              className={clsx(
                'min-w-0 truncate',
                dense && 'block px-1.5 py-0.5 leading-none',
                selected?.colorClass,
              )}
            >
              {selected?.value ? (
                showValue ? (
                  `${selected.value} - ${selected.label}`
                ) : (
                  `${selected.label}`
                )
              ) : (
                <span className="text-(--palette-gray-400)">{placeholder}</span>
              )}
            </span>
          </HeadlessListboxButton>
          <HeadlessListboxOptions
            anchor="bottom"
            className="w-(--button-width) mt-1 bg-(--palette-surface) text-(--palette-ink) rounded-lg border border-(--palette-line) shadow-lg py-1 z-50 max-h-80 overflow-y-auto"
          >
            {children}
          </HeadlessListboxOptions>
        </div>
      </HeadlessListBox>
    );
  },
);
ListBox.displayName = 'ListBox';
TDropdown.displayName = 'Dropdown';

const ListBoxOption = ({ children, value, ...props }: ListBoxOptionProps) => {
  return (
    <HeadlessListboxOption
      value={value}
      className={clsx(
        'group flex gap-2 px-3 py-2 text-sm leading-normal cursor-pointer transition-colors',
        'data-focus:bg-(--palette-surface-3)',
        'data-selected:bg-(--palette-accent-wash) data-selected:font-medium',
        'data-selected:data-focus:bg-(--palette-accent-line)',
      )}
      {...props}
    >
      {({ selected }) => (
        <div className="flex items-center gap-2 w-full">
          {selected && <Icon style="solid" name="check" className="text-(--palette-gray-600)" />}
          <span className={clsx('truncate', selected ? '' : 'ml-5')}>{children}</span>
        </div>
      )}
    </HeadlessListboxOption>
  );
};

export default TDropdown;

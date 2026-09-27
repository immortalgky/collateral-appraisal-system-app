import { NumberInput, TextInput, Toggle } from '@/shared/components';
import clsx from 'clsx';
import { createContext, useContext } from 'react';
import { useController, useFormContext, useFormState } from 'react-hook-form';
import TDropdown, { type ListBoxItem } from './TDropdown';

// When true, every RHFInputCell inside this subtree renders plain text instead
// of an input control. Used by the "View Assumption Summary" modal so the
// existing method-modal layouts can be reused as a read-only summary without
// duplicating structure or passing isReadOnly props through every component.
const DisplayOnlyContext = createContext(false);

export const DisplayOnlyProvider = DisplayOnlyContext.Provider;

// When true, every RHFInputCell inside this subtree renders its compact sizing by
// default (smaller padding, text-xs) instead of threading a `dense` prop through every
// call site. Opt-in — wrap only the pricing-analysis scoring grids / ComparativeFactorTable
// in <DenseProvider value>; everywhere else keeps rendering at today's size. A `dense`
// prop passed directly to a single RHFInputCell still wins over the ambient context.
const DenseContext = createContext(false);

export const DenseProvider = DenseContext.Provider;

export function toNumber(v: any): number | null {
  if (v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;

  const raw = String(v ?? '')
    .replace(/,/g, '')
    .trim();
  if (raw === '' || raw === '-') return null;

  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

interface RHFInputCellProps {
  fieldName: string;
  inputType?: 'number' | 'select' | 'text' | 'display' | 'toggle';
  disabled?: boolean;
  number?: {
    label?: string;
    decimalPlaces?: number;
    maxIntegerDigits?: number;
    allowNegative?: boolean;
    maxValue?: number;
    minValue?: number;
  };
  toggle?: {
    checked: unknown;
    options: [string, string];
  };
  text?: {
    label?: string;
    maxLength?: number;
  };
  dropdown?: {
    label?: string;
    showValue?: boolean;
    group?: string;
  };
  options?: ListBoxItem[];
  /** Optional element rendered inside the input on the right (number inputs only). */
  rightIcon?: React.ReactNode;
  /** Extra classes for the number input element (e.g. wider right padding for a rightIcon). */
  inputClassName?: string;
  /**
   * Native `size` — the input's intrinsic width in characters. Set this only when a table column
   * is being held open by the browser's 20-character default: a percentage width contributes
   * nothing to intrinsic sizing, so the `w-full` below cannot shrink a column under
   * `table-layout: auto`, and the 20-char default becomes the column's content width.
   *
   * It is a floor, not a cap — the input still stretches to `w-full`, so a wider header still
   * wins and no text can be clipped. That is the whole reason to reach for this instead of a
   * px width on the cell, which clips `whitespace-nowrap` headers across the next border.
   * Undefined everywhere else, so the attribute is omitted and no existing caller changes.
   */
  inputSize?: number;
  onUserChange?: (value: number | null) => number | null;
  onSelectChange?: (value: string) => void;
  accessor?: (args: {
    value: number | string;
    getValues: any;
    getFieldState: any;
    formState: any;
  }) => React.ReactNode;
  /**
   * Opt-in compact sizing for dense table cells (26px rows) — the pricing-analysis
   * scoring grids and ComparativeFactorTable. Defaults to false so every other caller
   * renders exactly as before; forwarded to the underlying input/select/toggle.
   */
  dense?: boolean;
}
export const RHFInputCell = ({
  fieldName,
  inputType,
  disabled,
  number,
  toggle,
  text,
  dropdown,
  options,
  rightIcon,
  inputClassName,
  inputSize,
  onUserChange,
  onSelectChange,
  accessor,
  dense: denseProp,
}: RHFInputCellProps) => {
  const { control, getValues, getFieldState } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: fieldName });
  const formState = useFormState({ control });

  const displayOnly = useContext(DisplayOnlyContext);
  const contextDense = useContext(DenseContext);
  const dense = denseProp ?? contextDense;
  if (displayOnly && inputType !== 'display') {
    const raw = field.value;
    let rendered: React.ReactNode;
    if (inputType === 'number') {
      const n = toNumber(raw);
      rendered =
        n == null
          ? '—'
          : n.toLocaleString(undefined, {
              maximumFractionDigits: number?.decimalPlaces ?? 4,
              minimumFractionDigits: number?.decimalPlaces ?? 0,
            });
    } else if (inputType === 'select') {
      const match = (options ?? []).find(o => o.value === raw);
      rendered = match?.label ?? (raw ? String(raw) : '—');
    } else if (inputType === 'toggle') {
      const opts: [string, string] = toggle?.options ?? ['No', 'Yes'];
      rendered = raw ? opts[1] : opts[0];
    } else {
      rendered = raw == null || raw === '' ? '—' : String(raw);
    }
    return <span className="text-xs text-gray-800">{rendered}</span>;
  }

  if (inputType === 'number') {
    return (
      <NumberInput
        {...field}
        label={number?.label ?? ''}
        value={field.value ?? ''}
        decimalPlaces={number?.decimalPlaces}
        maxIntegerDigits={number?.maxIntegerDigits}
        onChange={e => {
          const parsed = toNumber(e.target.value);
          const next = onUserChange ? onUserChange(parsed as any) : parsed;
          field.onChange(next);
        }}
        max={number?.maxValue}
        min={number?.minValue}
        allowNegative={number?.allowNegative ?? true}
        disabled={disabled}
        error={error?.message}
        inputMode="numeric"
        size={inputSize}
        rightIcon={rightIcon}
        dense={dense}
        // This used to hardcode `rounded-lg px-1.5 py-0.5 text-xs` for every caller —
        // NumberInput's own `dense` branch now owns that sizing (4px radius, 0 vertical
        // padding, 12px text, to match the mock's `.in`), so passing it again here fought
        // it: className is last in NumberInput's own clsx(), and which of two radius/
        // padding utilities wins depends on Tailwind's compiled stylesheet order, not
        // this call site — same trap as the `dense` border colour work. Non-dense callers
        // keep exactly what they had.
        className={clsx(
          'w-full focus:scroll-smooth',
          !dense && 'border border-gray-300 rounded-lg px-1.5 py-0.5 text-xs',
          disabled && 'opacity-50 cursor-not-allowed bg-gray-100',
          inputClassName,
        )}
      />
    );
  }

  if (inputType === 'select') {
    return (
      <TDropdown
        {...field}
        value={field.value ?? ''}
        onChange={(value: any) => {
          field.onChange(value);
          onSelectChange?.(value);
        }}
        label={dropdown?.label ?? ''}
        options={options}
        queryParameters={dropdown?.group ?? ''}
        showValue={dropdown?.showValue ?? true}
        error={error?.message}
        dense={dense}
      />
    );
  }

  if (inputType === 'toggle') {
    return (
      <Toggle
        {...field}
        options={toggle?.options ?? ['No', 'Yes']}
        checked={field.value}
        size={dense ? 'sm' : 'md'}
        onChange={e => {
          const next = onUserChange ? onUserChange(e as any) : e;
          field.onChange(next);
        }}
      ></Toggle>
    );
  }

  // text default
  if (inputType === 'text') {
    return (
      <TextInput
        {...field}
        value={field.value ?? ''}
        onChange={e => {
          const next = onUserChange ? onUserChange(e as any) : e;
          field.onChange(next);
        }}
        label={text?.label ?? ''}
        error={error?.message}
        maxLength={text?.maxLength}
        dense={dense}
      />
    );
  }

  if (inputType === 'display') {
    const value = getValues(fieldName) ?? '';
    return accessor ? accessor({ value, getValues, getFieldState, formState }) : value;
  }
};

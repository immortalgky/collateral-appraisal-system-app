/**
 * Shared by the inline-edited tables (BuildingDetail, SurfaceTable): the pricing tables' dense
 * look — grey-filled cells that show a border only on hover/focus — and a number cell that turns
 * into plain text when the form is read-only.
 */
import clsx from 'clsx';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { NumberInput } from '@/shared/components';

export const toNum = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** Every figure in this table carries two decimals, the way the Cost of Building table shows them. */
export const money2 = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n)
    ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : v;
};

// Bottom edge only: no column rules in the header (asked for), and no outer frame — the card around
// the table draws that, and a cell border on top of it doubled the line along the edges.
// Lines use the theme's base-300 so they darken with the form's own row rules (see formLayout.css).
export const TH = 'border-b border-base-300 px-2 py-1.5 font-medium';
export const TD = 'border-b border-base-300 px-2 py-1.5';
export const NUM = `${TD} text-right`;
/** The dense NumberInput's look (grey fill, border on hover/focus) for text and other non-number cells. */
export const FIELD =
  'block h-[1.625rem] w-full rounded-[4px] border border-transparent bg-[#f6f9f9] px-[5px] py-0 text-[0.875rem] hover:border-[#cbd5d3] focus:border-[#0d9488] focus:bg-white focus:outline-none';

/** A number cell: plain text when read-only, otherwise the dense input the pricing tables use. */
export function NumCell({
  name,
  readOnly,
  digits = 2,
  maxInt = 15,
  invalid = false,
}: {
  name: string;
  readOnly: boolean;
  digits?: number;
  maxInt?: number;
  invalid?: boolean;
}) {
  const { control } = useFormContext();
  const value = useWatch({ name });
  if (readOnly) return <>{digits ? money2(toNum(value)) : toNum(value)}</>;
  return (
    <Controller
      name={name}
      control={control}
      // No ref for RHF: the input takes a `value` prop, and reset() writing into the DOM node
      // behind React's back blanks it (see BuildingDetail's summaryField).
      render={({ field }) => (
        <NumberInput
          name={field.name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          dense
          decimalPlaces={digits}
          maxIntegerDigits={maxInt}
          // The shared dense input is sized in px for the pricing grids; here it follows the
          // form's rem scale like the cells around it.
          className={clsx('h-[1.625rem]! text-[0.875rem]!', invalid && 'border-red-400!')}
        />
      )}
    />
  );
}

import clsx from 'clsx';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { getTypeDotColor } from '../utils/propertyTypeConfig';

interface PropertyTypeChipProps {
  /** Property type code (or legacy display name). */
  code: string;
  /** A coloured dot and plain text instead of a filled pill — for dense rows and headers. */
  variant?: 'pill' | 'dot';
  /** Rendered before the label, e.g. the count in a group header. */
  prefix?: React.ReactNode;
  className?: string;
}

/**
 * The property type, wherever it is named in the Properties tab.
 *
 * It replaces the shared `Badge type="property"` here for one reason: Badge carries its own
 * palette (emerald, purple) while the picker, the card grid and the split view draw from
 * `typeToDotColor` (green, violet). Both were on screen at once, so the same property type was
 * two slightly different colours depending on where you looked.
 *
 * Tint and border are derived from the text colour with `color-mix`, so a type only ever needs
 * one colour defined — the way the mock built it.
 */
export const PropertyTypeChip = ({
  code,
  variant = 'pill',
  prefix,
  className,
}: PropertyTypeChipProps) => {
  const tone = getTypeDotColor(code).replace('bg-', 'text-');

  if (variant === 'dot') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap text-[0.7rem] text-gray-700',
          className,
        )}
      >
        <i className={clsx('size-1.5 shrink-0 rounded-full', getTypeDotColor(code))} />
        {prefix}
        <ParameterDisplay group="PropertyType" code={code} fallback={code} />
      </span>
    );
  }

  return (
    <span
      className={clsx(
        // Sizes taken from the mock: 0.66rem text in 0.02rem/0.42rem padding. It sits beside a
        // 0.8rem title, so anything larger competes with the property's own name.
        'inline-flex items-center whitespace-nowrap rounded-full border px-[0.42rem] py-[0.02rem] text-[0.66rem] font-semibold leading-[1.4]',
        tone,
        className,
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
        borderColor: 'color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {prefix}
      <ParameterDisplay group="PropertyType" code={code} fallback={code} />
    </span>
  );
};

export default PropertyTypeChip;

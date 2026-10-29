import clsx from 'clsx';
import ParameterDisplay from '@shared/components/ParameterDisplay';
import { getTypeDotColor } from '../utils/propertyTypeConfig';

/**
 * Size of the `sm` pill. Taken from the mock: 0.66rem text in 0.02rem/0.42rem padding. It sits beside a
 * 0.8rem title, so anything larger competes with the property's own name. Exported so the status chips
 * on the same line (PropertyCardContent) are built from it and cannot drift from it.
 */
export const PILL_SM_BOX = 'px-[0.42rem] py-[0.02rem] text-[0.66rem] font-semibold leading-[1.4]';

interface PropertyTypeChipProps {
  /** Property type code (or legacy display name). */
  code: string;
  /** A coloured dot and plain text instead of a filled pill — for dense rows and headers. */
  variant?: 'pill' | 'dot';
  /** `md` is the form header's pill (DESIGN.md 17.8); `sm` the one in dense lists. */
  size?: 'sm' | 'md';
  /** Rendered before the label, e.g. the count in a group header. */
  prefix?: React.ReactNode;
  /** Rendered after the label, e.g. " (PMA)". */
  suffix?: React.ReactNode;
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
  size = 'sm',
  prefix,
  suffix,
  className,
}: PropertyTypeChipProps) => {
  const tone = getTypeDotColor(code).replace('bg-', 'text-');

  if (variant === 'dot') {
    return (
      <span
        className={clsx(
          'inline-flex items-center gap-1.5 whitespace-nowrap text-[0.7rem] text-(--palette-ink)',
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
        'inline-flex items-center whitespace-nowrap rounded-full border',
        size === 'md'
          ? 'px-2.5 text-xs font-medium leading-normal'
          : PILL_SM_BOX,
        tone,
        className,
      )}
      style={{
        backgroundColor: 'color-mix(in srgb, currentColor 10%, transparent)',
        borderColor: 'color-mix(in srgb, currentColor 28%, transparent)',
      }}
    >
      {/* The tint and border come from the tone; the text is the tone pulled toward the theme's
          ink, so it stays ≥4.5:1 on the tint in both themes (a 700 shade on a dark card is ~3:1). */}
      <span
        className="inline-flex items-center"
        style={{ color: 'color-mix(in srgb, currentColor 55%, var(--palette-ink))' }}
      >
        {prefix}
        <ParameterDisplay group="PropertyType" code={code} fallback={code} />
        {suffix && <span className="ml-1">{suffix}</span>}
      </span>
    </span>
  );
};

export default PropertyTypeChip;

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '../form/context';
import { useFormLayout } from '../form/formLayoutContext';
import { ValidationText } from '../form/ValidationText';
import { ERROR_TEXT, REQUIRED_MARK } from './controlStyles';

interface ToggleProps {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  options: [string, string];
  error?: string;
  required?: boolean;
  /**
   * `md` follows the form layout (DESIGN.md 17.5). `sm` is the 12px toggle of the pricing-analysis
   * grids, outside the form system.
   */
  size?: 'sm' | 'md';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Track padding, option height and side padding per layout. The whole control is 36px in Standard
 * (28 + 2 × 4), the control height, and 30px in Compact (26 + 2 × 2). The sliding pill is inset by
 * the same padding so it sits exactly behind the active option.
 */
const GEOMETRY = {
  standard: {
    track: 'p-[0.2857rem]',
    pill: 'inset-y-[0.2857rem]',
    option: 'h-8 px-[1.1429rem]',
  },
  compact: {
    track: 'p-[0.1429rem]',
    pill: 'inset-y-[0.1429rem]',
    option: 'h-chip-c px-[0.8571rem]',
  },
  small: { track: 'p-1', pill: 'inset-y-1', option: 'py-1 px-3' },
} as const;

const Toggle = ({
  label,
  labelAddon,
  options,
  error,
  required,
  className,
  disabled,
  size = 'md',
  checked,
  onChange,
}: ToggleProps) => {
  const isReadOnly = useFormReadOnly();
  const isDisabled = disabled || isReadOnly;
  const layout = useFormLayout();
  const geometry = GEOMETRY[size === 'sm' ? 'small' : layout];

  // Treat undefined/null as false (first option active)
  const activeIndex = checked ? 1 : 0;
  const [firstOption, secondOption] = options;

  // The pill is sized and placed from the active button, so options may be any width.
  const trackRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const pillRef = useRef<{ x: number; w: number } | null>(null);
  const [pill, setPill] = useState<{ x: number; w: number } | null>(null);
  // Off until the pill has been measured twice, so it does not fly in from 0 on first paint
  // (or when a hidden section is opened and the first real measurement arrives).
  const [animate, setAnimate] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const button = buttonRefs.current[activeIndex];
      if (!button) return;
      const next = { x: button.offsetLeft, w: button.offsetWidth };
      const prev = pillRef.current;
      if (prev?.x === next.x && prev.w === next.w) return;
      pillRef.current = next;
      setAnimate(!!prev && prev.w > 0 && next.w > 0);
      setPill(next);
    };
    measure();
    // A font or density change resizes the buttons without touching the active index.
    if (typeof ResizeObserver === 'undefined' || !trackRef.current) return;
    const observer = new ResizeObserver(measure);
    observer.observe(trackRef.current);
    return () => observer.disconnect();
  }, [activeIndex, firstOption, secondOption, size, layout]);

  const handleClick = (index: number) => {
    if (isDisabled) return;
    onChange?.(index !== 0);
  };

  return (
    <div className={clsx('text-sm', className)}>
      <fieldset>
        {/* The addon goes INSIDE the legend, never in a wrapper around it: <legend> must be a
            direct child of <fieldset> or assistive technology loses the group's name. */}
        {label && (
          <legend
            className={clsx(
              'text-xs font-medium text-(--palette-ink) mb-1.5',
              labelAddon && 'flex items-center gap-1.5',
            )}
          >
            {label}
            {required && <span className={REQUIRED_MARK}>*</span>}
            {labelAddon}
          </legend>
        )}
        <div
          ref={trackRef}
          className={clsx(
            'relative inline-flex rounded-full transition-colors duration-200',
            geometry.track,
            // The error ring is inset so it adds no height: the control stays the control height.
            error
              ? 'bg-(--palette-req-wash) ring-1 ring-inset ring-danger'
              : 'bg-(--palette-surface-3)',
          )}
          role="radiogroup"
          aria-label={label || `Toggle between ${options.join(' and ')}`}
        >
          {/* Sliding pill: coloured here, not on the buttons, so the options stay transparent and
              the selected one is whichever the pill sits behind. */}
          {pill && (
            <span
              className={clsx(
                'absolute left-0 rounded-full',
                geometry.pill,
                animate &&
                  'transition-[transform,width] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                // danger-600: white on the brand red is 3.8:1.
                error ? 'bg-danger-600' : isDisabled ? 'bg-gray-500' : 'bg-primary-700',
              )}
              style={{ width: pill.w, transform: `translateX(${pill.x}px)` }}
              aria-hidden="true"
            />
          )}

          {options.map((option, index) => {
            const isActive = index === activeIndex;
            return (
              <button
                key={index}
                ref={el => {
                  buttonRefs.current[index] = el;
                }}
                type="button"
                role="radio"
                aria-checked={isActive}
                disabled={isDisabled}
                onClick={() => handleClick(index)}
                className={clsx(
                  'relative z-10 flex items-center justify-center rounded-full select-none font-medium leading-normal whitespace-nowrap transition-colors duration-200',
                  size === 'sm' ? 'text-xs' : 'text-sm',
                  geometry.option,
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  isActive
                    ? 'text-white'
                    : isDisabled
                      ? 'text-(--palette-gray-400)'
                      : 'text-(--palette-ink)',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {error && (
          <p className={clsx('mt-1', ERROR_TEXT)}>
            <ValidationText message={error} label={label} />
          </p>
        )}
      </fieldset>
    </div>
  );
};

export default Toggle;

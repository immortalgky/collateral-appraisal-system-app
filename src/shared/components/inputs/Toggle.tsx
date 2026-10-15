import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useFormReadOnly } from '../form/context';

interface ToggleProps {
  label?: string;
  /** Node rendered next to the label, outside it (e.g. a FieldHelp "?" button) */
  labelAddon?: ReactNode;
  options: [string, string];
  error?: string;
  required?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

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
  }, [activeIndex, firstOption, secondOption, size]);

  const sizeStyles = {
    sm: {
      container: 'p-1 text-xs',
      option: 'py-1 px-3',
    },
    md: {
      container: 'p-1 text-sm',
      // The container's p-1 plus this makes the whole control as tall as a text input
      // (py-2 + 1px border either side): 0.25rem + 1px, in rem so it holds at every root size.
      // Same text-sm as the input, so text and line height match and so does the height.
      option: 'py-[calc(0.25rem+1px)] px-4 text-sm',
    },
  };

  const handleClick = (index: number) => {
    if (isDisabled) return;
    onChange?.(index !== 0);
  };

  return (
    <div className={clsx('text-sm', className)}>
      <fieldset>
        {/* The addon goes INSIDE the legend, never in a wrapper around it: <legend> must be a
            direct child of <fieldset> or assistive technology loses the group's name. The grid
            form layout also hoists [data-field-label] out of this component with
            `display: contents`, so an element in between would take the label column and stretch. */}
        {label && (
          <legend
            data-field-label
            className={clsx(
              'text-xs font-medium text-gray-700 mb-1.5',
              labelAddon && 'flex items-center gap-1.5',
            )}
          >
            {label}
            {required && <span className="text-danger ml-0.5">*</span>}
            {labelAddon}
          </legend>
        )}
        <div
          ref={trackRef}
          className={clsx(
            'relative inline-flex rounded-full transition-colors duration-200',
            sizeStyles[size].container,
            error ? 'border border-danger bg-danger-50' : 'bg-gray-100/80',
            isDisabled && 'opacity-60',
          )}
          role="radiogroup"
          aria-label={label || `Toggle between ${options.join(' and ')}`}
        >
          {/* Sliding pill: coloured and shadowed here, not on the buttons, so the form-grid skins
              (formLayoutSkin.css) can recolour it as `[role=radiogroup] > span`. */}
          {pill && (
            <span
              className={clsx(
                'absolute inset-y-1 left-0 rounded-full',
                animate &&
                  'transition-[transform,width] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none',
                error
                  ? 'bg-danger'
                  : 'bg-primary shadow-[0_2px_6px_color-mix(in_srgb,var(--color-primary)_25%,transparent)]',
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
                  'relative z-10 flex items-center justify-center rounded-full select-none font-medium whitespace-nowrap transition-colors duration-200',
                  sizeStyles[size].option,
                  isDisabled ? 'cursor-not-allowed' : 'cursor-pointer',
                  isActive
                    ? 'text-white'
                    : isDisabled
                      ? 'text-gray-400'
                      : 'text-gray-600 hover:text-gray-700',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
        {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
      </fieldset>
    </div>
  );
};

export default Toggle;

import { useEffect, useId, useRef, useState } from 'react';
import clsx from 'clsx';

export interface ScrollableSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

type ScrollableSelectVariant = 'bordered' | 'ghost';

interface ScrollableSelectProps {
  value: string;
  options: ScrollableSelectOption[];
  onChange: (value: string) => void;
  id?: string;
  ariaLabel?: string;
  className?: string;
  buttonClassName?: string;
  listClassName?: string;
  maxHeightClass?: string;
  placement?: 'bottom' | 'top';
  variant?: ScrollableSelectVariant;
}

const VARIANT_BUTTON_CLASS: Record<ScrollableSelectVariant, string> = {
  bordered:
    'px-2 py-1 border border-gray-200 rounded text-xs bg-white hover:border-gray-300 focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
  ghost:
    'px-1.5 py-0.5 rounded text-sm font-semibold text-gray-800 bg-transparent border border-transparent hover:bg-gray-100 focus:ring-2 focus:ring-gray-200',
};

export function ScrollableSelect({
  value,
  options,
  onChange,
  id,
  ariaLabel,
  className,
  buttonClassName,
  listClassName,
  maxHeightClass = 'max-h-48',
  placement = 'bottom',
  variant = 'bordered',
}: ScrollableSelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const autoId = useId();
  const buttonId = id ?? autoId;

  const selected = options.find(o => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>('[data-selected="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [open]);

  return (
    <div ref={rootRef} className={clsx('relative inline-block', className)}>
      <button
        id={buttonId}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => setOpen(o => !o)}
        className={clsx(
          'flex items-center justify-between gap-1 w-full focus:outline-none transition-colors',
          VARIANT_BUTTON_CLASS[variant],
          buttonClassName,
        )}
      >
        <span className="truncate">{selected?.label ?? value}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="text-gray-500 flex-shrink-0"
        >
          <path d="M5.25 7.5l4.75 5 4.75-5H5.25z" />
        </svg>
      </button>
      {open && (
        <ul
          ref={listRef}
          role="listbox"
          className={clsx(
            'absolute z-[110] min-w-full bg-white border border-gray-200 rounded shadow-lg py-1 overflow-y-auto',
            placement === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1',
            maxHeightClass,
            listClassName,
          )}
        >
          {options.map(opt => {
            const isSelected = opt.value === value;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                data-selected={isSelected}
                className={clsx(
                  'px-2 py-1 text-xs cursor-pointer whitespace-nowrap',
                  opt.disabled
                    ? 'text-gray-300 cursor-not-allowed'
                    : isSelected
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-gray-100',
                )}
                onClick={() => {
                  if (opt.disabled) return;
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

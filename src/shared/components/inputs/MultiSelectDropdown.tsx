import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { useMemo } from 'react';
import clsx from 'clsx';
import Icon from '../Icon';
import { useParameterOptions } from '../../utils/parameterUtils';
import type { ListBoxItem } from './Dropdown';

// Props mirror Dropdown where sensible: accepts options directly OR a parameter group name.
export interface MultiSelectDropdownProps {
  /** Static option list. Use this or `group`, not both. */
  options?: ListBoxItem[];
  /** Parameter group name — resolved via useParameterOptions. Use this or `options`. */
  group?: string;
  /** Currently selected values. */
  value: string[];
  /** Called with the new selection any time a checkbox is toggled or Clear is clicked. */
  onChange: (next: string[]) => void;
  /**
   * Persistent filter-name shown in the trigger (e.g. "Status", "SLA").
   * Rendered muted when nothing is selected; rendered solid alongside a count
   * badge once one or more values are picked. The actual selected values are
   * expected to surface in an adjacent ActiveFilterChips row, so the trigger
   * never displays them itself.
   */
  placeholder?: string;
  /**
   * When true, option labels inside the popover are rendered as "value - label"
   * (same as Dropdown). Defaults to false. The trigger label is unaffected.
   */
  showValuePrefix?: boolean;
  className?: string;
  disabled?: boolean;
}

function MultiSelectDropdown({
  options,
  group,
  value,
  onChange,
  placeholder = 'All',
  showValuePrefix = false,
  className,
  disabled = false,
}: MultiSelectDropdownProps) {
  const parameterOptions = useParameterOptions(group ?? '');

  const allOptions = useMemo<ListBoxItem[]>(() => {
    return options !== undefined ? options : parameterOptions;
  }, [options, parameterOptions]);

  const toggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange(value.filter(v => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const clear = () => onChange([]);

  const hasSelection = value.length > 0;

  return (
    <Popover className={clsx('relative w-fit', className)}>
      <PopoverButton
        disabled={disabled}
        aria-label={hasSelection ? `${placeholder}, ${value.length} selected` : placeholder}
        className={clsx(
          'block relative w-fit rounded-lg border text-left text-sm transition-colors duration-200',
          // Reserve room on the right for the chevron, plus extra for the count badge when selected.
          hasSelection ? 'pr-14' : 'pr-9',
          'focus:outline-none focus:ring-2 border-gray-200 focus:ring-gray-200 focus:border-gray-400',
          disabled
            ? 'bg-gray-50 text-gray-500 cursor-not-allowed'
            : 'bg-white hover:border-gray-300',
        )}
      >
        {/* Chevron */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
          <Icon style="regular" name="chevron-down" className="size-3.5" />
        </div>
        {/* Count badge when ≥1 selected — actual values shown via ActiveFilterChips */}
        {hasSelection && (
          <div className="absolute inset-y-0 right-8 flex items-center pointer-events-none">
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-semibold rounded-full bg-primary text-white tabular-nums">
              {value.length}
            </span>
          </div>
        )}
        <div className="px-3 py-2 truncate">
          <span className={hasSelection ? 'text-gray-900' : 'text-gray-400'}>{placeholder}</span>
        </div>
      </PopoverButton>

      <PopoverPanel
        anchor="bottom start"
        style={{ '--anchor-max-height': '20rem' } as React.CSSProperties}
        className="min-w-(--button-width) max-w-[min(28rem,calc(100vw-2rem))] mt-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50 flex flex-col overflow-hidden"
      >
        {({ close }) => (
          <>
            {/* Option list — scrolls; Clear footer below stays pinned */}
            <div className="py-1 min-h-0 overflow-y-auto">
              {allOptions.length === 0 && (
                <div className="px-3 py-2 text-xs text-gray-400">No options</div>
              )}
              {allOptions.map(opt => {
                const optValue = opt.value ?? '';
                const isChecked = value.includes(optValue);
                const label =
                  showValuePrefix && opt.value ? `${opt.value} - ${opt.label}` : opt.label;
                return (
                  <button
                    key={opt.id ?? opt.value}
                    type="button"
                    onClick={() => toggle(optValue)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors"
                  >
                    {/* Inline checkbox indicator — avoids double-fire from HeadlessCheckbox + button click */}
                    <span
                      className={clsx(
                        'flex items-center justify-center h-4 w-4 shrink-0 rounded-md border-2 transition-all duration-150',
                        isChecked ? 'bg-primary border-primary' : 'border-gray-300',
                      )}
                    >
                      {isChecked && (
                        <Icon style="solid" name="check" className="h-2.5 w-2.5 text-white" />
                      )}
                    </span>
                    <span
                      className={clsx(
                        'text-sm select-none truncate',
                        isChecked ? 'font-medium text-gray-900' : 'text-gray-700',
                      )}
                    >
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer: Clear action — pinned at the bottom, outside the scroll area */}
            {value.length > 0 && (
              <div className="shrink-0 border-t border-gray-100 px-3 py-1.5 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    clear();
                    close();
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Clear
                </button>
              </div>
            )}
          </>
        )}
      </PopoverPanel>
    </Popover>
  );
}

export default MultiSelectDropdown;

import clsx from 'clsx';
import Icon from './Icon';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon: string;
}

interface SegmentedControlProps<T extends string> {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/**
 * A row of mutually exclusive choices, drawn as a grey track with the chosen one lifted out as a
 * white pill — the look the appraisal page's tab strip had on main.
 *
 * Green text rather than a green block: a filled segment sat right beside the filled "new group"
 * button and the two read as a pair of calls to action. Labels stay visible rather than going
 * icon-only; a row of bare icons is a guessing game.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="group"
      className={clsx(
        'flex items-center gap-0.5 rounded-lg border border-gray-100 bg-gray-50/80 p-0.5',
        className,
      )}
    >
      {options.map(option => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={clsx(
              'flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all',
              active
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:bg-white/50 hover:text-gray-700',
            )}
          >
            <Icon
              name={option.icon}
              style="solid"
              className={clsx('text-[11px]', active ? 'text-primary' : 'text-gray-400')}
            />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

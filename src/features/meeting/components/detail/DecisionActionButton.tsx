/**
 * A per-row decision control (Release / Route Back / Recall / Remove).
 *
 * Circular icon-only buttons: labelled pills wrapped onto two lines in the Decision column and
 * ate the width the data needed. The label survives as `title` + `aria-label`, so the action is
 * still announced to screen readers and discoverable on hover.
 *
 * One component for all four so size and icon scale can't drift between them.
 */
import type { ButtonHTMLAttributes } from 'react';
import clsx from 'clsx';

import Icon from '@/shared/components/Icon';

type ActionTone = 'emerald' | 'red' | 'amber' | 'slate';

/**
 * Resting state is a soft tint; hover deepens it. `slate` is the neutral destructive default —
 * Remove sits grey at rest and only turns red on hover, so a row of items doesn't read as a
 * row of warnings.
 */
const TONES: Record<ActionTone, string> = {
  emerald:
    'bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white focus-visible:ring-emerald-400',
  red: 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white focus-visible:ring-red-400',
  amber:
    'bg-amber-50 text-amber-600 hover:bg-amber-500 hover:text-white focus-visible:ring-amber-400',
  slate: 'bg-gray-100 text-gray-500 hover:bg-red-500 hover:text-white focus-visible:ring-gray-400',
};

interface DecisionActionButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'title'
> {
  tone: ActionTone;
  icon: string;
  /** Becomes both the tooltip and the accessible name — required, since there is no visible text. */
  label: string;
}

const DecisionActionButton = ({
  tone,
  icon,
  label,
  className,
  ...props
}: DecisionActionButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    className={clsx(
      'inline-flex size-7 shrink-0 items-center justify-center rounded-full',
      'transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      'disabled:cursor-not-allowed disabled:opacity-50',
      TONES[tone],
      className,
    )}
    {...props}
  >
    <Icon name={icon} style="solid" className="size-3" />
  </button>
);

export default DecisionActionButton;

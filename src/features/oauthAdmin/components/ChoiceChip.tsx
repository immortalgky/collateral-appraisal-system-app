import clsx from 'clsx';
import { useFormLayout } from '@shared/components/form/formLayoutContext';
import { chipClass } from '@shared/components/inputs/controlStyles';

interface ChoiceChipProps {
  label: string;
  selected: boolean;
  onToggle: () => void;
  mono?: boolean;
  title?: string;
}

/** A checkbox chip (DESIGN.md 17.5) for a toggle that has no react-hook-form field behind it. */
const ChoiceChip = ({ label, selected, onToggle, mono = false, title }: ChoiceChipProps) => {
  const layout = useFormLayout();
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={title ?? label}
      onClick={onToggle}
      className={clsx(chipClass(layout, selected, false), mono && 'font-mono')}
    >
      {selected && (
        <svg
          aria-hidden="true"
          viewBox="0 0 10 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-[0.4286rem] w-[0.6429rem] shrink-0"
        >
          <path d="M1 4.2 3.7 7 9 1" />
        </svg>
      )}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
};

export default ChoiceChip;

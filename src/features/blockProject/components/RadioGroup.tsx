interface RadioGroupProps {
  name: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  showOther?: boolean;
  otherValue?: string;
  onOtherChange?: (value: string) => void;
  disabled?: boolean;
}

/**
 * Inline radio-button group with optional "Other" free-text field.
 *
 * Inline radio-button group — unified component in blockProject.
 */
const RadioGroup = ({
  name,
  options,
  value,
  onChange,
  showOther,
  otherValue,
  onOtherChange,
  disabled,
}: RadioGroupProps) => (
  <div className="flex flex-wrap gap-x-4 gap-y-2">
    {options.map(opt => (
      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
        <input
          type="radio"
          name={name}
          value={opt.value}
          checked={value === opt.value}
          onChange={() => onChange(opt.value)}
          disabled={disabled}
          className="accent-primary"
        />
        <span className="text-sm text-gray-700">{opt.label}</span>
      </label>
    ))}
    {showOther && value === 'Other' && (
      <input
        type="text"
        value={otherValue ?? ''}
        onChange={e => onOtherChange?.(e.target.value)}
        placeholder="Please specify"
        disabled={disabled}
        className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-400"
      />
    )}
  </div>
);

export default RadioGroup;

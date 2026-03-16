import clsx from 'clsx';
import { COLOR_PRESETS } from './constants';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
}

export default function ColorPicker({ value, onChange, label }: ColorPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-xs text-gray-400 font-medium">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {COLOR_PRESETS.map(color => (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={clsx(
              'w-6 h-6 rounded-full border-2 transition-transform hover:scale-110',
              value === color ? 'border-white ring-2 ring-primary scale-110' : 'border-gray-600',
            )}
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>
    </div>
  );
}

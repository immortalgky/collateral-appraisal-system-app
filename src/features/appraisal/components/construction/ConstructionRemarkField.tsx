import Icon from '@shared/components/Icon';

const MAX_LENGTH = 4000;

interface ConstructionRemarkFieldProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

/**
 * Free-text remark for the construction inspection.
 *
 * Rendered outside the Summary / Full Detail branch on purpose: the remark is stored on the
 * inspection itself (ConstructionInspections.Remark) and printed as the remark row of the
 * construction summary report, so it must be capturable in both modes.
 */
export function ConstructionRemarkField({
  value,
  onChange,
  readOnly,
}: ConstructionRemarkFieldProps) {
  return (
    <div>
      <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
        <Icon name="message" style="regular" className="size-3.5 text-gray-400" />
        Remark
      </label>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={MAX_LENGTH}
        disabled={readOnly}
        rows={6}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500 resize-y transition-colors"
        placeholder="Enter remark or additional notes..."
      />
      <div className="mt-1 flex justify-end">
        <span className="text-xs text-gray-400">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}

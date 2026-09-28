import { useId } from 'react';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('appraisal');
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-700 mb-2">
        {t('constructionInspection.remark.label')}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={MAX_LENGTH}
        disabled={readOnly}
        rows={6}
        className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-primary/20 focus:border-primary disabled:bg-gray-50 disabled:text-gray-500 resize-y transition-colors"
        placeholder={t('constructionInspection.remark.placeholder')}
      />
      <div className="mt-1 flex justify-end">
        <span className="text-xs text-gray-400">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}

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
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-gray-700 dark:text-[color:var(--palette-ink)] mb-2"
      >
        {t('constructionInspection.remark.label')}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={e => onChange(e.target.value)}
        maxLength={MAX_LENGTH}
        disabled={readOnly}
        rows={6}
        className="w-full resize-y rounded-[var(--cas-ctl-radius,0.4615rem)] border border-[color:var(--cas-input-edge,#e0e7e9)] bg-[color:var(--cas-input,#fff)] px-[var(--cas-ctl-px,0.75rem)] py-2 text-[length:var(--cas-ctl-font,1rem)] leading-relaxed transition-colors enabled:hover:border-[color:var(--cas-input-edge-hover,#b7c4c9)] focus:border-[color:var(--color-primary-500)] focus:bg-[color:var(--color-base-100)] focus:shadow-[0_0_0_2px_color-mix(in_srgb,var(--color-primary-500)_25%,transparent)] focus:outline-none disabled:bg-gray-50 disabled:text-gray-500 dark:disabled:bg-[color:var(--palette-surface-2)] dark:disabled:text-[color:var(--palette-ink-3)]"
        placeholder={t('constructionInspection.remark.placeholder')}
      />
      <div className="mt-1 flex justify-end">
        <span className="text-xs text-gray-400 dark:text-[color:var(--palette-ink-3)]">
          {value.length}/{MAX_LENGTH}
        </span>
      </div>
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import Textarea from '@/shared/components/inputs/Textarea';

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
  return (
    <Textarea
      label={t('constructionInspection.remark.label')}
      value={value}
      onChange={e => onChange(e.target.value)}
      maxLength={MAX_LENGTH}
      disabled={readOnly}
      placeholder={t('constructionInspection.remark.placeholder')}
    />
  );
}

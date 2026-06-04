import { useTranslation } from 'react-i18next';
import Alert from '@shared/components/Alert';
import type { StructuredValidationError } from '../api/workflow';

interface ActivityCompletionErrorsProps {
  errors: StructuredValidationError[];
  title?: string;
}

/**
 * Renders structured validation errors from a failed activity completion
 * inside an Alert (danger variant). Groups messages by stepName.
 */
const ActivityCompletionErrors = ({ errors, title }: ActivityCompletionErrorsProps) => {
  const { t } = useTranslation('appraisal');
  const resolvedTitle = title ?? t('completionErrors.defaultTitle');

  if (errors.length === 0) return null;

  // Group by stepName for cleaner display
  const grouped = errors.reduce<Record<string, string[]>>((acc, e) => {
    const key = e.stepName || 'General';
    if (!acc[key]) acc[key] = [];
    acc[key].push(e.message);
    return acc;
  }, {});

  return (
    <Alert variant="danger" title={resolvedTitle} className="mt-3 text-left">
      <ul className="space-y-1 mt-1">
        {Object.entries(grouped).map(([stepName, messages]) => (
          <li key={stepName}>
            {Object.keys(grouped).length > 1 && (
              <span className="font-medium">{stepName}: </span>
            )}
            {messages.map((msg, i) => (
              <span key={i} className="block">
                {msg}
              </span>
            ))}
          </li>
        ))}
      </ul>
    </Alert>
  );
};

export default ActivityCompletionErrors;

import { useTranslation } from 'react-i18next';
import Alert from '@shared/components/Alert';
import type { StructuredValidationError } from '../api/workflow';

interface ActivityCompletionErrorsProps {
  errors: StructuredValidationError[];
  title?: string;
}

/**
 * Split a message into individual requirement lines. The backend often concatenates
 * several validation sentences into one string (e.g. "Do X. Do Y."); break them on
 * sentence boundaries so each requirement gets its own line.
 */
const toLines = (message: string): string[] =>
  message
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(Boolean);

/**
 * Renders structured validation errors from a failed activity completion
 * inside an Alert (danger variant). Groups messages by stepName and shows each
 * requirement sentence as its own bulleted line.
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

  const showStepName = Object.keys(grouped).length > 1;

  return (
    <Alert variant="danger" title={resolvedTitle} className="mt-3 text-left">
      <div className="mt-1 space-y-2">
        {Object.entries(grouped).map(([stepName, messages]) => {
          const lines = messages.flatMap(toLines);
          return (
            <div key={stepName}>
              {showStepName && <span className="mb-0.5 block font-medium">{stepName}</span>}
              <ul className="space-y-1">
                {lines.map((line, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-current opacity-60" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Alert>
  );
};

export default ActivityCompletionErrors;

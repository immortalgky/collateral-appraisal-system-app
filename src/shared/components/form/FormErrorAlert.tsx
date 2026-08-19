import Alert from '../Alert';
import { scrollToField, type FlatFormError } from './utils';

interface FormErrorAlertProps {
  /** Flattened errors from `flattenFormErrors`. Nothing renders when empty. */
  errors: FlatFormError[];
  onDismiss: () => void;
}

/**
 * The validation summary shown above a form after a failed submit.
 *
 * Each row is a button that scrolls to its field, so a user facing several errors can work through
 * them from the banner instead of hunting down the page. Dismissing is deliberately left to the
 * close button — clicking a row keeps the list open so the next error is still one click away.
 */
export function FormErrorAlert({ errors, onDismiss }: FormErrorAlertProps) {
  if (errors.length === 0) return null;

  return (
    <Alert
      variant="danger"
      title={`Please fix the following errors (${errors.length}):`}
      className="mb-4"
      dismissible
      onDismiss={onDismiss}
    >
      <ul className="list-disc list-inside space-y-0.5 max-h-24 overflow-y-auto text-xs">
        {errors.map((error, index) => (
          <li key={index}>
            <button
              // Explicit: a bare <button> inside <form> defaults to type="submit".
              type="button"
              onClick={() => scrollToField(error.path)}
              className="text-left underline-offset-2 hover:underline cursor-pointer"
            >
              {error.text}
            </button>
          </li>
        ))}
      </ul>
    </Alert>
  );
}

export default FormErrorAlert;

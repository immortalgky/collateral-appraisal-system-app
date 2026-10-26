import { useContext } from 'react';
import { useTranslation } from 'react-i18next';

import {
  hasValidationToken,
  translateValidationMessage,
  validationNamespace,
  ValidationLabelContext,
} from './validationMessage';

interface ValidationTextProps {
  /** `FieldError['message']` is optional, so a form can pass `errors.x?.message` as it is. */
  message?: string;
  /** The control's own label, when it draws one; otherwise the surrounding field's. */
  label?: string;
}

function Translated({ message, label }: { message: string; label?: string }) {
  // The token's own namespace, so a message from `request:` or `blockProject:` loads what it needs
  // (typed as `common`: the key is a runtime string, so the typed `t` cannot check it anyway).
  const { t } = useTranslation(validationNamespace(message) as 'common');
  const fieldLabel = useContext(ValidationLabelContext);
  return <>{translateValidationMessage(t, message, label ?? fieldLabel)}</>;
}

/**
 * The one place an error message becomes text (DESIGN.md 17.8): every control renders its `error`
 * through this. A legacy plain sentence renders as it is, without touching i18n.
 */
export function ValidationText({ message, label }: ValidationTextProps) {
  if (!message) return null;
  return hasValidationToken(message) ? (
    <Translated message={message} label={label} />
  ) : (
    <>{message}</>
  );
}

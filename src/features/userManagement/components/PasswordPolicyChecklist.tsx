import Icon from '@shared/components/Icon';
import { usePasswordPolicyChecks } from '../hooks/usePasswordPolicyChecks';

interface PasswordPolicyChecklistProps {
  password: string;
  /** Hide the list while the field is empty (default true). */
  hideWhenEmpty?: boolean;
  className?: string;
}

/**
 * Live met/not-met checklist for the configured password policy. Reused across every password
 * field (change / create user / admin reset) so they all reflect the same DB-maintained policy.
 */
const PasswordPolicyChecklist = ({
  password,
  hideWhenEmpty = true,
  className,
}: PasswordPolicyChecklistProps) => {
  const { checks } = usePasswordPolicyChecks(password);

  if (checks.length === 0) return null;
  if (hideWhenEmpty && password.length === 0) return null;

  return (
    <ul className={`flex flex-col gap-1 ${className ?? ''}`}>
      {checks.map(check => (
        <li key={check.key} className="flex items-center gap-1.5 text-xs">
          <Icon
            name={check.passed ? 'circle-check' : 'circle-xmark'}
            style="solid"
            className={`size-3.5 shrink-0 ${check.passed ? 'text-green-500' : 'text-gray-300'}`}
          />
          <span className={check.passed ? 'text-green-700' : 'text-gray-400'}>{check.label}</span>
        </li>
      ))}
    </ul>
  );
};

export default PasswordPolicyChecklist;

import { useParameterDescription } from '../utils/parameterUtils';

type DisplayFormat = 'description' | 'code-description';

interface ParameterDisplayProps {
  group: string;
  code: string | null | undefined;
  format?: DisplayFormat;
  fallback?: string;
  className?: string;
}

/**
 * Display a component that converts a parameter code to its label.
 * Reads from the global parameter store (loaded at app startup).
 * Auto-detects language from locale store.
 *
 * @example
 * // Shows description only: "New Loan"
 * <ParameterDisplay group="PURPOSE" code="01" />
 *
 * // Shows code + description: "01 - New Loan"
 * <ParameterDisplay group="PURPOSE" code="01" format="code-description" />
 */
const ParameterDisplay = ({
  group,
  code,
  format = 'description',
  fallback = '-',
  className,
}: ParameterDisplayProps) => {
  const description = useParameterDescription(group, code);

  if (!code) return <span className={className}>{fallback}</span>;

  const label = format === 'code-description' ? `${code} - ${description}` : description;

  return <span className={className}>{label}</span>;
};

export default ParameterDisplay;

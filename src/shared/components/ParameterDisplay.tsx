import { useMemo } from 'react';
import { useParameterDescription, useParametersByGroup } from '../utils/parameterUtils';

type DisplayFormat = 'description' | 'code-description';

interface ParameterDisplayProps {
  group: string;
  code: string | string[] | null | undefined;
  format?: DisplayFormat;
  fallback?: string;
  className?: string;
}

/**
 * Display a component that converts a parameter code to its label.
 * Reads from the global parameter store (loaded at app startup).
 * Auto-detects language from locale store.
 *
 * Accepts a single code string, an array of codes, or a JSON-encoded
 * array string (e.g. '["01","02"]') for CheckboxGroup values.
 *
 * @example
 * // Shows description only: "New Loan"
 * <ParameterDisplay group="PURPOSE" code="01" />
 *
 * // Shows code + description: "01 - New Loan"
 * <ParameterDisplay group="PURPOSE" code="01" format="code-description" />
 *
 * // Multiple codes: "Desc1, Desc2"
 * <ParameterDisplay group="MATERIAL" code={["01","02"]} />
 */
const ParameterDisplay = ({
  group,
  code,
  format = 'description',
  fallback = '-',
  className,
}: ParameterDisplayProps) => {
  // Normalise code into an array
  const codes = useMemo(() => {
    if (!code) return null;
    if (Array.isArray(code)) return code;
    // Auto-detect JSON array strings like '["01","02"]'
    if (code.startsWith('[')) {
      try {
        const parsed = JSON.parse(code);
        if (Array.isArray(parsed)) return parsed as string[];
      } catch { /* not valid JSON, treat as single code */ }
    }
    // Auto-detect comma-separated codes like "01,02,03,04"
    if (code.includes(',')) {
      return code.split(',').map(c => c.trim());
    }
    return null; // single string — handled by the simple path
  }, [code]);

  // Single-code path (most common)
  const singleDescription = useParameterDescription(group, codes ? null : (code as string | null | undefined));

  // Multi-code path
  const params = useParametersByGroup(group);
  const multiLabel = useMemo(() => {
    if (!codes) return null;
    return codes
      .map(c => {
        const param = params.find(p => p.code === c);
        if (format === 'code-description') return `${c} - ${param?.description ?? c}`;
        return param?.description ?? c;
      })
      .join(', ');
  }, [codes, params, format]);

  if (!code) return <span className={className}>{fallback}</span>;

  if (codes) {
    return <span className={className}>{multiLabel}</span>;
  }

  const label = format === 'code-description' ? `${code} - ${singleDescription}` : singleDescription;

  return <span className={className}>{label}</span>;
};

export default ParameterDisplay;

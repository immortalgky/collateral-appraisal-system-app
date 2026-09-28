import ParameterDisplay from '@shared/components/ParameterDisplay';
import { readFactorValue } from '../domain/readFactorValue';

const PARAMETER_DATA_TYPES = new Set(['Dropdown', 'Radio', 'CheckboxGroup']);

// Every caller already guards a null/blank value and renders its own em dash, so this
// only covers values that are non-blank on the way in but resolve to nothing — an empty
// JSON array ('[]') is the real case: ParameterDisplay joins it to '', readFactorValue
// joins it to ''. That used to reach the cell as a blank, sitting beside genuinely-null
// cells showing '—' in the same column. Same glyph as those, so "nothing selected" and
// "no value" read alike.
const EMPTY_VALUE = '—';

interface FactorValueDisplayProps {
  value: string | null | undefined;
  dataType: string | null | undefined;
  parameterGroup: string | null | undefined;
  fieldDecimal?: number | null;
}

export function FactorValueDisplay({
  value,
  dataType,
  parameterGroup,
  fieldDecimal,
}: FactorValueDisplayProps) {
  if (dataType && PARAMETER_DATA_TYPES.has(dataType) && parameterGroup) {
    return (
      <div title={value ?? ''} className="truncate">
        <ParameterDisplay group={parameterGroup} code={value} fallback={EMPTY_VALUE} />
      </div>
    );
  }

  const display = readFactorValue({
    dataType: dataType ?? '',
    fieldDecimal,
    value,
  });

  // Explicit empty check rather than `display || EMPTY_VALUE` — a legitimate '0' from a
  // Numeric factor is falsy-adjacent and must not be swallowed by the fallback.
  const shown = display == null || display === '' ? EMPTY_VALUE : display;

  return (
    <div title={display?.toString() ?? ''} className="truncate">
      {shown}
    </div>
  );
}

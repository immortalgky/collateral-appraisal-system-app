import ParameterDisplay from '@shared/components/ParameterDisplay';
import { readFactorValue } from '../domain/readFactorValue';

const PARAMETER_DATA_TYPES = new Set(['Dropdown', 'Radio', 'CheckboxGroup']);

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
        <ParameterDisplay group={parameterGroup} code={value} fallback="" />
      </div>
    );
  }

  const display = readFactorValue({
    dataType: dataType ?? '',
    fieldDecimal,
    value,
  });

  return (
    <div title={display?.toString() ?? ''} className="truncate">
      {display ?? ''}
    </div>
  );
}

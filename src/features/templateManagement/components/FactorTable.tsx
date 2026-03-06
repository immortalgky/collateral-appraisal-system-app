import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';

interface FactorTableProps {
  factors: MarketComparableFactorDtoType[];
  onEdit?: (factor: MarketComparableFactorDtoType) => void;
  isLoading?: boolean;
}

const dataTypeLabels: Record<string, string> = {
  Dropdown: 'Dropdown',
  Radio: 'Radio',
  CheckboxGroup: 'Checkbox Group',
  Checkbox: 'Checkbox',
  Numeric: 'Numeric',
  Text: 'Text',
};

const FactorTable = ({ factors, onEdit, isLoading }: FactorTableProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (factors.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Icon name="database" style="regular" className="size-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No factors found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="table w-full">
        <thead>
          <tr className="bg-primary/10">
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg">Code</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Field Name</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Data Type</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Config</th>
            <th className="text-primary text-sm font-semibold py-3 px-4 text-center">Status</th>
            {onEdit && (
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {factors.map((factor) => (
            <tr key={factor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-4 text-sm font-mono text-gray-700">{factor.factorCode}</td>
              <td className="py-3 px-4 text-sm text-gray-900">{factor.factorName}</td>
              <td className="py-3 px-4 text-sm font-mono text-gray-600">{factor.fieldName}</td>
              <td className="py-3 px-4 text-sm text-gray-600">
                {dataTypeLabels[factor.dataType] ?? factor.dataType}
              </td>
              <td className="py-3 px-4 text-sm text-gray-500">
                {['Dropdown', 'Radio', 'CheckboxGroup'].includes(factor.dataType) && factor.parameterGroup && (
                  <span>Group: <span className="font-mono text-gray-700">{factor.parameterGroup}</span></span>
                )}
                {factor.dataType === 'Text' && factor.fieldLength != null && (
                  <span>Length: {factor.fieldLength}</span>
                )}
                {factor.dataType === 'Numeric' && (
                  <span>
                    {factor.fieldLength != null && <>Length: {factor.fieldLength}</>}
                    {factor.fieldLength != null && factor.fieldDecimal != null && ', '}
                    {factor.fieldDecimal != null && <>Decimal: {factor.fieldDecimal}</>}
                  </span>
                )}
                {['Checkbox'].includes(factor.dataType) && '-'}
              </td>
              <td className="py-3 px-4 text-center">
                <span
                  className={clsx(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                    factor.isActive
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-gray-100 text-gray-500',
                  )}
                >
                  {factor.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              {onEdit && (
                <td className="py-3 px-4 text-center">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => onEdit(factor)}
                    leftIcon={<Icon name="pen-to-square" style="regular" className="size-3.5" />}
                  >
                    Edit
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FactorTable;

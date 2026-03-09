import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import Icon from '@shared/components/Icon';
import Button from '@shared/components/Button';
import clsx from 'clsx';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

interface FactorTableProps {
  factors: MarketComparableFactorDtoType[];
  onEdit?: (factor: MarketComparableFactorDtoType) => void;
  isLoading?: boolean;
  totalCount?: number;
}

const dataTypeBadge: Record<string, { label: string; color: string }> = {
  Dropdown: { label: 'Dropdown', color: 'bg-violet-50 text-violet-700' },
  Radio: { label: 'Radio', color: 'bg-sky-50 text-sky-700' },
  CheckboxGroup: { label: 'Checkbox Group', color: 'bg-indigo-50 text-indigo-700' },
  Checkbox: { label: 'Checkbox', color: 'bg-teal-50 text-teal-700' },
  Numeric: { label: 'Numeric', color: 'bg-amber-50 text-amber-700' },
  Text: { label: 'Text', color: 'bg-gray-100 text-gray-600' },
};

const FactorTable = ({ factors, onEdit, isLoading, totalCount }: FactorTableProps) => {
  const language = useLocaleStore((s) => s.language);
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
    <div>
      {totalCount != null && totalCount !== factors.length && (
        <div className="px-4 pb-2 pt-1">
          <span className="text-xs text-gray-400">
            Showing {factors.length} of {totalCount} factor(s)
          </span>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr className="bg-primary/10">
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left first:rounded-tl-lg w-36">Code</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Name</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left w-36">Field Name</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-36">Data Type</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-left">Config</th>
              <th className="text-primary text-sm font-semibold py-3 px-4 text-center w-24">Status</th>
              {onEdit && (
                <th className="text-primary text-sm font-semibold py-3 px-4 text-center last:rounded-tr-lg w-24">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {factors.map((factor) => {
              const badge = dataTypeBadge[factor.dataType] ?? { label: factor.dataType, color: 'bg-gray-100 text-gray-600' };
              return (
                <tr key={factor.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono font-medium text-gray-800">{factor.factorCode}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-sm text-gray-900">{getTranslatedFactorName(factor.translations, language)}</div>
                    {factor.translations && factor.translations.length > 1 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {factor.translations.map((t) => (
                          <span
                            key={t.language}
                            className="text-[10px] font-semibold uppercase text-gray-400 bg-gray-50 rounded px-1 py-px"
                          >
                            {t.language}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-mono text-gray-500">{factor.fieldName}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', badge.color)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-500">
                    {['Dropdown', 'Radio', 'CheckboxGroup'].includes(factor.dataType) && factor.parameterGroup && (
                      <div className="flex items-center gap-1">
                        <Icon name="layer-group" style="regular" className="size-3 text-gray-400" />
                        <span className="font-mono text-gray-700">{factor.parameterGroup}</span>
                      </div>
                    )}
                    {factor.dataType === 'Text' && factor.fieldLength != null && (
                      <span className="text-gray-600">Length: <span className="font-mono">{factor.fieldLength}</span></span>
                    )}
                    {factor.dataType === 'Numeric' && (
                      <div className="flex items-center gap-2">
                        {factor.fieldLength != null && (
                          <span className="text-gray-600">Len: <span className="font-mono">{factor.fieldLength}</span></span>
                        )}
                        {factor.fieldDecimal != null && (
                          <span className="text-gray-600">Dec: <span className="font-mono">{factor.fieldDecimal}</span></span>
                        )}
                      </div>
                    )}
                    {factor.dataType === 'Checkbox' && (
                      <span className="text-gray-400">-</span>
                    )}
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
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default FactorTable;

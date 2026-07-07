import { useTranslation } from 'react-i18next';
import type { MarketComparableFactorDtoType } from '@/shared/schemas/v1';
import Icon from '@shared/components/Icon';
import clsx from 'clsx';
import { getTranslatedFactorName } from '@shared/utils/translationUtils';
import { useLocaleStore } from '@shared/store';

interface FactorTableProps {
  factors: MarketComparableFactorDtoType[];
  onEdit?: (factor: MarketComparableFactorDtoType) => void;
  onDelete?: (factor: MarketComparableFactorDtoType) => void;
  onToggleStatus?: (factor: MarketComparableFactorDtoType) => void;
  sortKey?: string | null;
  sortDir?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  isLoading?: boolean;
  isDeleting?: boolean;
  isTogglingStatus?: boolean;
  totalCount?: number;
}

const dataTypeBadgeColor: Record<string, string> = {
  Dropdown: 'bg-violet-50 text-violet-700',
  Radio: 'bg-sky-50 text-sky-700',
  CheckboxGroup: 'bg-indigo-50 text-indigo-700',
  Checkbox: 'bg-teal-50 text-teal-700',
  Numeric: 'bg-amber-50 text-amber-700',
  Text: 'bg-gray-100 text-gray-600',
};

const FactorTable = ({
  factors,
  onEdit,
  onDelete,
  onToggleStatus,
  sortKey,
  sortDir,
  onSort,
  isLoading,
  isDeleting,
  isTogglingStatus,
  totalCount,
}: FactorTableProps) => {
  const { t } = useTranslation(['templateManagement', 'common']);
  const language = useLocaleStore(s => s.language);

  const sortableHeader = (
    key: string,
    label: string,
    align: 'left' | 'center',
    widthClass?: string,
  ) => {
    const isActive = sortKey === key;
    return (
      <th
        className={clsx(
          'px-4 py-3 text-xs font-semibold text-gray-500',
          align === 'center' ? 'text-center' : 'text-left',
          widthClass,
        )}
        aria-sort={isActive ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
      >
        <button
          type="button"
          onClick={() => onSort?.(key)}
          className={clsx(
            'group inline-flex items-center gap-1 select-none transition-colors hover:text-gray-700',
            align === 'center' && 'justify-center',
          )}
        >
          <span>{label}</span>
          <Icon
            style="solid"
            name={isActive ? (sortDir === 'asc' ? 'sort-up' : 'sort-down') : 'sort'}
            className={clsx(
              'size-2.5',
              isActive ? 'text-green-600' : 'text-gray-400 group-hover:text-gray-500',
            )}
          />
        </button>
      </th>
    );
  };

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
        <p className="text-sm">{t('factors.empty')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {totalCount != null && totalCount !== factors.length && (
        <div className="px-4 pb-2 pt-1">
          <span className="text-xs text-gray-400">
            {t('factors.showingOf', { shown: factors.length, total: totalCount })}
          </span>
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-gray-100 bg-gray-50">
              {sortableHeader('code', t('factors.columns.code'), 'center', 'w-16')}
              {sortableHeader('name', t('factors.columns.name'), 'left')}
              {sortableHeader('fieldName', t('factors.columns.fieldName'), 'left', 'w-36')}
              {sortableHeader('dataType', t('factors.columns.dataType'), 'center', 'w-36')}
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-left">
                {t('factors.columns.config')}
              </th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center w-24">
                {t('factors.columns.status')}
              </th>
              {(onEdit || onDelete || onToggleStatus) && (
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 text-center w-28">
                  {t('factors.columns.action')}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {factors.map(factor => {
              const badgeColor = dataTypeBadgeColor[factor.dataType] ?? 'bg-gray-100 text-gray-600';
              const knownDataTypes = [
                'Dropdown',
                'Radio',
                'CheckboxGroup',
                'Checkbox',
                'Numeric',
                'Text',
              ] as const;
              type KnownDataType = (typeof knownDataTypes)[number];
              const dataTypeLabel = knownDataTypes.includes(factor.dataType as KnownDataType)
                ? t(
                    `factors.dataTypes.${factor.dataType as KnownDataType}` as `factors.dataTypes.${KnownDataType}`,
                  )
                : factor.dataType;
              return (
                <tr
                  key={factor.id}
                  onClick={() => onEdit?.(factor)}
                  className={clsx(
                    'border-b border-gray-100 hover:bg-gray-50 transition-colors',
                    onEdit && 'cursor-pointer',
                  )}
                >
                  <td className="py-2.5 px-4 text-center">
                    <span className="text-sm text-gray-800">
                      {factor.factorCode}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="text-sm text-gray-900">
                      {getTranslatedFactorName(factor.translations, language)}
                    </div>
                    {factor.translations && factor.translations.length > 1 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {factor.translations.map(tr => (
                          <span
                            key={tr.language}
                            className="text-[10px] font-semibold uppercase text-gray-400 bg-gray-50 rounded px-1 py-px"
                          >
                            {tr.language}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="text-sm font-mono text-gray-500">{factor.fieldName}</span>
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        badgeColor,
                      )}
                    >
                      {dataTypeLabel}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-sm text-gray-500">
                    {['Dropdown', 'Radio', 'CheckboxGroup'].includes(factor.dataType) &&
                      factor.parameterGroup && (
                        <div className="flex items-center gap-1">
                          <Icon
                            name="layer-group"
                            style="regular"
                            className="size-3 text-gray-400"
                          />
                          <span className="font-mono text-gray-700">{factor.parameterGroup}</span>
                        </div>
                      )}
                    {factor.dataType === 'Text' && factor.fieldLength != null && (
                      <span className="text-gray-600">
                        {t('factors.configLength', { n: factor.fieldLength })}
                      </span>
                    )}
                    {factor.dataType === 'Numeric' && (
                      <div className="flex items-center gap-2">
                        {factor.fieldLength != null && (
                          <span className="text-gray-600">
                            {t('factors.configLen', { n: factor.fieldLength })}
                          </span>
                        )}
                        {factor.fieldDecimal != null && (
                          <span className="text-gray-600">
                            {t('factors.configDec', { n: factor.fieldDecimal })}
                          </span>
                        )}
                      </div>
                    )}
                    {factor.dataType === 'Checkbox' && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <span
                      className={clsx(
                        'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                        factor.isActive
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-gray-100 text-gray-500',
                      )}
                    >
                      {factor.isActive ? t('factors.status.active') : t('factors.status.inactive')}
                    </span>
                  </td>
                  {(onEdit || onDelete || onToggleStatus) && (
                    <td className="py-2.5 px-4 text-center">
                      <div
                        className="flex items-center justify-center gap-1"
                        onClick={e => e.stopPropagation()}
                      >
                        {onEdit && (
                          <button
                            type="button"
                            onClick={() => onEdit(factor)}
                            className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                            title={t('common:actions.edit')}
                            aria-label={t('common:actions.edit')}
                          >
                            <Icon name="pen" style="regular" className="size-4" />
                          </button>
                        )}
                        {onToggleStatus && (
                          <button
                            type="button"
                            onClick={() => onToggleStatus(factor)}
                            disabled={isTogglingStatus}
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            title={
                              factor.isActive
                                ? t('common:actions.deactivate')
                                : t('common:actions.activate')
                            }
                            aria-label={
                              factor.isActive
                                ? t('common:actions.deactivate')
                                : t('common:actions.activate')
                            }
                          >
                            <Icon
                              name={factor.isActive ? 'toggle-on' : 'toggle-off'}
                              style="regular"
                              className="size-4"
                            />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            type="button"
                            onClick={() => onDelete(factor)}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-400 hover:text-danger hover:bg-danger/5 rounded-lg transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed"
                            title={t('common:actions.delete')}
                            aria-label={t('common:actions.delete')}
                          >
                            <Icon name="trash" style="regular" className="size-4" />
                          </button>
                        )}
                      </div>
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

import clsx from 'clsx';
import { Icon } from '@/shared/components';
import type { FactorDataType, MarketComparableDetailType } from '../schemas';
import { readFactorValue } from '../domain/readFactorValue';
import { getFactorDesciption } from '../domain/getFactorDescription';

interface SurveySelectionTableProps {
  surveys: MarketComparableDetailType[];
  factorColumns: { factorCode: string }[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  allFactors: FactorDataType[];
  language: string;
}

const stickyGradient =
  'after:absolute after:right-0 after:top-0 after:h-full after:w-3 after:bg-gradient-to-r after:from-black/[0.04] after:to-transparent after:translate-x-full';

/** Opaque background for sticky body cells so scrolling content doesn't bleed through. */
function stickyCellBg(isSelected: boolean, isOddRow: boolean) {
  if (isSelected) return 'bg-teal-50';       // opaque tint for selected
  if (isOddRow) return 'bg-gray-50';         // opaque alternating
  return 'bg-white';
}

export function SurveySelectionTable({
  surveys,
  factorColumns,
  selectedIds,
  onToggle,
  onToggleAll,
  allFactors,
  language,
}: SurveySelectionTableProps) {
  const allChecked =
    surveys.length > 0 && surveys.every(s => selectedIds.has(s.id ?? ''));
  const someChecked =
    surveys.some(s => selectedIds.has(s.id ?? '')) && !allChecked;

  if (surveys.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
        <Icon name="magnifying-glass" className="size-10 mb-3" />
        <span className="text-base">No market comparables available</span>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <table className="table table-xs w-full">
        <thead className="sticky top-0 z-30">
          <tr className="border-b border-gray-200">
            {/* Checkbox header */}
            <th
              className="bg-gray-50 sticky left-0 z-30 w-[50px] min-w-[50px] px-3 py-2 text-center"
            >
              <input
                type="checkbox"
                checked={allChecked}
                ref={el => {
                  if (el) el.indeterminate = someChecked;
                }}
                onChange={() => onToggleAll(!allChecked)}
                className="checkbox checkbox-sm checkbox-primary"
              />
            </th>
            {/* Comparable No header */}
            <th
              className="bg-gray-50 sticky left-[50px] z-30 w-[150px] min-w-[150px] px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap"
            >
              Comparable No.
            </th>
            {/* Survey Name header */}
            <th
              className={clsx(
                'bg-gray-50 sticky left-[200px] z-30 w-[180px] min-w-[180px] px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap relative',
                stickyGradient,
              )}
            >
              Survey Name
            </th>
            {/* Dynamic factor columns */}
            {factorColumns.map(col => {
              const label =
                getFactorDesciption(col.factorCode, allFactors, language) ??
                col.factorCode;
              return (
                <th
                  key={col.factorCode}
                  className="bg-gray-50 px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap min-w-[120px]"
                  title={label}
                >
                  <span className="truncate block max-w-[200px]">{label}</span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {surveys.map((survey, rowIndex) => {
            const surveyId = survey.id ?? '';
            const isSelected = selectedIds.has(surveyId);
            return (
              <tr
                key={surveyId}
                onClick={() => onToggle(surveyId)}
                className={clsx(
                  'cursor-pointer transition-colors',
                  stickyCellBg(isSelected, rowIndex % 2 === 1),
                  'hover:bg-teal-100/50',
                )}
              >
                {/* Checkbox cell */}
                <td
                  className={clsx(
                    'sticky left-0 z-20 px-3 py-2 text-center border-b border-gray-100',
                    stickyCellBg(isSelected, rowIndex % 2 === 1),
                  )}
                  onClick={e => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggle(surveyId)}
                    className="checkbox checkbox-sm checkbox-primary"
                  />
                </td>
                {/* Comparable No cell */}
                <td
                  className={clsx(
                    'sticky left-[50px] z-20 px-3 py-2 border-b border-gray-100 text-sm font-medium text-gray-700 whitespace-nowrap',
                    stickyCellBg(isSelected, rowIndex % 2 === 1),
                  )}
                >
                  {survey.comparableNumber}
                </td>
                {/* Survey Name cell */}
                <td
                  className={clsx(
                    'sticky left-[200px] z-20 px-3 py-2 border-b border-gray-100 text-sm text-gray-700 whitespace-nowrap relative',
                    stickyCellBg(isSelected, rowIndex % 2 === 1),
                    stickyGradient,
                  )}
                  title={survey.surveyName ?? ''}
                >
                  <span className="truncate block max-w-[160px]">
                    {survey.surveyName}
                  </span>
                </td>
                {/* Factor value cells */}
                {factorColumns.map(col => {
                  const factorData = survey.factorData?.find(
                    f => f.factorCode === col.factorCode,
                  );
                  const value = factorData
                    ? readFactorValue({
                        dataType: (factorData.dataType as string) ?? '',
                        fieldDecimal: factorData.fieldDecimal,
                        value: factorData.value,
                      })
                    : null;
                  return (
                    <td
                      key={col.factorCode}
                      className="px-3 py-2 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap"
                      title={String(value ?? '')}
                    >
                      {value || '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

import clsx from 'clsx';
import { Icon } from '@/shared/components';
import type { FactorDataType, MarketComparableDetailType } from '../schemas';
import { getFactorDesciption } from '../domain/getFactorDescription';
import { FactorValueDisplay } from './FactorValueDisplay';
import { ScrollableTableContainer } from './ScrollableTableContainer';
import { COLOR_SELECTED, COLOR_SUBJECT, COLOR_UNSELECTED } from './SurveySelectionMap';

interface SurveySelectionTableProps {
  surveys: MarketComparableDetailType[];
  factorColumns: { factorCode: string }[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
  allFactors: FactorDataType[];
  language: string;
  /** Survey id hovered (synced with the map) — highlights the matching row. */
  hoveredId?: string | null;
  onRowHover?: (id: string | null) => void;
  /**
   * Subject collateral row(s) (land/condo) pinned orange — shown at the top.
   * `property` is the enriched property detail; factor values are resolved from
   * it via each factor's fieldName (same as the Comparative Analysis table).
   */
  subjectRows?: { id: string; label: string; property: Record<string, unknown> }[];
}

/** Small location pin matching the map marker colour, for the first column. */
function RowPin({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 32" width="12" height="16" className="inline-block shrink-0" aria-hidden="true">
      <path
        d="M12 0.5C5.65 0.5 0.5 5.65 0.5 12c0 7.7 11.5 19.5 11.5 19.5S23.5 19.7 23.5 12C23.5 5.65 18.35 0.5 12 0.5z"
        fill={color}
      />
      <circle cx="12" cy="12" r="4.2" fill="#fff" />
    </svg>
  );
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
  hoveredId,
  onRowHover,
  subjectRows = [],
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
    <ScrollableTableContainer className="flex-1 min-h-0">
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
          {/* Subject collateral row(s) — orange pin, not selectable. */}
          {subjectRows.map((subject, i) => (
            <tr
              key={`subject-${subject.id || i}`}
              onMouseEnter={() => onRowHover?.(subject.id)}
              onMouseLeave={() => onRowHover?.(null)}
              className={clsx(hoveredId === subject.id ? 'bg-amber-100' : 'bg-amber-50/60')}
            >
              <td
                className={clsx(
                  'sticky left-0 z-20 px-3 py-2 text-center border-b border-gray-100',
                  hoveredId === subject.id ? 'bg-amber-100' : 'bg-amber-50/60',
                )}
              />
              <td
                className="sticky left-[50px] z-20 px-3 py-2 border-b border-gray-100 bg-amber-50/60 whitespace-nowrap"
                title={subject.label}
              >
                <span className="flex items-center gap-1.5 text-sm font-medium text-amber-700">
                  <RowPin color={COLOR_SUBJECT} />
                  <span className="truncate block max-w-[120px]">{subject.label}</span>
                </span>
              </td>
              <td
                className={clsx(
                  'sticky left-[200px] z-20 px-3 py-2 border-b border-gray-100 bg-amber-50/60 text-sm text-gray-400 whitespace-nowrap relative',
                  stickyGradient,
                )}
              >
                -
              </td>
              {factorColumns.map(col => {
                // Resolve the subject's value for this factor via the factor's
                // fieldName on the enriched property (manual-entry factors have
                // no fieldName → nothing to show).
                const factor = allFactors?.find(f => f.factorCode === col.factorCode);
                const fieldName = factor?.fieldName as string | undefined;
                const raw = fieldName ? subject.property?.[fieldName] : undefined;
                return (
                  <td
                    key={col.factorCode}
                    className="px-3 py-2 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap"
                  >
                    {raw != null && raw !== '' ? (
                      <FactorValueDisplay
                        value={String(raw)}
                        dataType={factor?.dataType as string | undefined}
                        parameterGroup={factor?.parameterGroup as string | undefined}
                        fieldDecimal={factor?.fieldDecimal as number | undefined}
                      />
                    ) : (
                      '-'
                    )}
                  </td>
                );
              })}
            </tr>
          ))}

          {surveys.map((survey, rowIndex) => {
            const surveyId = survey.id ?? '';
            const isSelected = selectedIds.has(surveyId);
            return (
              <tr
                key={surveyId}
                onClick={() => onToggle(surveyId)}
                onMouseEnter={() => onRowHover?.(surveyId)}
                onMouseLeave={() => onRowHover?.(null)}
                className={clsx(
                  'cursor-pointer transition-colors',
                  stickyCellBg(isSelected, rowIndex % 2 === 1),
                  hoveredId === surveyId ? 'bg-teal-100/60' : 'hover:bg-teal-100/50',
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
                  <span className="flex items-center gap-1.5">
                    <RowPin color={isSelected ? COLOR_SELECTED : COLOR_UNSELECTED} />
                    {survey.comparableNumber}
                  </span>
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
                  return (
                    <td
                      key={col.factorCode}
                      className="px-3 py-2 border-b border-gray-100 text-sm text-gray-600 whitespace-nowrap"
                    >
                      {factorData ? (
                        <FactorValueDisplay
                          value={factorData.value as string | undefined}
                          dataType={factorData.dataType as string | undefined}
                          parameterGroup={factorData.parameterGroup as string | undefined}
                          fieldDecimal={factorData.fieldDecimal as number | undefined}
                        />
                      ) : '-'}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </ScrollableTableContainer>
  );
}

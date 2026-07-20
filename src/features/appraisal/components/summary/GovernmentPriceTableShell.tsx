import { useState, type ReactNode } from 'react';

interface GovernmentPriceTableShellProps<T> {
  rows: T[];
  /** Column widths, e.g. ['40%', '20%', '20%', '20%']. Must match the <th>/<td> count. */
  colWidths: string[];
  /** `<th>` cells for the header row (without the wrapping `<tr>`). */
  headerCells: ReactNode;
  /** Renders one full `<tr>` (including `key`) for a row. */
  renderRow: (row: T, idx: number) => ReactNode;
  /** `<td>` cells for the footer row (without the wrapping `<tr>`). Hidden when there is a single row. */
  footerCells: ReactNode;
  showMoreLabel: (remaining: number) => string;
  showLessLabel: string;
}

const MAX_INITIAL_ROWS = 5;

/**
 * Shared shell for read-only government appraisal price tables (land / condo).
 *
 * Behaviour:
 *  - ≤ 5 rows  → all rows visible, no expand button
 *  - > 5 rows  → first 5 shown; "Show more" button appears before the footer
 *  - Expanded  → all rows in a scrollable area (~10 rows tall); "Show less" stays
 *                pinned between the scroll area and the footer
 *  - 1 row     → footer is hidden (nothing to total)
 *
 * Three-table layout keeps column widths consistent between header, body, and footer:
 *   [thead table – fixed]
 *   [scrollable div → tbody table]
 *   [show more/less button row – always visible]   ← before footer
 *   [tfoot table – fixed]
 *
 * Column count/widths and per-row/footer cell rendering are owned by the caller so
 * land and condo tables can differ in shape without a boolean flag branching this shell.
 */
const GovernmentPriceTableShell = <T,>({
  rows,
  colWidths,
  headerCells,
  renderRow,
  footerCells,
  showMoreLabel,
  showLessLabel,
}: GovernmentPriceTableShellProps<T>) => {
  const isSingleRow = rows.length === 1;
  const isExceedRows = rows.length > MAX_INITIAL_ROWS;
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleRows = isExpanded ? rows : rows.slice(0, MAX_INITIAL_ROWS);

  const ColGroup = () => (
    <colgroup>
      {colWidths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  return (
    <div className="border border-gray-200 rounded-sm">
      {/* Header (fixed) */}
      <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
        <ColGroup />
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">{headerCells}</tr>
        </thead>
      </table>

      {/* Body (scrollable when expanded) */}
      <div className={isExpanded ? 'overflow-y-auto max-h-64' : ''}>
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <ColGroup />
          <tbody className="divide-y divide-gray-100">
            {visibleRows.map((row, idx) => renderRow(row, idx))}
          </tbody>
        </table>
      </div>

      {/* Show more / Show less (pinned before footer) */}
      {isExceedRows && (
        <div className="border-t border-gray-100 px-3 py-2 text-center">
          <button
            type="button"
            className="text-primary-600 hover:underline cursor-pointer text-sm"
            onClick={() => setIsExpanded(prev => !prev)}
          >
            {isExpanded ? showLessLabel : showMoreLabel(rows.length - MAX_INITIAL_ROWS)}
          </button>
        </div>
      )}

      {/* Footer (fixed) */}
      {!isSingleRow && (
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <ColGroup />
          <tfoot>
            <tr className="bg-gray-100 border-t-2 border-gray-400">{footerCells}</tr>
          </tfoot>
        </table>
      )}
    </div>
  );
};

export default GovernmentPriceTableShell;

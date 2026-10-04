import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import FormTable from '@features/request/components/tables/FormTable';
import { emptyRowFor, sumColumn } from '@features/request/components/tables/formTableUtils';
import { formatNumber } from '@/shared/utils/formatUtils';

interface LandAreaDeductionTableProps {
  /** Field-array name. Defaults to the land form's own field. */
  name?: string;
}

/**
 * Areas the appraiser cannot price — an encroaching structure, a strip used by someone else, a
 * public waterway. Their sum comes off the registered title area before any land value is worked
 * out; the deed's own area never changes.
 *
 * Reasons come from the `LandAreaDeductionReason` parameter group, so the dropdown and the
 * read-only rendering both resolve their label the same way every other coded field does.
 */
export default function LandAreaDeductionTable({
  name = 'landAreaDeductions',
}: LandAreaDeductionTableProps) {
  const { t } = useTranslation('appraisal');
  // The wording is FormTable's own, which lives in the request namespace.
  const { t: tRequest } = useTranslation('request');
  const { control } = useFormContext();
  // FormTable owns the rows while it is mounted; this instance only serves the empty state, where
  // FormTable is not rendered, and registers the name for the error scroll target below.
  const { append } = useFieldArray({ control, name });
  // The band's add link triggers FormTable's own add action, so a new row is built and keyed in
  // one place (the `fields` of a second `useFieldArray` on this name would go stale).
  const addRowRef = useRef<(() => void) | null>(null);
  // Counted from the form value, not this hook's `fields`: FormTable removes rows through its own
  // useFieldArray, and two instances on one name do not share their `fields`.
  const rows = (useWatch({ control, name }) as { areaInSqWa?: unknown }[] | null) ?? [];
  const isEmpty = rows.length === 0;
  const totalWa = sumColumn(rows, 'areaInSqWa');
  const readOnly = useFormReadOnly();

  return (
    <div className="col-span-12">
      {/* Empty, FormTable is not rendered, so the array's error scroll target lives here. */}
      {isEmpty && <div data-field={name} className="cas-repeater" />}
      <div className="cas-labelled-table">
        {/* The band: title, a muted summary and the add link. FormTable's own add bar is not
            rendered (`hideAddButton`). Shown where `.cas-table-label` is (inside `.cas-form-grid`);
            the button under the table, `cas-outside-form-only`, is its twin for where it is not. */}
        <div className="cas-table-label">
          {t('landCharacteristicsForm.deductionsTitle')}
          {!isEmpty && (
            <>
              <span className="cas-label-meta">
                {t('landCharacteristicsForm.deductionsSummary', {
                  count: rows.length,
                  area: formatNumber(totalWa, 2),
                })}
              </span>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => addRowRef.current?.()}
                  className="cas-label-add"
                >
                  + {t('landCharacteristicsForm.addDeduction')}
                </button>
              )}
            </>
          )}
        </div>
        <div className="cas-deduction-cells cas-table-card min-w-0 flex-1 rounded border border-gray-200">
          {isEmpty ? (
            // The same empty state as the other tables on the sheet: no column heads, just the prompt.
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <Icon style="regular" name="inbox" className="size-5 text-gray-300" />
              <p className="text-sm text-gray-500">{tRequest('table.noData')}</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => append(emptyRowFor(deductionColumns))}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-600 hover:border-primary-500 hover:text-primary-700"
                >
                  <Icon style="solid" name="plus" className="size-2.5" />
                  {tRequest('table.addFirstItem')}
                </button>
              )}
            </div>
          ) : (
            <>
              <FormTable
                columns={deductionColumns}
                name={name}
                sumColumns={['areaInSqWa']}
                hideAddButton
                addRowRef={addRowRef}
              />
              {/* Twin of the band's add link above, for outside `.cas-form-grid`, where
                  `.cas-table-label` is hidden. `.cas-outside-form-only` (formLayoutSkin.css) hides
                  this copy inside it, so there is exactly one add control in every context. */}
              {!readOnly && (
                <div className="cas-outside-form-only border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => addRowRef.current?.()}
                    className="flex w-full items-center justify-center gap-1.5 rounded-b-lg bg-gray-50 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <Icon style="solid" name="plus" className="size-2.5" />
                    {tRequest('table.addRow')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const deductionColumns = [
  { rowNumberColumn: true as const, label: '#' },
  {
    name: 'reasonCode',
    label: 'สาเหตุ',
    inputType: 'dropdown' as const,
    group: 'LandAreaDeductionReason',
    width: '34%',
  },
  {
    name: 'areaInSqWa',
    label: 'เนื้อที่ (ตร.ว.)',
    inputType: 'number' as const,
    width: '130px',
    align: 'right' as const,
    maxIntegerDigits: 8,
    decimalPlaces: 2,
  },
  // Percentages must leave room for the two fixed columns FormTable adds itself — the row number
  // and the delete button, 60px each. 32+18+50 came to a full 100% and pushed the last column off
  // the edge under `table-fixed`.
  { name: 'remark', label: 'หมายเหตุ', width: 'auto', maxLength: 4000 },
];

import { useTranslation } from 'react-i18next';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';
import FormTable from '@features/request/components/tables/FormTable';

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
  // FormTable owns the same array; appending here lands in its rows.
  const { append } = useFieldArray({ control, name });
  // Counted from the form value, not this hook's `fields`: FormTable removes rows through its own
  // useFieldArray, and two instances on one name do not share their `fields`.
  const isEmpty = ((useWatch({ control, name }) as unknown[] | null) ?? []).length === 0;
  const readOnly = useFormReadOnly();

  return (
    <div className="col-span-12">
      {/* Empty, FormTable is not rendered, so the array's error scroll target lives here. */}
      {isEmpty && <div data-field={name} className="cas-repeater" />}
      <div className="cas-labelled-table">
        <div className="cas-table-label">{t('landCharacteristicsForm.deductionsLabel')}</div>
        <div className="cas-deduction-cells cas-table-card min-w-0 flex-1 rounded border border-gray-200">
          {isEmpty ? (
            // The same empty state as the other tables on the sheet: no column heads, just the prompt.
            <div className="flex flex-col items-center gap-2 px-4 py-6 text-center">
              <Icon style="regular" name="inbox" className="size-5 text-gray-300" />
              <p className="text-sm text-gray-500">{tRequest('table.noData')}</p>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => append({ reasonCode: '', areaInSqWa: '', remark: '' })}
                  className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-gray-300 px-2 py-0.5 text-[0.75rem] text-gray-600 hover:border-primary-500 hover:text-primary-700"
                >
                  <Icon style="solid" name="plus" className="size-2.5" />
                  {tRequest('table.addFirstItem')}
                </button>
              )}
            </div>
          ) : (
            <FormTable columns={deductionColumns} name={name} sumColumns={['areaInSqWa']} />
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

import { useTranslation } from 'react-i18next';
import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import Input from '@/shared/components/Input';
import { Dropdown, NumberInput } from '@/shared/components/inputs';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import {
  FormTable,
  FormTableDash,
  FormTableBlock,
  FormTableRowActions,
  type FormTableColumn,
} from '@/shared/components/form';
import { sumColumn } from '@features/request/components/tables/formTableUtils';
import { formatNumber } from '@/shared/utils/formatUtils';

interface LandAreaDeductionTableProps {
  /** Field-array name. Defaults to the land form's own field. */
  name?: string;
  /** The "Area deductions" heading above the table. A caller whose section is titled the same leaves it out. */
  showTitle?: boolean;
}

type DeductionData = { reasonCode?: string | null; areaInSqWa?: unknown; remark?: string | null };

/** A row with its place in the field array (rows keep array order here). */
type DeductionItem = { id: string; index: number; row: DeductionData };

type CellField = 'reasonCode' | 'areaInSqWa' | 'remark';

/** One editable cell. `data-field` is the scroll target for its error. */
function DeductionCell({ name, index, field }: { name: string; index: number; field: CellField }) {
  const { control } = useFormContext();
  const path = `${name}.${index}.${field}`;
  const { field: f, fieldState } = useController({ name: path, control });
  const error = fieldState.error?.message;
  return (
    <div data-field={path}>
      {field === 'reasonCode' && (
        <Dropdown {...f} cell group="LandAreaDeductionReason" error={error} />
      )}
      {field === 'areaInSqWa' && (
        <NumberInput {...f} cell decimalPlaces={2} maxIntegerDigits={8} error={error} />
      )}
      {field === 'remark' && <Input {...f} cell maxLength={4000} error={error} />}
    </div>
  );
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
  showTitle = true,
}: LandAreaDeductionTableProps) {
  const { t } = useTranslation('appraisal');
  // The wording of the empty state is the request table's, which lives in the request namespace.
  const { t: tRequest } = useTranslation('request');
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const values = (useWatch({ control, name }) as DeductionData[] | null) ?? [];

  const items: DeductionItem[] = fields.map((field, index) => ({
    id: field.id,
    index,
    row: values[index] ?? {},
  }));

  const columns: FormTableColumn<DeductionItem>[] = [
    { key: 'no', kind: 'index', header: '#' },
    {
      key: 'reasonCode',
      kind: 'input',
      width: '34%',
      header: t('landCharacteristicsForm.deductionReason'),
      card: { span: 6 },
      cell: ({ index, row }, { readOnly }) =>
        readOnly ? (
          row.reasonCode ? (
            <ParameterDisplay group="LandAreaDeductionReason" code={row.reasonCode} />
          ) : (
            <FormTableDash />
          )
        ) : (
          <DeductionCell name={name} index={index} field="reasonCode" />
        ),
    },
    {
      key: 'areaInSqWa',
      kind: 'input',
      align: 'end',
      width: '10rem',
      header: t('landCharacteristicsForm.deductionArea'),
      total: formatNumber(sumColumn(values, 'areaInSqWa'), 2),
      cell: ({ index, row }, { readOnly }) => {
        if (!readOnly) return <DeductionCell name={name} index={index} field="areaInSqWa" />;
        const n = parseFloat(String(row.areaInSqWa ?? ''));
        return Number.isNaN(n) ? <FormTableDash /> : formatNumber(n, 2);
      },
    },
    {
      key: 'remark',
      kind: 'input',
      header: t('landCharacteristicsForm.deductionRemark'),
      card: { span: 12 },
      cell: ({ index, row }, { readOnly }) =>
        readOnly ? (
          row.remark || <FormTableDash />
        ) : (
          <DeductionCell name={name} index={index} field="remark" />
        ),
    },
    {
      key: 'actions',
      kind: 'action',
      width: '3rem',
      cell: ({ index }, { position }) => (
        <FormTableRowActions
          position={position}
          count={items.length}
          onDelete={() => remove(index)}
        />
      ),
    },
  ];

  return (
    <div className="col-span-12">
      {/* data-field: scroll target for array-level errors (an empty list has no cell to scroll to). */}
      <div data-field={name}>
        <FormTableBlock
          title={showTitle ? t('landCharacteristicsForm.deductionsTitle') : undefined}
        >
          <FormTable
            columns={columns}
            rows={items}
            rowKey={item => item.id}
            add={[
              {
                label: t('landCharacteristicsForm.addDeduction'),
                onClick: () => append({ reasonCode: '', areaInSqWa: '', remark: '' }),
              },
            ]}
            empty={{ icon: 'inbox', message: tRequest('table.noData') }}
          />
        </FormTableBlock>
      </div>
    </div>
  );
}

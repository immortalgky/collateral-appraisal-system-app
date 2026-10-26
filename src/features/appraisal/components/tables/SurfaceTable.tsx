import { useTranslation } from 'react-i18next';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import Input from '@/shared/components/Input';
import NumberInput from '@/shared/components/inputs/NumberInput';
import ParameterDisplay from '@/shared/components/ParameterDisplay';
import {
  FormTable,
  FormTableDash,
  FormTableHeading,
  FormTableRowActions,
  type FormTableColumn,
} from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useParameterOptions } from '@/shared/utils/parameterUtils';
import TDropdown from '@/features/pricingAnalysis/components/table/TDropdown';

export interface SurfaceData {
  fromFloorNumber: number | null;
  toFloorNumber: number | null;
  floorType: string;
  floorStructureType: string;
  floorStructureTypeOther: string;
  floorSurfaceType: string;
  floorSurfaceTypeOther: string;
}

interface SurfaceTableProps {
  name: string;
  headers?: unknown[]; // Kept for backwards compatibility, not used.
  /** The "Floor surfaces" heading above the table. A caller whose section is titled the same leaves it out. */
  showTitle?: boolean;
}

/** A row with its place in the field array (rows keep array order here). */
type SurfaceItem = { id: string; index: number; row: SurfaceData };

/** The parameter code every group uses for "Other — specify". */
const OTHER = '99';

const floorText = (from: number | null, to: number | null) =>
  from === to ? `${from}` : `${from}–${to}`;

/** A floor number: plain text when read-only, otherwise the table's number input. */
function FloorNumberCell({
  path,
  readOnly,
  invalid,
  value,
}: {
  path: string;
  readOnly: boolean;
  invalid: boolean;
  value: number | null;
}) {
  const { control } = useFormContext();
  if (readOnly) return <>{Number.isFinite(Number(value)) ? Number(value) : 0}</>;
  return (
    <Controller
      name={path}
      control={control}
      // No ref for RHF: the input takes a `value` prop, and reset() writing into the DOM node
      // behind React's back blanks it.
      render={({ field }) => (
        <NumberInput
          name={field.name}
          value={field.value}
          onChange={field.onChange}
          onBlur={field.onBlur}
          cell
          decimalPlaces={0}
          maxIntegerDigits={3}
          invalid={invalid}
        />
      )}
    />
  );
}

const SurfaceTable = ({ name, showTitle = true }: SurfaceTableProps) => {
  const { t } = useTranslation('appraisal');
  const { control, register } = useFormContext();
  const { fields, append, remove } = useFieldArray({ control, name });
  const formReadOnly = useFormReadOnly();
  const values: SurfaceData[] = useWatch({ name, control }) || [];

  const optionsByGroup = {
    FloorType: useParameterOptions('FloorType'),
    FloorStructure: useParameterOptions('FloorStructure'),
    FloorSurface: useParameterOptions('FloorSurface'),
  };
  // Inactive codes stay hidden unless the row already carries one, as the slide-over did.
  const optionsFor = (group: keyof typeof optionsByGroup, current: string) =>
    optionsByGroup[group]
      .filter(o => o.isActive !== false || o.value === current)
      .map(o => ({ value: o.value ?? undefined, label: o.label }));

  const handleAdd = () => {
    const last = values[values.length - 1];
    const next = last?.toFloorNumber != null ? last.toFloorNumber + 1 : 1;
    append({
      fromFloorNumber: next,
      toFloorNumber: next,
      floorType: '',
      floorStructureType: '',
      floorStructureTypeOther: '',
      floorSurfaceType: '',
      floorSurfaceTypeOther: '',
    });
  };

  // Warnings, not errors: neither was ever enforced, and saved rows may already look like this.
  const warningFor = (row: SurfaceData, index: number) => {
    const from = row.fromFloorNumber;
    const to = row.toFloorNumber;
    if (from == null || to == null) return null;
    if (to < from) return t('surfaceTable.reversed');
    const overlaps = values.filter(
      (other, i) =>
        i !== index &&
        other.fromFloorNumber != null &&
        other.toFloorNumber != null &&
        other.fromFloorNumber <= to &&
        from <= other.toFloorNumber,
    );
    return overlaps.length
      ? t('surfaceTable.overlap', {
          floors: overlaps.map(o => floorText(o.fromFloorNumber, o.toFloorNumber)).join(', '),
        })
      : null;
  };

  const paramCell = (
    path: string,
    group: keyof typeof optionsByGroup,
    current: string,
    otherField?: string,
    otherValue?: string,
  ) => (
    <div className="flex flex-col gap-1">
      {formReadOnly ? (
        current ? (
          <ParameterDisplay group={group} code={current} />
        ) : (
          <FormTableDash />
        )
      ) : (
        <Controller
          name={path}
          control={control}
          render={({ field: f }) => (
            <TDropdown
              cell
              showValue={false}
              placeholder="-"
              options={optionsFor(group, current)}
              value={f.value || null}
              onChange={v => f.onChange(v ?? '')}
            />
          )}
        />
      )}
      {otherField &&
        current === OTHER &&
        (formReadOnly ? (
          <span className="text-(--palette-gray-500)">{otherValue}</span>
        ) : (
          <Input
            {...register(otherField)}
            cell
            maxLength={100}
            aria-label={t('surfaceTable.otherPlaceholder')}
            placeholder={t('surfaceTable.otherPlaceholder')}
          />
        ))}
    </div>
  );

  const items: SurfaceItem[] = fields.map((field, index) => ({
    id: field.id,
    index,
    row: values[index] ?? ({} as SurfaceData),
  }));

  const floorNumber = (key: 'fromFloorNumber' | 'toFloorNumber') => ({
    cell: ({ index, row }: SurfaceItem, { readOnly }: { readOnly: boolean }) => (
      <FloorNumberCell
        path={`${name}.${index}.${key}`}
        readOnly={readOnly}
        invalid={!!warningFor(row, index)}
        value={row[key]}
      />
    ),
  });

  const paramColumn = (
    key: 'floorType' | 'floorStructureType' | 'floorSurfaceType',
    group: keyof typeof optionsByGroup,
    other?: 'floorStructureTypeOther' | 'floorSurfaceTypeOther',
  ): FormTableColumn<SurfaceItem> => ({
    key,
    kind: 'input',
    valign: 'top',
    header: t(`fieldLabels.building.${key}`),
    cell: ({ index, row }) =>
      paramCell(
        `${name}.${index}.${key}`,
        group,
        row[key],
        other && `${name}.${index}.${other}`,
        other && row[other],
      ),
  });

  const columns: FormTableColumn<SurfaceItem>[] = [
    {
      key: 'from',
      kind: 'input',
      align: 'end',
      valign: 'top',
      width: '6.4286rem',
      header: t('fieldLabels.building.fromFloorNumber'),
      ...floorNumber('fromFloorNumber'),
    },
    {
      key: 'to',
      kind: 'input',
      align: 'end',
      valign: 'top',
      width: '6.4286rem',
      header: t('fieldLabels.building.toFloorNumber'),
      ...floorNumber('toFloorNumber'),
    },
    paramColumn('floorType', 'FloorType'),
    paramColumn('floorStructureType', 'FloorStructure', 'floorStructureTypeOther'),
    paramColumn('floorSurfaceType', 'FloorSurface', 'floorSurfaceTypeOther'),
    {
      key: 'actions',
      kind: 'action',
      valign: 'top',
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
      {/* data-field: scroll target for array-level errors (see form/utils.ts). */}
      <div data-field={name}>
        {showTitle && <FormTableHeading>{t('surfaceTable.sectionLabel')}</FormTableHeading>}
        <FormTable
          columns={columns}
          rows={items}
          rowKey={item => item.id}
          minWidth={51.4286}
          rowNote={({ row, index }) => {
            const warning = warningFor(row, index);
            return warning && <span className="text-xs text-(--palette-warn)">{warning}</span>;
          }}
          add={[{ label: t('surfaceTable.addFloor'), onClick: handleAdd }]}
          empty={{ icon: 'layer-group', message: t('surfaceTable.empty') }}
        />
      </div>
    </div>
  );
};

export default SurfaceTable;

import { get, useController, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import Input from '@/shared/components/Input';
import NumberInput from '@/shared/components/inputs/NumberInput';
import {
  FormTable,
  FormTableDash,
  FormTableHeading,
  type FormTableColumn,
} from '@/shared/components/form';
import { useFormReadOnly } from '@/shared/components/form/context';

const BOUNDARY_ROWS = [
  { key: 'north', area: 'northAdjacentArea', length: 'northBoundaryLength' },
  { key: 'south', area: 'southAdjacentArea', length: 'southBoundaryLength' },
  { key: 'east', area: 'eastAdjacentArea', length: 'eastBoundaryLength' },
  { key: 'west', area: 'westAdjacentArea', length: 'westBoundaryLength' },
] as const;

type BoundaryRow = (typeof BOUNDARY_ROWS)[number];

interface BoundaryFieldsProps {
  readOnly?: boolean;
  /** The "Size and Boundary" heading above the table. A caller whose section is titled the same leaves it out. */
  showTitle?: boolean;
}

const fmt2 = (v: unknown) => {
  const n = Number(v);
  return (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

function LengthCell({ name }: { name: string }) {
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  return (
    <NumberInput
      // No ref for RHF: the input takes a `value` prop, and reset() writing into the DOM node
      // behind React's back blanks it.
      name={field.name}
      value={field.value}
      onChange={field.onChange}
      onBlur={field.onBlur}
      cell
      decimalPlaces={2}
      maxIntegerDigits={5}
      error={fieldState.error?.message}
      className="text-right tabular-nums"
    />
  );
}

/**
 * North/South/East/West boundaries — what each side adjoins (text) and its length (number) — as a
 * form table under a "Size and Boundary" heading.
 *
 * Must be rendered inside a react-hook-form <FormProvider>.
 * Pass readOnly={true} to disable all inputs (used outside the appraisal route tree).
 */
const BoundaryFields = ({ readOnly, showTitle = true }: BoundaryFieldsProps) => {
  const { t } = useTranslation('appraisal');
  const { register, formState } = useFormContext();
  const readOnlyForm = useFormReadOnly() || !!readOnly;
  const areas = useWatch({ name: BOUNDARY_ROWS.map(r => r.area) }) as (string | null)[];
  const lengths = useWatch({ name: BOUNDARY_ROWS.map(r => r.length) }) as unknown[];

  const columns: FormTableColumn<BoundaryRow>[] = [
    {
      key: 'direction',
      header: t('boundaryTable.direction'),
      width: '7.8571rem',
      cell: row => t(`titleEntry.deed.${row.key}`),
    },
    {
      key: 'adjacent',
      kind: 'input',
      header: t('boundaryTable.adjacent'),
      cell: (row, { position, readOnly: ro }) =>
        ro ? (
          areas[position] || <FormTableDash />
        ) : (
          <Input
            {...register(row.area)}
            cell
            aria-label={t('boundaryTable.adjacent')}
            maxLength={200}
            error={get(formState.errors, row.area)?.message as string | undefined}
          />
        ),
    },
    {
      key: 'length',
      kind: 'input',
      align: 'end',
      width: '12rem',
      header: t('boundaryTable.length'),
      cell: (row, { position, readOnly: ro }) =>
        ro ? fmt2(lengths[position]) : <LengthCell name={row.length} />,
    },
  ];

  return (
    <div className="col-span-12">
      {showTitle && <FormTableHeading>{t('forms.land.sectionTitleBoundary')}</FormTableHeading>}
      <FormTable
        columns={columns}
        rows={[...BOUNDARY_ROWS]}
        rowKey={row => row.key}
        readOnly={readOnlyForm}
      />
    </div>
  );
};

export default BoundaryFields;

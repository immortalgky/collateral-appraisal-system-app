import { useController, useFormContext } from 'react-hook-form';
import TextInput from '@/shared/components/inputs/TextInput';
import NumberInput from '@/shared/components/inputs/NumberInput';

type Direction = 'North' | 'South' | 'East' | 'West';

interface BoundaryRowConfig {
  direction: Direction;
  adjacentAreaField: string;
  boundaryLengthField: string;
}

const BOUNDARY_ROWS: BoundaryRowConfig[] = [
  {
    direction: 'North',
    adjacentAreaField: 'northAdjacentArea',
    boundaryLengthField: 'northBoundaryLength',
  },
  {
    direction: 'South',
    adjacentAreaField: 'southAdjacentArea',
    boundaryLengthField: 'southBoundaryLength',
  },
  {
    direction: 'East',
    adjacentAreaField: 'eastAdjacentArea',
    boundaryLengthField: 'eastBoundaryLength',
  },
  {
    direction: 'West',
    adjacentAreaField: 'westAdjacentArea',
    boundaryLengthField: 'westBoundaryLength',
  },
];

interface AdjacentAreaCellProps {
  name: string;
  readOnly?: boolean;
}

const AdjacentAreaCell = ({ name, readOnly }: AdjacentAreaCellProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <TextInput
      {...field}
      value={field.value ?? ''}
      maxLength={200}
      error={error?.message}
      disabled={readOnly}
    />
  );
};

interface BoundaryLengthCellProps {
  name: string;
  readOnly?: boolean;
}

const BoundaryLengthCell = ({ name, readOnly }: BoundaryLengthCellProps) => {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({ name, control });

  return (
    <NumberInput
      name={field.name}
      value={field.value ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={error?.message}
      maxIntegerDigits={5}
      decimalPlaces={2}
      disabled={readOnly}
    />
  );
};

interface BoundaryFieldsProps {
  readOnly?: boolean;
}

/**
 * BoundaryFields renders a compact table-style card for North/South/East/West
 * boundary data — adjacent area (text) and boundary length (number) per direction.
 *
 * Must be rendered inside a react-hook-form <FormProvider>.
 * Pass readOnly={true} to disable all inputs (used outside the appraisal route tree).
 */
/**
 * Same four rows as the shared version, dressed as a table.
 *
 * The header was a grey strip, which read as a caption rather than a table head next to the
 * title-deed table on the same screen. It now carries that table's header treatment — teal
 * ground, white text, square corners. What it deliberately keeps is inline editing: unlike the
 * title deeds there is no add or delete here, the four directions are fixed, so a row edit
 * dialog would be ceremony around two inputs.
 */
const BoundaryFields = ({ readOnly }: BoundaryFieldsProps) => {
  return (
    <div className="cas-boundary-table col-span-12">
      <div className="rounded border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[6rem_1fr_10rem] bg-primary-700 divide-x divide-primary-600">
          <div className="px-3 py-2 text-xs font-medium text-white">Direction</div>
          <div className="px-3 py-2 text-xs font-medium text-white">Consecutive Area</div>
          <div className="px-3 py-2 text-xs font-medium text-white">Est. Length (m)</div>
        </div>

        {/* Data rows */}
        {BOUNDARY_ROWS.map(({ direction, adjacentAreaField, boundaryLengthField }, index) => (
          <div
            key={direction}
            className={`grid grid-cols-[6rem_1fr_10rem] items-center divide-x divide-gray-200${
              index < BOUNDARY_ROWS.length - 1 ? ' border-b border-gray-200' : ''
            }`}
          >
            <div className="px-3 py-2 text-sm font-medium text-gray-700 self-stretch flex items-center">
              {direction}
            </div>
            <div>
              <AdjacentAreaCell name={adjacentAreaField} readOnly={readOnly} />
            </div>
            <div>
              <BoundaryLengthCell name={boundaryLengthField} readOnly={readOnly} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoundaryFields;

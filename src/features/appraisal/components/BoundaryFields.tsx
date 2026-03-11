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
}

const AdjacentAreaCell = ({ name }: AdjacentAreaCellProps) => {
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
    />
  );
};

interface BoundaryLengthCellProps {
  name: string;
}

const BoundaryLengthCell = ({ name }: BoundaryLengthCellProps) => {
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
    />
  );
};

/**
 * BoundaryFields renders a compact table-style card for North/South/East/West
 * boundary data — adjacent area (text) and boundary length (number) per direction.
 *
 * Must be rendered inside a react-hook-form <FormProvider>.
 * Reads readOnly state from FormReadOnlyContext.
 * Takes no props.
 */
const BoundaryFields = () => {
  return (
    <div className="col-span-12">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[6rem_1fr_10rem] bg-gray-50 border-b border-gray-200 divide-x divide-gray-200">
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Direction
          </div>
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Consecutive Area
          </div>
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
            Est. Length (m)
          </div>
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
            <div className="px-2 py-2">
              <AdjacentAreaCell name={adjacentAreaField} />
            </div>
            <div className="px-2 py-2">
              <BoundaryLengthCell name={boundaryLengthField} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BoundaryFields;

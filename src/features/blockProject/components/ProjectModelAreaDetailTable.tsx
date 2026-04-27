import { useController, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import TextInput from '@/shared/components/inputs/TextInput';
import NumberInput from '@/shared/components/inputs/NumberInput';
import Icon from '@/shared/components/Icon';
import { useFormReadOnly } from '@/shared/components/form/context';

interface DescriptionCellProps {
  name: string;
}

const DescriptionCell = ({ name }: DescriptionCellProps) => {
  const { control } = useFormContext();
  const { field, fieldState: { error } } = useController({ name, control });
  return (
    <TextInput
      {...field}
      value={field.value ?? ''}
      maxLength={200}
      placeholder="e.g. Interior Area"
      error={error?.message}
    />
  );
};

interface AreaSizeCellProps {
  name: string;
}

const AreaSizeCell = ({ name }: AreaSizeCellProps) => {
  const { control } = useFormContext();
  const { field, fieldState: { error } } = useController({ name, control });
  return (
    <NumberInput
      name={field.name}
      value={field.value ?? ''}
      onChange={field.onChange}
      onBlur={field.onBlur}
      error={error?.message}
      decimalPlaces={2}
      placeholder="0.00"
    />
  );
};

/**
 * Unified area-detail table for both Condo and LandAndBuilding models.
 * Renamed from CondoAreaDetailTable — same implementation, broader scope.
 * Must be rendered inside a react-hook-form <FormProvider>.
 */
const ProjectModelAreaDetailTable = () => {
  const { control } = useFormContext();
  const isReadOnly = useFormReadOnly();

  const { fields, append, remove } = useFieldArray({ control, name: 'areaDetails' });

  const areaDetailsValues = useWatch({ control, name: 'areaDetails' }) ?? [];
  const areaTotal: number = (areaDetailsValues as Array<{ areaSize?: number | null }>).reduce(
    (sum, d) => sum + (Number(d?.areaSize) || 0),
    0,
  );

  const colClass = isReadOnly ? 'grid-cols-[1fr_10rem]' : 'grid-cols-[1fr_10rem_2.5rem]';

  return (
    <div className="col-span-12">
      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <div className={`grid bg-gray-50 border-b border-gray-200 divide-x divide-gray-200 ${colClass}`}>
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">Description</div>
          <div className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide text-right">Area (sq.m.)</div>
          {!isReadOnly && <div className="px-3 py-2" />}
        </div>

        {fields.map((field, index) => (
          <div key={field.id} className={`grid items-center divide-x divide-gray-200 border-b border-gray-100 ${colClass}`}>
            <div className="px-2 py-2">
              <DescriptionCell name={`areaDetails.${index}.areaDescription`} />
            </div>
            <div className="px-2 py-2">
              <AreaSizeCell name={`areaDetails.${index}.areaSize`} />
            </div>
            {!isReadOnly && (
              <div className="px-2 py-2 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Icon name="trash" style="regular" className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        ))}

        <div className={`grid bg-gray-50 font-medium ${colClass}`}>
          <div className="px-3 py-2 text-sm text-gray-700">Total</div>
          <div className="px-3 py-2 text-right text-sm text-gray-900">
            {areaTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          {!isReadOnly && <div className="px-3 py-2" />}
        </div>
      </div>

      {!isReadOnly && (
        <button
          type="button"
          onClick={() => append({ id: undefined, areaDescription: '', areaSize: null })}
          className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary-700 transition-colors"
        >
          <Icon name="plus" style="solid" className="w-4 h-4" />
          Add row
        </button>
      )}
    </div>
  );
};

export default ProjectModelAreaDetailTable;

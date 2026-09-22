import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import clsx from 'clsx';
import Button from '@/shared/components/Button';
import SlideOverPanel from '@/shared/components/SlideOverPanel';
import NumberInput from '@/shared/components/inputs/NumberInput';
import { Textarea } from '@/shared/components';
import { useFormReadOnly } from '@/shared/components/form/context';
import { useParametersByGroup } from '@/shared/utils/parameterUtils';

export interface SurfaceData {
  fromFloorNumber: number | null;
  toFloorNumber: number | null;
  floorType: string;
  floorStructureType: string;
  floorStructureTypeOther: string;
  floorSurfaceType: string;
  floorSurfaceTypeOther: string;
}

interface SurfaceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SurfaceData) => void;
  onDelete?: () => void;
  initialData?: SurfaceData | null;
  /** The table's current rows, to point out a floor range that repeats one already entered. */
  existing?: SurfaceData[];
  editIndex?: number | null;
  mode: 'add' | 'edit';
}

const defaultSurfaceData: SurfaceData = {
  fromFloorNumber: 1,
  toFloorNumber: 1,
  floorType: '',
  floorStructureType: '',
  floorStructureTypeOther: '',
  floorSurfaceType: '',
  floorSurfaceTypeOther: '',
};

const FORM_ID = 'surface-input-form';

const floorText = (from: number | null, to: number | null) =>
  from === to ? `Floor ${from}` : `Floors ${from}–${to}`;

/**
 * A parameter group as one-click choices. Clicking the chosen one clears it — every field here is
 * optional. Inactive codes stay hidden unless the row already carries one.
 */
function ParameterChips({
  group,
  label,
  value,
  onChange,
  disabled,
}: {
  group: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const params = useParametersByGroup(group);
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {params
        .filter(p => p.isActive !== false || p.code === value)
        .map(p => {
          const selected = p.code === value;
          return (
            <button
              key={p.code}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(selected ? '' : p.code)}
              className={clsx(
                'rounded-full border px-3 py-1.5 text-[13px] transition-colors disabled:cursor-not-allowed',
                selected
                  ? 'border-primary-500 bg-primary-50 font-medium text-primary-700'
                  : 'border-gray-300 bg-white text-gray-600 enabled:hover:border-primary-400',
              )}
            >
              {selected && '✓ '}
              {p.description}
            </button>
          );
        })}
    </div>
  );
}

const SurfaceInputModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData,
  existing = [],
  editIndex = null,
  mode,
}: SurfaceInputModalProps) => {
  const methods = useForm<SurfaceData>({
    defaultValues: initialData || defaultSurfaceData,
  });
  const formReadOnly = useFormReadOnly();
  // Two clicks to delete. A ConfirmDialog portals outside the panel, which the panel treats as an
  // outside click and makes inert.
  const [confirmDelete, setConfirmDelete] = useState(false);

  const {
    handleSubmit,
    reset,
    watch,
    setValue,
    register,
    formState: { errors },
  } = methods;

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      reset(initialData || defaultSurfaceData);
      setConfirmDelete(false);
    }
  }, [isOpen, initialData, reset]);

  useEffect(() => {
    register('fromFloorNumber', { required: true, validate: v => v !== null });
    register('toFloorNumber', { required: true, validate: v => v !== null });
  }, [register]);

  const onSubmit = (data: SurfaceData) => {
    onSave(data);
    onClose();
  };

  const fromFloorNumber = watch('fromFloorNumber');
  const toFloorNumber = watch('toFloorNumber');
  const floorType = watch('floorType');
  const floorStructureType = watch('floorStructureType');
  const floorStructureTypeOther = watch('floorStructureTypeOther');
  const floorSurfaceType = watch('floorSurfaceType');
  const floorSurfaceTypeOther = watch('floorSurfaceTypeOther');

  const hasRange = fromFloorNumber != null && toFloorNumber != null;
  // Warnings, not errors: neither was ever enforced, and saved rows may already look like this.
  const reversed = hasRange && toFloorNumber < fromFloorNumber;
  const overlaps =
    hasRange && !reversed
      ? existing.filter(
          (row, i) =>
            i !== editIndex &&
            row.fromFloorNumber != null &&
            row.toFloorNumber != null &&
            row.fromFloorNumber <= toFloorNumber &&
            fromFloorNumber <= row.toFloorNumber,
        )
      : [];

  const fieldLabel = 'text-sm font-semibold text-gray-800';

  return (
    <SlideOverPanel
      isOpen={isOpen}
      onClose={onClose}
      width="lg"
      title={mode === 'add' ? 'Add Surface' : 'Edit Surface'}
      footer={
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'edit' && onDelete && !formReadOnly && (
            <Button
              variant="outline"
              type="button"
              onClick={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                onDelete();
                onClose();
              }}
              className={
                confirmDelete
                  ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                  : 'text-red-600 border-red-200 hover:bg-red-50'
              }
            >
              {confirmDelete ? 'Confirm delete' : 'Delete'}
            </Button>
          )}
          <span className="flex-1" />
          <Button variant="ghost" type="button" onClick={onClose}>
            {formReadOnly ? 'Close' : 'Cancel'}
          </Button>
          {!formReadOnly && (
            <Button type="submit" form={FORM_ID}>
              {mode === 'add' ? 'Add' : 'Save'}
            </Button>
          )}
        </div>
      }
    >
      <form
        id={FORM_ID}
        onSubmit={e => {
          // The panel portals out of the page's form, but React still bubbles submit through it.
          e.stopPropagation();
          handleSubmit(onSubmit)(e);
        }}
        className="flex flex-col divide-y divide-gray-200"
      >
        <section className="flex flex-col gap-3 pb-5">
          <h3 className={fieldLabel}>Floor Range</h3>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            <NumberInput
              label="From Floor"
              value={fromFloorNumber ?? undefined}
              onChange={e => setValue('fromFloorNumber', e.target.value)}
              decimalPlaces={0}
              maxIntegerDigits={3}
              required={true}
              error={errors.fromFloorNumber ? 'Required' : undefined}
            />
            <span className="pt-8 text-gray-400">–</span>
            <NumberInput
              label="To Floor"
              value={toFloorNumber ?? undefined}
              onChange={e => setValue('toFloorNumber', e.target.value)}
              decimalPlaces={0}
              maxIntegerDigits={3}
              required={true}
              error={errors.toFloorNumber ? 'Required' : undefined}
            />
          </div>
          {reversed && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              To Floor is lower than From Floor.
            </p>
          )}
          {overlaps.length > 0 && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Overlaps{' '}
              {overlaps.map(row => floorText(row.fromFloorNumber, row.toFloorNumber)).join(', ')},
              already entered.
            </p>
          )}
        </section>

        <section className="flex flex-col gap-3 py-5">
          <h3 className={fieldLabel}>
            Floor Type <span className="font-normal text-gray-400">· optional</span>
          </h3>
          <ParameterChips
            group="FloorType"
            label="Floor Type"
            value={floorType}
            onChange={value => setValue('floorType', value)}
            disabled={formReadOnly}
          />
        </section>

        <section className="flex flex-col gap-3 py-5">
          <h3 className={fieldLabel}>
            Floor Structure <span className="font-normal text-gray-400">· optional</span>
          </h3>
          <ParameterChips
            group="FloorStructure"
            label="Floor Structure"
            value={floorStructureType}
            onChange={value => setValue('floorStructureType', value)}
            disabled={formReadOnly}
          />
          {floorStructureType === '99' && (
            <Textarea
              label="Specify structure"
              value={floorStructureTypeOther}
              onChange={e => setValue('floorStructureTypeOther', e.target.value)}
              maxLength={100}
              rows={2}
            />
          )}
        </section>

        <section className="flex flex-col gap-3 pt-5">
          <h3 className={fieldLabel}>
            Floor Surface <span className="font-normal text-gray-400">· optional</span>
          </h3>
          <ParameterChips
            group="FloorSurface"
            label="Floor Surface"
            value={floorSurfaceType}
            onChange={value => setValue('floorSurfaceType', value)}
            disabled={formReadOnly}
          />
          {floorSurfaceType === '99' && (
            <Textarea
              label="Specify surface"
              value={floorSurfaceTypeOther}
              onChange={e => setValue('floorSurfaceTypeOther', e.target.value)}
              maxLength={100}
              rows={2}
            />
          )}
        </section>
      </form>
    </SlideOverPanel>
  );
};

export default SurfaceInputModal;

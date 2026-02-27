import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useForm, FormProvider } from 'react-hook-form';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Dropdown from '@/shared/components/inputs/Dropdown';
import NumberInput from '@/shared/components/inputs/NumberInput';

export interface SurfaceData {
  fromFloorNumber: number | null;
  toFloorNumber: number | null;
  floorType: string;
  floorStructureType: string;
  floorSurfaceType: string;
}

interface SurfaceInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: SurfaceData) => void;
  initialData?: SurfaceData | null;
  mode: 'add' | 'edit';
}

const defaultSurfaceData: SurfaceData = {
  fromFloorNumber: null,
  toFloorNumber: null,
  floorType: '',
  floorStructureType: '',
  floorSurfaceType: '',
};

const SurfaceInputModal = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  mode,
}: SurfaceInputModalProps) => {
  const methods = useForm<SurfaceData>({
    defaultValues: initialData || defaultSurfaceData,
  });

  const { handleSubmit, reset, watch, setValue } = methods;

  // Reset form when modal opens with new data
  useEffect(() => {
    if (isOpen) {
      reset(initialData || defaultSurfaceData);
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data: SurfaceData) => {
    onSave(data);
    onClose();
  };

  if (!isOpen) return null;

  const fromFloorNumber = watch('fromFloorNumber');
  const toFloorNumber = watch('toFloorNumber');
  const floorType = watch('floorType');
  const floorStructureType = watch('floorStructureType');
  const floorSurfaceType = watch('floorSurfaceType');

  // Use portal to render modal outside parent form to avoid nested form issues
  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center">
              <Icon name="layer-group" style="solid" className="size-4 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {mode === 'add' ? 'Add Surface' : 'Edit Surface'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Icon name="xmark" style="solid" className="size-4 text-gray-500" />
          </button>
        </div>

        {/* Form Content */}
        <FormProvider {...methods}>
          <form onSubmit={(e) => { e.stopPropagation(); handleSubmit(onSubmit)(e); }}>
            <div className="px-6 py-5 space-y-5">
              {/* Floor Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Floor Range
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <NumberInput
                    label="From Floor"
                    value={fromFloorNumber ?? undefined}
                    onChange={e => setValue('fromFloorNumber', e.target.value)}
                    placeholder="1"
                    decimalPlaces={0}
                  />
                  <NumberInput
                    label="To Floor"
                    value={toFloorNumber ?? undefined}
                    onChange={e => setValue('toFloorNumber', e.target.value)}
                    placeholder="2"
                    decimalPlaces={0}
                  />
                </div>
              </div>

              {/* Floor Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Type
                </label>
                <Dropdown
                  group="FloorType"
                  value={floorType}
                  onChange={value => setValue('floorType', value)}
                  placeholder="Select floor type"
                />
              </div>

              {/* Floor Structure */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Structure
                </label>
                <Dropdown
                  group="FloorStructureType"
                  value={floorStructureType}
                  onChange={value => setValue('floorStructureType', value)}
                  placeholder="Select floor structure"
                />
              </div>

              {/* Floor Surface */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Surface
                </label>
                <Dropdown
                  group="FloorSurfaceType"
                  value={floorSurfaceType}
                  onChange={value => setValue('floorSurfaceType', value)}
                  placeholder="Select floor surface"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
              <Button variant="ghost" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                <Icon name="check" style="solid" className="size-4 mr-2" />
                {mode === 'add' ? 'Add' : 'Save'}
              </Button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>,
    document.body,
  );
};

export default SurfaceInputModal;

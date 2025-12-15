import Button from '@/shared/components/Button';
import FormSection from '@/shared/components/sections/FormSection';
import { useEffect } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';

interface HeaderField {
  name?: string;
  label: string;
  type?: string;
  colSpan: number;
  disabled?: boolean;
  options?: [];
  required?: boolean;
  orientation?: string;
}

interface LandTitleModalProps {
  headers: HeaderField[];
  popupForm: UseFormReturn<any>;
  isEdit: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const LandTitleModal = ({
  headers,
  popupForm,
  isEdit,
  onCancel,
  onConfirm,
}: LandTitleModalProps) => {
  const { watch, setValue } = popupForm;
  const pricePerSqWa = watch('pricePerSquareWa');
  const totalSqWa = watch('totalSqWa');

  useEffect(() => {
    const price = Number(pricePerSqWa) || 0;
    const sqwa = Number(totalSqWa) || 0;
    setValue('governmentPrice', price * sqwa);
  }, [pricePerSqWa, totalSqWa, setValue]);

  const fields = headers.map(h => {
    if (h.type === 'dropdown') {
      return {
        type: 'dropdown',
        label: h.label,
        name: h.name,
        options: h.options ?? [],
        wrapperClassName: `col-span-${h.colSpan ?? 4}`,
        disabled: isEdit && h.disabled === true,
        required: h.required,
      };
    }
    if (h.type === 'radio-group') {
      return {
        type: 'radio-group',
        label: h.label,
        name: h.name,
        options: h.options ?? [],
        wrapperClassName: `col-span-${h.colSpan ?? 4}`,
        orientation: h.orientation,
        disabled: isEdit && h.disabled === true,
      };
    }

    return {
      type: h.type ?? 'text-input',
      label: h.label,
      name: h.name,
      wrapperClassName: `col-span-${h.colSpan ?? 4}`,
      disabled: isEdit && h.disabled === true,
    };
  });

  return (
    <FormProvider {...popupForm}>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-xl h-4/5 w-4/5 flex flex-col">
          <h2 className="text-lg font-semibold mb-2 shrink-0">Land Detail</h2>
          <div className="h-[0.1px] bg-gray-300 my-2 col-span-5"></div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-12 gap-4">
              <FormSection fields={fields} form={popupForm} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 shrink-0">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={onConfirm}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default LandTitleModal;

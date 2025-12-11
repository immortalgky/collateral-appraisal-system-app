import Button from '@/shared/components/Button';
import FormSection from '@/shared/components/sections/FormSection';
import { FormProvider, type UseFormReturn } from 'react-hook-form';

interface HeaderField {
  name?: string;
  label: string;
  inputType?: string;
  colSpan: number;
  disabledOnEdit?: boolean;
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
  const fields = headers.map(h => {
    if (h.inputType === 'dropdown') {
      return {
        type: 'dropdown',
        label: h.label,
        name: h.name,
        options: h.options ?? [],
        wrapperClassName: `col-span-${h.colSpan ?? 4}`,
        disabled: isEdit && h.disabledOnEdit === true,
        required: h.required,
      };
    }
    if (h.inputType === 'radio-group') {
      return {
        type: 'radio-group',
        label: h.label,
        name: h.name,
        options: h.options ?? [],
        wrapperClassName: `col-span-${h.colSpan ?? 4}`,
        orientation: h.orientation,
        disabled: isEdit && h.disabledOnEdit === true,
      };
    }

    return {
      type: h.inputType ?? 'text-input',
      label: h.label,
      name: h.name,
      wrapperClassName: `col-span-${h.colSpan ?? 4}`,
      disabled: isEdit && h.disabledOnEdit === true,
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

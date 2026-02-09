import Button from '@/shared/components/Button';
import { FormFields, type FormField } from '@/shared/components/form';
import { useEffect } from 'react';
import { FormProvider, type UseFormReturn } from 'react-hook-form';
import type { ListBoxItem } from '@/shared/components/inputs/Dropdown';
import type { RadioOption } from '@/shared/components/inputs/RadioGroup';

interface HeaderField {
  name: string;
  label: string;
  type?: 'text-input' | 'number-input' | 'dropdown' | 'radio-group' | 'date-input';
  colSpan: number;
  disabled?: boolean;
  options?: ListBoxItem[] | RadioOption[];
  required?: boolean;
  orientation?: 'horizontal' | 'vertical';
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

  const fields: FormField[] = headers.map(h => {
    const baseProps = {
      name: h.name,
      label: h.label,
      wrapperClassName: `col-span-${h.colSpan ?? 4}`,
      disabled: isEdit && h.disabled === true,
    };

    if (h.type === 'dropdown') {
      return {
        ...baseProps,
        type: 'dropdown' as const,
        options: (h.options ?? []) as ListBoxItem[],
        required: h.required,
      };
    }

    if (h.type === 'radio-group') {
      return {
        ...baseProps,
        type: 'radio-group' as const,
        options: (h.options ?? []) as RadioOption[],
        orientation: h.orientation,
      };
    }

    if (h.type === 'number-input') {
      return {
        ...baseProps,
        type: 'number-input' as const,
      };
    }

    if (h.type === 'date-input') {
      return {
        ...baseProps,
        type: 'date-input' as const,
      };
    }

    return {
      ...baseProps,
      type: 'text-input' as const,
    };
  });

  return (
    <FormProvider {...popupForm}>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white p-6 rounded-xl shadow-xl w-3/5 flex flex-col">
          <h2 className="text-lg font-semibold mb-2 shrink-0">Land Detail</h2>
          <div className="h-[0.1px] bg-gray-300 my-2 col-span-5"></div>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-12 gap-4">
              <FormFields fields={fields} />
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

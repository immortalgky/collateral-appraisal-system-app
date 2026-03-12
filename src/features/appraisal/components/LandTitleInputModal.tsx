import Button from '@/shared/components/Button';
import { buildFormSchema, type FormField, FormFields } from '@/shared/components/form';
import { useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';

import { landtitlesFields } from '@features/appraisal/configs/fields.ts';
import { zodResolver } from '@hookform/resolvers/zod';

interface LandTitleModalProps {
  fields: FormField[];
  defaultValues?: Record<string, any>;
  onCancel: () => void;
  onSave: (data: Record<string, any>) => void;
}

const createLandTitleForm = buildFormSchema(landtitlesFields);

const LandTitleModal = ({ fields, defaultValues, onCancel, onSave }: LandTitleModalProps) => {
  const form = useForm({
    resolver: zodResolver(createLandTitleForm),
    defaultValues: defaultValues ?? {},
  });

  useEffect(() => {
    form.reset(defaultValues ?? {});
  }, [defaultValues, form]);

  const { watch, setValue } = form;
  const pricePerSqWa = watch('governmentPricePerSqWa');
  const rai = watch('rai');
  const ngan = watch('ngan');
  const squareWa = watch('squareWa');

  useEffect(() => {
    const price = Number(pricePerSqWa) || 0;
    const totalWa = (Number(rai) || 0) * 400 + (Number(ngan) || 0) * 100 + (Number(squareWa) || 0);
    setValue('governmentPrice', price * totalWa);
  }, [pricePerSqWa, rai, ngan, squareWa, setValue]);

  const handleSave = form.handleSubmit(onSave);

  return (
    <FormProvider {...form}>
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-8">
        <div className="bg-white rounded-2xl shadow-2xl w-3/5 max-h-full flex flex-col">
          <div className="px-8 pt-8 pb-4 shrink-0">
            <h2 className="text-lg font-semibold">Land Detail</h2>
            <div className="h-px bg-gray-200 mt-4"></div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-2">
            <div className="grid grid-cols-12 gap-4">
              <FormFields fields={fields} />
            </div>
          </div>

          <div className="px-8 pb-8 pt-4 flex justify-end gap-3 shrink-0 border-t border-gray-100">
            <Button variant="ghost" type="button" onClick={onCancel}>
              Cancel
            </Button>
            <Button variant="primary" type="button" onClick={handleSave}>
              Save
            </Button>
          </div>
        </div>
      </div>
    </FormProvider>
  );
};

export default LandTitleModal;

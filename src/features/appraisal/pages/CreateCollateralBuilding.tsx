import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import BuildingDetailTable from '../forms/building/BuildingDetailTable';
import { z } from 'zod';
import { Resolver } from 'dns';
import { zodResolver } from '@hookform/resolvers/zod';
import { Description } from '@headlessui/react';

const rowSchema = z.object({
  description: z.string().min(1, 'Required'),
  amount: z.number().min(0, 'Must be ≥ 0'),
});

const formSchema = z.object({
  rows: z.array(rowSchema).min(1, 'At least one row'),
});

type FormValues = z.infer<typeof formSchema>;
type RowValues = z.infer<typeof rowSchema>;

function CreateCollateralBuilding() {
  const methods = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      rows: [{ description: '', amount: 0 }],
    },
    mode: 'onChange',
  });

  const {
    handleSubmit,
    getValues,
    formState: { errors },
  } = methods;

  return (
    <div>
      <FormProvider {...methods}>
        <BuildingDetailTable
          name={'rows'}
          headers={[
            { rowNumberColumn: true, label: 'Sq.' },
            { name: 'area', label: 'Area', inputType: 'text', className: 'w-[1200px]' },
          ]}
        />
      </FormProvider>
    </div>
  );
}

export default CreateCollateralBuilding;

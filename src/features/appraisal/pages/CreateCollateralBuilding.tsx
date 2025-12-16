import { FormProvider, useForm, useFormContext } from 'react-hook-form';
import BuildingDetailTable from '../forms/building/BuildingDetailTable';
import { z } from 'zod';
import { Resolver } from 'dns';
import { zodResolver } from '@hookform/resolvers/zod';
import { Description } from '@headlessui/react';
import CalculationTable from '../forms/building/CalculationTable';

const rowSchema = z.object({
  atYear: z.number().min(0, 'Must be ≥ 0'),
  toYear: z.number().min(0, 'Must be ≥ 0'),
  deprePerYear: z.number().min(0, 'Must be ≥ 0').max(100, 'Must be <= 100'),
  totalDepre: z.number(),
  price: z.number(),
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
      rows: [{ atYear: 1, toYear: 2, deprePerYear: 2, totalDepre: 2, price: 0 }],
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
        <CalculationTable
          name={'rows'}
          headers={[
            { rowNumberColumn: true, label: 'Sq.' },
            { name: 'atYear', label: 'At Year', inputType: 'number', className: 'w-[120px]' },
            { name: 'toYear', label: 'To Year', inputType: 'number', className: 'w-[120px]' },
            {
              name: 'deprePerYear',
              label: 'Depreciation per Year',
              inputType: 'number',
              className: 'w-[120px]',
            },
            {
              name: 'totalDepre',
              label: 'Total Depreciation Percentage',
              inputType: 'number',
              className: 'w-[120px]',
            },
            {
              name: 'price',
              label: 'Price Depreciation',
              inputType: 'number',
              className: 'w-[200px]',
            },
          ]}
        />
      </FormProvider>
    </div>
  );
}

export default CreateCollateralBuilding;

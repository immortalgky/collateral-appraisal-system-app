import { FormProvider, useController, useForm, type SubmitHandler } from 'react-hook-form';
import BuildingDetailTable from '../forms/building/BuildingDetailTable';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@headlessui/react';
import { buildingDetailSchema, type BuildingDetailFormValue } from '../forms/building/bType';
import { BuildingDetail } from '../forms/building/BuildlingDetail';

function CreateCollateralBuilding() {
  const methods = useForm<BuildingDetailFormValue>({
    resolver: zodResolver(buildingDetailSchema),
    defaultValues: {
      buildings: [
        {
          seq: 1,
          detail: 'Test',
          isBuilding: false,
          area: 200,
          pricePerSqMeterBeforeDepreciation: 100,
          totalPriceBeforeDepreciation: 1000,
          year: 1,
          depreciationPercentPerYear: 3,
          totalDepreciationPercent: 3,
          method: 'Period',
          pricePerSqMeterAfterDepreciation: 700,
          totalPriceAfterDepreciation: 1000,
          buildingDepreciations: [],
        },
      ],
    },
    mode: 'onSubmit',
  });

  const { handleSubmit, control, getValues } = methods;

  const onSubmit: SubmitHandler<BuildingDetailFormValue> = data => {
    console.log(data);
  };

  const onDraft = () => {
    console.log(getValues());
  };

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <BuildingDetail name={'buildings'} />
          <Button onClick={() => onDraft()}>Save Draft</Button>
        </form>
      </FormProvider>
    </div>
  );
}

export default CreateCollateralBuilding;

import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@headlessui/react';
import { z } from 'zod';

// TODO: Import from proper location when files are created
const buildingDetailSchema = z.object({
  buildings: z.array(z.any()),
});
type BuildingDetailFormValue = z.infer<typeof buildingDetailSchema>;

// Placeholder component until BuildingDetail is created
const BuildingDetail = ({ name: _name }: { name: string }) => (
  <div>Building Detail Component Placeholder</div>
);

function CreateCollateralBuilding() {
  const methods = useForm<BuildingDetailFormValue>({
    resolver: zodResolver(buildingDetailSchema),
    defaultValues: {
      buildings: [
        // {
        //   seq: 1,
        //   detail: '',
        //   isBuilding: false,
        //   area: 0,
        //   pricePerSqMeterBeforeDepreciation: 0,
        //   totalPriceBeforeDepreciation: 0,
        //   year: 0,
        //   depreciationPercentPerYear: 0,
        //   totalDepreciationPercent: 0,
        //   method: 'Period',
        //   totalDepreciation: 0,
        //   pricePerSqMeterAfterDepreciation: 0,
        //   totalPriceAfterDepreciation: 0,
        //   buildingDepreciations: [],
        // },
      ],
    },
    mode: 'onSubmit',
  });

  const { handleSubmit, control: _control, getValues } = methods;

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

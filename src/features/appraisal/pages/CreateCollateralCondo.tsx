import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import CondoInformationForm from '../forms/CondoInformationForm';
import CondoLocation from '../forms/CondoLocationForm';
import Button from '@/shared/components/Button';
import CancelButton from '@/shared/components/buttons/CancelButton';
import { FormCard } from '@/shared/components';

type CondoFormValues = {
  PropertyName: string;
};

function CreateCollateralCondo() {
  const methods = useForm<CondoFormValues>({
    defaultValues: {
      PropertyName: '',
    },
  });

  const {
    handleSubmit,
    getValues,
    formState: { errors },
  } = methods;

  const onSubmit: SubmitHandler<CondoFormValues> = data => {
    console.log(data, errors);
  };

  return (
    <div>
      <FormProvider {...methods}>
        <FormCard title="Appraisal Information">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <CondoInformationForm index={0} />
            <CondoLocation index={0} />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <CancelButton />
                </div>
                <div className="flex gap-3">
                  <Button type="submit">Save</Button>
                </div>
              </div>
            </div>
          </form>
        </FormCard>
      </FormProvider>
    </div>
  );
}

export default CreateCollateralCondo;

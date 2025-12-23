import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import Button from '@/shared/components/Button';
import CancelButton from '@/shared/components/buttons/CancelButton';
import { DeleteButton, DuplicateButton } from '@/shared/components';
import {
  CreateCollateralCondoRequest,
  CreateCollateralCondoRequestDefaults,
  type CreateCollateralCondoRequestType,
} from '@/shared/forms/typeCondo';
import { zodResolver } from '@hookform/resolvers/zod';
import CondoDetailForm from '../forms/CondoDetailForm';

function CreateCondoPage() {
  const methods = useForm<CreateCollateralCondoRequestType>({
    defaultValues: CreateCollateralCondoRequestDefaults,
    resolver: zodResolver(CreateCollateralCondoRequest),
  });

  const {
    handleSubmit,
    getValues,
    formState: { errors },
  } = methods;

  // const { mutate } = useCreateCollateral();

  const onSubmit: SubmitHandler<CreateCollateralCondoRequestType> = data => {
    console.log(data);
  };

  const handleSaveDraft = () => {
    const data = getValues();
    console.log(data);
  };

  return (
    <div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <CondoDetailForm />
          {/* action */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CancelButton />
                <div className="h-6 w-px bg-gray-200" />
                <div className="flex gap-3">
                  <DeleteButton />
                  <DuplicateButton />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={handleSaveDraft}>
                  Save draft
                </Button>
                <Button type="submit">Save</Button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}

export default CreateCondoPage;

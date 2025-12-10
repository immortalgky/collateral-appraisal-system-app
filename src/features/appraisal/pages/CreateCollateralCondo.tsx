import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import Button from '@/shared/components/Button';
import CancelButton from '@/shared/components/buttons/CancelButton';
import {
  DeleteButton,
  DuplicateButton,
  FormCard,
  FormSection,
  type FormField,
} from '@/shared/components';
import SectionDivider from '@/shared/components/sections/SectionDivider';
import AreaDetailForm from '../forms/CondoForm/AreaDetailForm';
import {
  CreateCollateralCondoRequest,
  CreateCollateralCondoRequestDefaults,
  type CreateCollateralCondoRequestType,
} from '@/shared/forms/typeCondo';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ageHeightCondoFields,
  condoDecorationFields,
  condoFacilityFields,
  condoFields,
  condoLocationFields,
  condoRoomLayoutFormFields,
  constructionMaterialsFormFields,
  enviromentFields,
  expropriationFields,
  floorFormFields,
  inForestBoundaryFormFields,
  locationViewFormFields,
  remarkFormFields,
  roofFormFields,
} from '../forms/CondoForm/CondoFields';
import FormRadioGroupOther from '../../../shared/components/inputs/FormRadioGroupWithInput';

function CreateCollateralCondo() {
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
          <FormCard title="Appraisal Information">
            {/* Condominum Information */}
            <div className="grid grid-cols-4 gap-6 p-b">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Condominum Information</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={condoFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Condominium Location */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Condominium Location</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={condoLocationFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Decoration */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Decoration</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={condoDecorationFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Age/ Height Condominium */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Age/ Height of the Condominium Building</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={ageHeightCondoFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Construction Materials */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Construction Materials</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={constructionMaterialsFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Room Layout */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Room Layout</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={condoRoomLayoutFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Location View */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Location View</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={locationViewFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Floor */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Floor</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={floorFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Roof */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Roof</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={roofFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Area Details */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Area Details</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <AreaDetailForm />
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Expropriation */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Expropriation</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={expropriationFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Condominuim Facility */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Condominuim Facility</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={condoFacilityFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* Environment */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Environment</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={enviromentFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider label={''} />

            {/* In Forest Boundary */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">In Forrest Boundary</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={inForestBoundaryFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
            <SectionDivider
              label={''}
              orientation={'vertical'}
              color={'neutral'}
              className="h-20"
            />

            {/* Remarks */}
            <div className="grid grid-cols-4 gap-6">
              <div className="font-medium col-span-1">
                <p className="col-span-1">Remarks</p>
              </div>
              <div className="grid grid-cols-12 gap-4 col-span-3">
                <FormSection fields={remarkFormFields} namePrefix={''}></FormSection>
              </div>
            </div>
          </FormCard>

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

export default CreateCollateralCondo;

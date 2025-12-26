import ResizableSidebar from '@/shared/components/ResizableSidebar';
import AppHeader from '@/shared/components/sections/AppHeader';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import { CreateBuildingRequest, type CreateBuildingRequestType } from '@/shared/forms/typeBuilding';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateBuildingRequest } from '../api';
import { createBuildingRequestDefaults } from '@/shared/forms/defaults';
import { BuildingDetailTest } from '../components/RHFArrayTable/BuildingDetailTest';

const CreateBuildingPage = () => {
  const methods = useForm<CreateBuildingRequestType>({
    defaultValues: createBuildingRequestDefaults,
    resolver: zodResolver(CreateBuildingRequest),
  });
  const { handleSubmit, getValues } = methods;

  const { mutate } = useCreateBuildingRequest();
  const onSubmit: SubmitHandler<CreateBuildingRequestType> = data => {
    mutate(data);
  };
  const { isOpen, onToggle } = useDisclosure();
  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };
  return (
    <div>
      <div className="flex flex-col gap-4">
        <AppHeader iconVariant="folder" title={'Request for Credit Limit'} />
        <NavAnchors anchors={[{ label: 'Properties', id: 'properties-information' }]} />
      </div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex flex-col gap-6 w-full">
                  <div>
                    <h2 className="text-lg font-semibol mb-2">Appraisal Information</h2>
                    <div className="h-[0.1px] bg-gray-300 col-span-5"></div>
                  </div>
                  <div>
                    <Section id="land-title" anchor className="flex flex-col gap-6">
                      <BuildingDetailForm />
                      {/*<BuildingDetailTest name={"building"} />*/}
                    </Section>
                  </div>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>
          <div className="flex justify-between items-center p-4">
            <div className="flex items-center gap-4">
              <CancelButton />
              <div className="h-6 w-px bg-gray-200" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" type="button" onClick={handleSaveDraft}>
                Save draft
              </Button>
              <Button type="submit">Save</Button>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateBuildingPage;

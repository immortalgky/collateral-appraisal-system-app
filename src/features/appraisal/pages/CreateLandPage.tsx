import ResizableSidebar from '@/shared/components/ResizableSidebar';
import AppHeader from '@/shared/components/sections/AppHeader';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import TitleDeedForm from '../forms/TitleDeedForm';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import { CreateLandRequest, type CreateLandRequestType } from '@/shared/forms/v2';
import { useCreateLandRequest } from '../api';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLandRequestDefaults } from '@/shared/forms/defaults';
import LandDetailForm from '../forms/LandDetailForm';

const CreateLandPage = () => {
  const methods = useForm<CreateLandRequestType>({
    defaultValues: createLandRequestDefaults,
    resolver: zodResolver(CreateLandRequest),
  });
  const { handleSubmit, getValues } = methods;

  const { mutate } = useCreateLandRequest();
  const onSubmit: SubmitHandler<CreateLandRequestType> = data => {
    mutate(data);
  };
  const { isOpen, onToggle } = useDisclosure();
  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <AppHeader iconVariant="folder" title={'Request for Credit Limit'} />
        <NavAnchors anchors={[{ label: 'Properties', id: 'properties-information' }]} />
      </div>
      <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex-auto flex flex-col gap-6 ">
                  <div>
                    <h2 className="text-lg font-semibol mb-2">Appraisal Information</h2>
                    <div className="h-[0.1px] bg-gray-300 col-span-5"></div>
                  </div>
                  <Section id="land-title" anchor className="flex flex-col gap-6">
                    <TitleDeedForm />
                  </Section>
                  <Section id="land-info" anchor className="flex flex-col gap-6">
                    <LandDetailForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>

            <div className="flex justify-between items-center">
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
    </div>
  );
};

export default CreateLandPage;

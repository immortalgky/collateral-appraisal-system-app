import ResizableSidebar from '@/shared/components/ResizableSidebar';
import AppHeader from '@/shared/components/sections/AppHeader';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import TitleDeedForm from '../forms/TitleDeedForm';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import { useCreateLandRequest } from '../api';
import { zodResolver } from '@hookform/resolvers/zod';
import { createLandBuildingRequestDefault } from '@/shared/forms/defaults';
import LandDetailForm from '../forms/LandDetailForm';
import { useState } from 'react';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  CreateLandBuildingRequest,
  type CreateLandBuildingRequestType,
} from '@/shared/forms/typeLandBuilding';
import { Toggle } from '@/shared/components/inputs';

const CreateLandBuildingPage = () => {
  const methods = useForm<CreateLandBuildingRequestType>({
    defaultValues: createLandBuildingRequestDefault,
    resolver: zodResolver(CreateLandBuildingRequest),
  });
  const { handleSubmit, getValues } = methods;

  const { mutate } = useCreateLandRequest();
  const onSubmit: SubmitHandler<CreateLandBuildingRequestType> = data => {
    mutate(data);
  };
  const { isOpen, onToggle } = useDisclosure();
  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  const [isToggled, setIsToggled] = useState(false);

  const scrollToTarget = () => {
    const targetElement = document.getElementById(
      `${isToggled ? 'land-section' : 'building-section'}`,
    );
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth', // This makes the JS trigger smooth (optional if scroll-smooth is on html)
        block: 'start', // Aligns the top of the element to the top of the viewport
      });
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
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
                <div className="flex-auto flex flex-col gap-6 ">
                  <div className="fixed right-15 z-30">
                    <Toggle
                      onChange={() => {
                        setIsToggled(!isToggled);
                        scrollToTarget();
                      }}
                      options={['Land', 'Building']}
                      checked={isToggled}
                      defaultChecked={false}
                    />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibol mb-2">Appraisal Information</h2>
                    <div className="h-[0.1px] bg-gray-300 col-span-5"></div>
                  </div>
                  {isToggled ? (
                    <div id="land-section">
                      <Section id="land-title" anchor className="flex flex-col gap-6">
                        <TitleDeedForm />
                      </Section>
                      <Section id="land-info" anchor className="flex flex-col gap-6">
                        <LandDetailForm />
                      </Section>
                    </div>
                  ) : (
                    <div id="building-section">
                      <Section id="building-info" anchor className="flex flex-col gap-6">
                        <BuildingDetailForm prefix="building" />
                      </Section>
                    </div>
                  )}
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>
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
  );
};

export default CreateLandBuildingPage;

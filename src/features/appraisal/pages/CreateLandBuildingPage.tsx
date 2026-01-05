import { useState } from 'react';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useLocation } from 'react-router-dom';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import TitleDeedForm from '../forms/TitleDeedForm';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useCreateLandBuildingRequest } from '../api';
import LandDetailForm from '../forms/LandDetailForm';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  CreateLandBuildingRequest,
  type CreateLandBuildingRequestType,
} from '@/shared/forms/typeLandBuilding';

// TODO: Add proper defaults when schema is finalized
const createLandBuildingRequestDefault = {} as any;

const CreateLandBuildingPage = () => {
  const { propertyId } = useParams<{ propertyId?: string }>();
  const location = useLocation();

  const methods = useForm<CreateLandBuildingRequestType>({
    defaultValues: createLandBuildingRequestDefault,
    resolver: zodResolver(CreateLandBuildingRequest),
  });
  const { handleSubmit, getValues } = methods;

  const { mutate } = useCreateLandBuildingRequest();

  const onSubmit: SubmitHandler<CreateLandBuildingRequestType> = data => {
    mutate({
      ...data,
      collateralId: propertyId,
    } as any);
  };

  const { isOpen, onToggle } = useDisclosure();

  const handleSaveDraft = () => {
    const data = getValues();
    mutate({
      ...data,
      collateralId: propertyId,
    } as any);
  };

  // Tab selection state (Land or Building)
  const [activeTab, setActiveTab] = useState<'land' | 'building'>('land');

  // Only show Photos tab if we have a propertyId (not for new)
  const photosHref = propertyId ? `${location.pathname}/photos` : undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors with Land/Building tabs */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Land', id: 'land-section', icon: 'mountain-sun', onClick: () => setActiveTab('land') },
            { label: 'Building', id: 'building-section', icon: 'building', onClick: () => setActiveTab('building') },
            ...(propertyId
              ? [{ label: 'Photos', id: 'photos', icon: 'images', href: photosHref }]
              : []),
          ]}
        />
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex-auto flex flex-col gap-6 min-w-0">
                  {/* Land Tab Content */}
                  <div
                    id="land-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'land' ? 'hidden' : ''}`}
                  >
                      {/* Land Section Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Icon name="mountain-sun" style="solid" className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Land Information</h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="land-title" anchor className="flex flex-col gap-6 min-w-0 overflow-hidden">
                        <TitleDeedForm />
                      </Section>
                      <Section id="land-info" anchor className="flex flex-col gap-6 min-w-0 overflow-hidden">
                        <LandDetailForm />
                      </Section>
                  </div>

                  {/* Building Tab Content */}
                  <div
                    id="building-section"
                    className={`flex flex-col gap-6 ${activeTab !== 'building' ? 'hidden' : ''}`}
                  >
                      {/* Building Section Header */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Icon name="building" style="solid" className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Building Information</h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="building-info" anchor className="flex flex-col gap-6">
                        <BuildingDetailForm prefix="building" />
                      </Section>
                  </div>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Buttons */}
          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CancelButton />
                <div className="h-6 w-px bg-gray-200" />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={handleSaveDraft}>
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save draft
                </Button>
                <Button type="submit">
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateLandBuildingPage;

import { useEffect, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import TitleDeedForm from '../forms/TitleDeedForm';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  useCreateLandAndBuildingProperty,
  useGetLandAndBuildingPropertyById,
  useUpdateLandAndBuildingProperty,
} from '../api/property';
import LandDetailForm from '../forms/LandDetailForm';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  createLandAndBuildingForm,
  createLandAndBuildingFormDefault,
  type createLandAndBuildingFormType,
} from '../schemas/form';
import toast from 'react-hot-toast';
import { mapLandAndBuildingPropertyResponseToForm, mapLandAndBuildingFormDataToApiPayload } from '../utils/mappers';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';

// TODO: Add proper defaults when schema is finalized

const CreateLandBuildingPage = () => {
  const navigate = useNavigate();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const isEditMode = Boolean(propertyId);

  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const methods = useForm<createLandAndBuildingFormType>({
    defaultValues: createLandAndBuildingFormDefault,
    resolver: zodResolver(createLandAndBuildingForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  const { data: propertyData, isLoading } = useGetLandAndBuildingPropertyById(
    appraisalId,
    propertyId,
  );

  useEffect(() => {
    if (isEditMode && propertyData) {
      const formValues = mapLandAndBuildingPropertyResponseToForm(propertyData);
      reset(formValues);
    }
  }, [isEditMode, propertyData, reset]);

  // const { mutate } = useCreateLandAndBuildingProperty();
  const { mutate: createLandAndBuildingProperties, isPending: isCreating } =
    useCreateLandAndBuildingProperty();
  const { mutate: updateLandAndBuildingProperties, isPending: isUpdating } =
    useUpdateLandAndBuildingProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createLandAndBuildingFormType> = data => {
    setSaveAction('submit');
    const payload = mapLandAndBuildingFormDataToApiPayload(data);

    if (isEditMode && propertyId) {
      updateLandAndBuildingProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: payload as any,
        },
        {
          onSuccess: () => {
            toast.success('Property land and building updated successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createLandAndBuildingProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: payload as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Property land and building created successfully');
            setSaveAction(null);
            navigate(`/appraisal/${appraisalId}/property/land-building/${response.id}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to create property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  const handleSaveDraft = () => {
    setSaveAction('draft');

    const data = getValues();
    const payload = mapLandAndBuildingFormDataToApiPayload(data);

    if (isEditMode && propertyId) {
      updateLandAndBuildingProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: payload as any,
        },
        {
          onSuccess: () => {
            toast.success('Draft saved successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createLandAndBuildingProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: payload as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.id) {
              navigate(`/appraisal/${appraisalId}/property/land-building/${response.id}`);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  // Tab selection state (Land or Building)
  const [activeTab, setActiveTab] = useState<'land' | 'building'>('land');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors with Land/Building tabs */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Photos', id: 'photos', icon: 'images' },
            {
              label: 'Land',
              id: 'land-section',
              icon: 'mountain-sun',
              onClick: () => setActiveTab('land'),
            },
            {
              label: 'Building',
              id: 'building-section',
              icon: 'building',
              onClick: () => setActiveTab('building'),
            },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createLandAndBuildingForm}>
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
                  {/* Photos Section */}
                  <Section id="photos" anchor className="min-w-0 overflow-hidden">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
                    </div>
                    <div className="h-px bg-gray-200 mb-4" />
                    {appraisalId && (
                      <PropertyPhotoSection
                        ref={photoSectionRef}
                        appraisalId={appraisalId}
                        propertyId={propertyId}
                      />
                    )}
                  </Section>

                  {/* Land Tab Content */}
                  <div
                    id="land-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'land' ? 'hidden' : ''}`}
                  >
                    {/* Land Section Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Icon
                          name="mountain-sun"
                          style="solid"
                          className="w-5 h-5 text-amber-600"
                        />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Land Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <Section
                      id="land-title"
                      anchor
                      className="flex flex-col gap-6 min-w-0 overflow-hidden"
                    >
                      <TitleDeedForm />
                    </Section>
                    <Section
                      id="land-info"
                      anchor
                      className="flex flex-col gap-6 min-w-0 overflow-hidden"
                    >
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
                      <BuildingDetailForm />
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
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleSaveDraft}
                  isLoading={isPending && saveAction === 'draft'}
                  disabled={isPending}
                >
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save draft
                </Button>
                <Button
                  type="submit"
                  isLoading={isPending && saveAction === 'submit'}
                  disabled={isPending}
                >
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

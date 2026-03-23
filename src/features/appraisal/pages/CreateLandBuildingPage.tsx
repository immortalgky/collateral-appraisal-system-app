import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import TitleDeedForm from '../forms/TitleDeedForm';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
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
import {
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
} from '../utils/mappers';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { ConstructionInspectionTab } from '../components/tabs/ConstructionInspectionTab';

const CreateLandBuildingPage = () => {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const isEditMode = Boolean(propertyId);

  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const { data: propertyData, isLoading } = useGetLandAndBuildingPropertyById(
    appraisalId,
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return mapLandAndBuildingPropertyResponseToForm(propertyData);
    }
    return createLandAndBuildingFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLandAndBuildingFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLandAndBuildingForm),
  });
  const {
    handleSubmit,
    getValues,
    reset,
    formState: { dirtyFields },
  } = methods;

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // Reset form when API data arrives or updates (edit mode only)
  useEffect(() => {
    if (isEditMode && propertyData) {
      reset(mapLandAndBuildingPropertyResponseToForm(propertyData));
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
            reset(getValues());
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
            skipWarning();
            navigate(`/appraisals/${appraisalId}/property/land-building/${response.propertyId}`);
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
            reset(getValues());
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
            if (response.propertyId) {
              skipWarning();
              navigate(`/appraisals/${appraisalId}/property/land-building/${response.propertyId}`);
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

  // Tab selection state (Land, Building, or Construction)
  const isUnderConstruction = methods.watch('isUnderConstruction');
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'construction' ? 'construction' : 'land';
  const [activeTab, setActiveTab] = useState<'land' | 'building' | 'construction'>(initialTab);

  // Reset to default tab if construction tab is active but property is not under construction
  useEffect(() => {
    if (activeTab === 'construction' && !isUnderConstruction) {
      setActiveTab('land');
    }
  }, [isUnderConstruction, activeTab]);

  if (isLoading || (isEditMode && !propertyData)) {
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
            ...(isUnderConstruction
              ? [
                  {
                    label: 'Construction Inspection',
                    id: 'construction-section',
                    icon: 'helmet-safety',
                    onClick: () => setActiveTab('construction'),
                  },
                ]
              : []),
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

                  {/* Construction Inspection Tab Content */}
                  {isUnderConstruction && (
                    <div
                      id="construction-section"
                      className={`flex flex-col gap-6 ${activeTab !== 'construction' ? 'hidden' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Icon name="helmet-safety" style="solid" className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Construction Inspection</h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="construction-info" anchor className="flex flex-col gap-6">
                        <ConstructionInspectionTab readOnly={isReadOnly} />
                      </Section>
                    </div>
                  )}
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Buttons */}
          <ActionBar>
            <ActionBar.Left>
              <CancelButton />
              {!isReadOnly && (
                <>
                  <ActionBar.Divider />
                  <ActionBar.UnsavedIndicator show={hasDirtyFields} />
                </>
              )}
            </ActionBar.Left>
            {!isReadOnly && (
              <ActionBar.Right>
                <Button
                  variant="ghost"
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
              </ActionBar.Right>
            )}
          </ActionBar>

          <UnsavedChangesDialog blocker={blocker} />
        </form>
      </FormProvider>
    </div>
  );
};

export default CreateLandBuildingPage;

import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import TitleDeedForm from '../forms/TitleDeedForm';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useCreateLandProperty, useGetLandPropertyById, useUpdateLandProperty } from '../api';
import LandDetailForm from '../forms/LandDetailForm';
import { createLandForm, createLandFormDefault, type createLandFormType } from '../schemas/form';
import { useEffect, useState } from 'react';
import { mapLandPropertyResponseToForm } from '@/features/appraisal/utils/mappers';
import toast from 'react-hot-toast';

const CreateLandPage = () => {
  const navigate = useNavigate();

  // Get propertyId from URL params to determine edit or create mode
  const { propertyId } = useParams<{ propertyId?: string }>();

  const isEditMode = Boolean(propertyId);

  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;
  const location = useLocation();

  const methods = useForm<createLandFormType>({
    defaultValues: createLandFormDefault,
    resolver: zodResolver(createLandForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  const { data: propertyData, isLoading } = useGetLandPropertyById(appraisalId, propertyId);

  useEffect(() => {
    if (isEditMode && propertyData) {
      const formValues = mapLandPropertyResponseToForm(propertyData);
      reset(formValues);
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createLandProperties, isPending: isCreating } = useCreateLandProperty();
  const { mutate: updateLandProperties, isPending: isUpdating } = useUpdateLandProperty();

  const isPending = isCreating || isUpdating;

  // Track which save action is in progress (for loading state on the correct button)
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createLandFormType> = data => {
    setSaveAction('submit');

    if (isEditMode && propertyId) {
      updateLandProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
        {
          onSuccess: () => {
            toast.success('Property land updated successfully');
            setSaveAction(null);
            navigate(`/appraisal/${appraisalId}/property`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createLandProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
        {
          onSuccess: response => {
            toast.success('Property land updated successfully');
            setSaveAction(null);
            navigate(`/appraisal/${appraisalId}/property/land/${response.id}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
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

    if (isEditMode && propertyId) {
      updateLandProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
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
      createLandProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
        {
          onSuccess: response => {
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.id) {
              navigate(`/appraisal/${appraisalId}/property/land/${response.id}`);
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

  // Only show Photos tab if we have a propertyId (not for new)
  const photosHref = propertyId ? `${location.pathname}/photos` : undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Land', id: 'properties-section', icon: 'mountain-sun' },
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
                  {/* Land Information Header */}
                  <Section id="properties-section" anchor>
                    <div className="flex items-center gap-3 mb-4">
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
                  </Section>

                  {/* Land Forms */}
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

export default CreateLandPage;

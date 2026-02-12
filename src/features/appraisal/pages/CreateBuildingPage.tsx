import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  useCreateBuildingRequest,
  useGetBuildingPropertyById,
  useUpdateBuildingProperty,
} from '../api';
import {
  createBuildingForm,
  createBuildingFormDefault,
  type createBuildingFormType,
} from '../schemas/form';
import { useEffect, useState } from 'react';
import { mapBuildingPropertyResponseToForm } from '../utils/mappers';
import toast from 'react-hot-toast';

interface BuildingPageProp {
  readOnly?: boolean;
}

const CreateBuildingPage = () => {
  const navigate = useNavigate();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;

  const isEditMode = Boolean(propertyId);

  const location = useLocation();

  const methods = useForm<createBuildingFormType>({
    defaultValues: createBuildingFormDefault,
    resolver: zodResolver(createBuildingForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  const { data: propertyData, isLoading } = useGetBuildingPropertyById(appraisalId, propertyId);

  useEffect(() => {
    if (isEditMode && propertyData) {
      const formValues = mapBuildingPropertyResponseToForm(propertyData);
      reset(formValues);
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createBuildingProperties, isPending: isCreating } = useCreateBuildingRequest();
  const { mutate: updateBuildingProperties, isPending: isUpdating } = useUpdateBuildingProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createBuildingFormType> = data => {
    setSaveAction('submit');

    if (isEditMode && propertyId) {
      updateBuildingProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
        {
          onSuccess: () => {
            toast.success('Property building updated successfully');
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
      createBuildingProperties(
        {
          ...data,
          apprId: appraisalId,
          propertyId: propertyId,
        } as any,
        {
          onSuccess: response => {
            toast.success('Property building updated successfully');
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
      updateBuildingProperties(
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
      createBuildingProperties(
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
              navigate(`/appraisa/${appraisalId}/property/land/${response.id}`);
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
            { label: 'Building', id: 'properties-section', icon: 'building' },
            ...(propertyId
              ? [{ label: 'Photos', id: 'photos', icon: 'images', href: photosHref }]
              : []),
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createBuildingForm}>
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
                  {/* Building Information Header */}
                  <Section id="properties-section" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon name="building" style="solid" className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Building Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                  </Section>

                  {/* Building Form */}
                  <Section
                    id="building-info"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <BuildingDetailForm />
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

export default CreateBuildingPage;

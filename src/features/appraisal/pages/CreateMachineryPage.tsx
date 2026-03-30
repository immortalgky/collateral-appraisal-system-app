import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createMachineryForm,
  createMachineryFormDefault,
  type createMachineryFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import Icon from '@/shared/components/Icon';
import { FormProvider } from '@/shared/components/form/FormProvider';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import Section from '@/shared/components/sections/Section';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import PropertyPhotoSection from '../components/PropertyPhotoSection';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import {
  useCreateMachineryProperty,
  useGetMachineryPropertyById,
  useUpdateMachineryProperty,
} from '../api';
import { mapMachineryPropertyResponseToForm } from '../utils/mappers';
import MachineryDetailForm from '../forms/MachineryDetailForm';

const CreateMachineryPage = () => {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  const { data: propertyData, isLoading } = useGetMachineryPropertyById(appraisalId, propertyId);

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return mapMachineryPropertyResponseToForm(propertyData);
    }
    return createMachineryFormDefault;
  }, [isEditMode, propertyData]);
  const methods = useForm<createMachineryFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createMachineryForm),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { dirtyFields },
  } = methods;

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  useEffect(() => {
    if (isEditMode && propertyData) {
      reset(mapMachineryPropertyResponseToForm(propertyData));
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createMachineryProperties, isPending: isCreating } = useCreateMachineryProperty();
  const { mutate: updateMachineryProperties, isPending: isUpdating } = useUpdateMachineryProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createMachineryFormType> = data => {
    setSaveAction('submit');

    if (isEditMode && propertyId) {
      updateMachineryProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: data as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success('Property Machinery updated successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createMachineryProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: data as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Property Machinery created successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/machinery/${response.propertyId}`);
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

    if (isEditMode && propertyId) {
      updateMachineryProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: data as any,
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
      createMachineryProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: data as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/machinery/${response.propertyId}`);
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

  if (isLoading || (isEditMode && !propertyData)) {
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
            { label: 'Photos', id: 'photos', icon: 'images' },
            { label: 'Machinery', id: 'properties-section', icon: 'tractor' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createMachineryForm}>
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
                      <h2 className="text-lg font-semibold text-gray-900">Machinery Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                  </Section>

                  {/* Machinery Forms */}
                  <Section
                    id="machinery"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <MachineryDetailForm />
                  </Section>
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

export default CreateMachineryPage;

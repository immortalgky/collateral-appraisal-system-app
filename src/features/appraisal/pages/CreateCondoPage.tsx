import { useEffect, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import CondoDetailForm from '../forms/CondoDetailForm';
import { useCreateCondoProperty, useGetCondoPropertyById, useUpdateCondoProperty } from '../api';
import { createCondoForm, createCondoFormDefault, type createCondoFormType } from '../schemas/form';
import { mapCondoPropertyResponseToForm } from '../utils/mappers';
import toast from 'react-hot-toast';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';

const CreateCondoPage = () => {
  const navigate = useNavigate();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  const methods = useForm<createCondoFormType>({
    defaultValues: createCondoFormDefault,
    resolver: zodResolver(createCondoForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  const { data: propertyData, isLoading } = useGetCondoPropertyById(appraisalId, propertyId);

  useEffect(() => {
    if (isEditMode && propertyData) {
      const formValues = mapCondoPropertyResponseToForm(propertyData);
      reset(formValues);
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createCondoProperties, isPending: isCreating } = useCreateCondoProperty();
  const { mutate: updateCondoProperties, isPending: isUpdating } = useUpdateCondoProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createCondoFormType> = data => {
    setSaveAction('submit');
    if (isEditMode && propertyId) {
      updateCondoProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data,
        },
        {
          onSuccess: () => {
            toast.success('Property condominium updated successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createCondoProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Property condominium created successfully');
            setSaveAction(null);
            navigate(`/appraisal/${appraisalId}/property/condo/${response.id}`);
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
      updateCondoProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data,
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
      createCondoProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.id) {
              navigate(`/appraisal/${appraisalId}/property/condo/${response.id}`);
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
            { label: 'Photos', id: 'photos', icon: 'images' },
            { label: 'Condo', id: 'properties-section', icon: 'building' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createCondoForm}>
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

                  {/* Condo Information Header */}
                  <Section id="properties-section" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center">
                        <Icon name="building" style="solid" className="w-5 h-5 text-violet-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Condo Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                  </Section>

                  {/* Condo Form */}
                  <Section
                    id="condo-info"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <CondoDetailForm />
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

export default CreateCondoPage;

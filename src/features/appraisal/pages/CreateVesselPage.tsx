import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { PropertyFormShell } from '../components/PropertyFormShell';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createVesselForm,
  createVesselFormDefault,
  type createVesselFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { allVesselFields } from '../configs/fields';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import Icon from '@/shared/components/Icon';
import { FormProvider } from '@/shared/components/form/FormProvider';
import { UserFormLayoutProvider } from '@/shared/components/form';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import Section from '@/shared/components/sections/Section';
import CancelButton from '@/shared/components/buttons/CancelButton';
import { useCreateVesselProperty, useGetVesselPropertyById, useUpdateVesselProperty } from '../api';
import { mapVesselPropertyResponseToForm } from '../utils/mappers';
import VesselDetailForm from '../forms/VesselDetailForm';

const CreateVesselPage = () => {
  const { t } = useTranslation('appraisal');
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  const { data: propertyData, isLoading } = useGetVesselPropertyById(appraisalId ?? '', propertyId);

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return mapVesselPropertyResponseToForm(propertyData);
    }
    return createVesselFormDefault;
  }, [isEditMode, propertyData]);
  const methods = useForm<createVesselFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createVesselForm),
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
      reset(mapVesselPropertyResponseToForm(propertyData));
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createVesselProperties, isPending: isCreating } = useCreateVesselProperty();
  const { mutate: updateVesselProperties, isPending: isUpdating } = useUpdateVesselProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createVesselFormType> = data => {
    setSaveAction('submit');

    if (isEditMode && propertyId) {
      updateVesselProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.propertyVesselUpdated'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createVesselProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success(t('toasts.propertyVesselCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/vessel/${response.propertyId}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to create property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();

    if (isEditMode && propertyId) {
      updateVesselProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createVesselProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/vessel/${response.propertyId}`);
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
        <Icon
          name="spinner"
          style="solid"
          className="w-8 h-8 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <UserFormLayoutProvider>
        <FormProvider methods={methods} schema={createVesselForm} fields={allVesselFields}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
            {/* Scrollable Form Content */}
            <PropertyFormShell
              appraisalId={appraisalId}
              propertyId={propertyId}
              typeCode="VES"
              photoSectionRef={photoSectionRef}
              tabs={[{ id: 'vessel', label: t('createPage.navVessel') }]}
              activeTab="vessel"
            >
              <div className="flex-auto flex flex-col gap-6 min-w-0">
                {/* Vessel Forms */}
                <Section
                  id="vessel-section"
                  anchor
                  className="flex flex-col gap-6 min-w-0 overflow-hidden"
                >
                  <VesselDetailForm />
                </Section>
              </div>
            </PropertyFormShell>

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
                    {t('createPage.saveDraft')}
                  </Button>
                  <Button
                    type="submit"
                    isLoading={isPending && saveAction === 'submit'}
                    disabled={isPending}
                  >
                    <Icon name="check" style="solid" className="size-4 mr-2" />
                    {t('createPage.save')}
                  </Button>
                </ActionBar.Right>
              )}
            </ActionBar>

            <UnsavedChangesDialog blocker={blocker} />
          </form>
        </FormProvider>
      </UserFormLayoutProvider>
    </div>
  );
};

export default CreateVesselPage;

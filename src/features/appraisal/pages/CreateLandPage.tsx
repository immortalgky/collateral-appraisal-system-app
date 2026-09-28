import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import TitleDeedForm from '../forms/TitleDeedForm';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  useCreateLandProperty,
  useGetLandPropertyById,
  useUpdateLandProperty,
} from '../api/property';
import LandDetailForm from '../forms/LandDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import { createLandForm, createLandFormDefault, type createLandFormType } from '../schemas/form';
import { mapLandPropertyResponseToForm } from '../utils/mappers';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { PropertyEditorHeader } from '../components/PropertyEditorHeader';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';

const CreateLandPage = () => {
  const isReadOnly = usePageReadOnly();
  const { t } = useTranslation('appraisal');
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  const { data: propertyData, isLoading } = useGetLandPropertyById(appraisalId ?? '', propertyId);

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return {
        ...mapLandPropertyResponseToForm(propertyData),
        isRentedOut: (propertyData as any).isRentedOut ?? false,
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      };
    }
    return createLandFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLandFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLandForm),
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
      reset({
        ...createLandFormDefault,
        ...mapLandPropertyResponseToForm(propertyData),
        isRentedOut: (propertyData as any).isRentedOut ?? false,
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      } as any);
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createLandProperties, isPending: isCreating } = useCreateLandProperty();
  const { mutate: updateLandProperties, isPending: isUpdating } = useUpdateLandProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Conditional tabs driven by isRentedOut flag
  const isRentedOut = methods.watch('isRentedOut');
  const [activeTab, setActiveTab] = useState<'land' | 'lease-agreement' | 'rental-info'>('land');

  // The header's tabs; lease and rental exist only while the land is rented out.
  const editorTabs = [
    { id: 'land', label: t('createPage.navLand') },
    ...(isRentedOut
      ? [
          { id: 'lease-agreement', label: t('createPage.navLeaseAgreement') },
          { id: 'rental-info', label: t('createPage.navRentalInfo') },
        ]
      : []),
  ];

  // Reset to land tab when isRentedOut is turned off
  useEffect(() => {
    if (!isRentedOut && activeTab !== 'land') {
      setActiveTab('land');
    }
  }, [isRentedOut, activeTab]);

  const onSubmit: SubmitHandler<createLandFormType> = data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data as any;
    const payload = { ...rest, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateLandProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: payload as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.propertyLandUpdated'));
            setSaveAction(null);
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
          appraisalId: appraisalId!,
          groupId,
          data: payload as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success(t('toasts.propertyLandCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/land/${response.propertyId}`);
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
    const { leaseAgreement, rentalInfo, ...rest } = getValues() as any;
    const payload = { ...rest, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateLandProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: payload as any,
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
      createLandProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: payload as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/land/${response.propertyId}`);
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
      <FormProvider methods={methods} schema={createLandForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="cas-form-grid flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <PropertyEditorHeader
              appraisalId={appraisalId}
              propertyId={propertyId}
              typeCode="L"
              photoSectionRef={photoSectionRef}
              tabs={editorTabs}
              activeTab={activeTab}
              onTabChange={id => setActiveTab(id as typeof activeTab)}
            />
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

                  {/* Lease Agreement Tab Content */}
                  {isRentedOut && (
                    <div
                      id="lease-agreement-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'lease-agreement' ? 'hidden' : ''}`}
                    >
                      <Section anchor className="min-w-0 overflow-hidden">
                        <LeaseAgreementForm namePrefix="leaseAgreement" />
                      </Section>
                    </div>
                  )}

                  {/* Rental Info Tab Content */}
                  {isRentedOut && (
                    <div
                      id="rental-info-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'rental-info' ? 'hidden' : ''}`}
                    >
                      <Section anchor className="min-w-0 overflow-hidden">
                        <RentalInfoForm namePrefix="rentalInfo" />
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
    </div>
  );
};

export default CreateLandPage;

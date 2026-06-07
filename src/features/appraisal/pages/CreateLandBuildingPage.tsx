import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider, FormReadOnlyContext } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useBasePath,
  useAppraisalId,
  useIsCiAppraisal,
} from '@/features/appraisal/context/AppraisalContext';

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
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import {
  createLandAndBuildingForm,
  createLandAndBuildingFormDefault,
  type createLandAndBuildingFormType,
} from '../schemas/form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
} from '../utils/mappers';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';
import { usePageReadOnly, PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { ConstructionInspectionTab } from '../components/tabs/ConstructionInspectionTab';

const CreateLandBuildingPage = () => {
  const { t } = useTranslation('appraisal');
  const isReadOnly = usePageReadOnly();
  const isCiAppraisal = useIsCiAppraisal();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const isEditMode = Boolean(propertyId);

  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const { data: propertyData, isLoading } = useGetLandAndBuildingPropertyById(
    appraisalId!,
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return {
        ...mapLandAndBuildingPropertyResponseToForm(propertyData),
        isRentedOut: (propertyData as any).isRentedOut ?? false,
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      };
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
      reset({
        ...createLandAndBuildingFormDefault,
        ...mapLandAndBuildingPropertyResponseToForm(propertyData),
        isRentedOut: (propertyData as any).isRentedOut ?? false,
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      } as any);
    }
  }, [isEditMode, propertyData, reset]);

  const { mutate: createLandAndBuildingProperties, isPending: isCreating } =
    useCreateLandAndBuildingProperty();
  const { mutate: updateLandAndBuildingProperties, isPending: isUpdating } =
    useUpdateLandAndBuildingProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createLandAndBuildingFormType> = data => {
    setSaveAction('submit');
    const payload = mapLandAndBuildingFormDataToApiPayload(data as any);

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
            toast.success(t('toasts.propertyLandBuildingUpdated'));
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
            toast.success(t('toasts.propertyLandBuildingCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/land-building/${response.propertyId}`);
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
    const payload = mapLandAndBuildingFormDataToApiPayload(data as any);

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
      createLandAndBuildingProperties(
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
              navigate(`${basePath}/property/land-building/${response.propertyId}`);
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

  // Tab selection state (Land, Building, Construction, or rented-out tabs)
  const isUnderConstruction = methods.watch('isUnderConstruction');
  const isRentedOut = methods.watch('isRentedOut');
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'construction' ? 'construction' : 'land';
  const [activeTab, setActiveTab] = useState<
    'land' | 'building' | 'construction' | 'lease-agreement' | 'rental-info'
  >(initialTab);

  // Reset to default tab if construction tab is active but property is not under construction
  useEffect(() => {
    if (activeTab === 'construction' && !isUnderConstruction && !isCiAppraisal) {
      setActiveTab('land');
    }
  }, [isUnderConstruction, activeTab, isCiAppraisal]);

  // Reset to land tab when isRentedOut is turned off and a rental tab is active
  useEffect(() => {
    if (!isRentedOut && (activeTab === 'lease-agreement' || activeTab === 'rental-info')) {
      setActiveTab('land');
    }
  }, [isRentedOut, activeTab]);

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
            { label: t('createPage.navPhotos'), id: 'photos', icon: 'images' },
            {
              label: t('createPage.navLand'),
              id: 'land-section',
              icon: 'mountain-sun',
              onClick: () => setActiveTab('land'),
            },
            {
              label: t('createPage.navBuilding'),
              id: 'building-section',
              icon: 'building',
              onClick: () => setActiveTab('building'),
            },
            ...(isUnderConstruction || isCiAppraisal
              ? [
                  {
                    label: t('createPage.navConstructionInspection'),
                    id: 'construction-section',
                    icon: 'helmet-safety',
                    onClick: () => setActiveTab('construction'),
                  },
                ]
              : []),
            ...(isRentedOut
              ? [
                  {
                    label: t('createPage.navLeaseAgreement'),
                    id: 'lease-agreement-section',
                    icon: 'file-contract',
                    onClick: () => setActiveTab('lease-agreement'),
                  },
                  {
                    label: t('createPage.navRentalInfo'),
                    id: 'rental-info-section',
                    icon: 'calendar-days',
                    onClick: () => setActiveTab('rental-info'),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <PageReadOnlyContext.Provider value={isReadOnly || isCiAppraisal}>
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
                    {/* Photos Section — re-override to status-only readonly so CI appraisals can still manage photos */}
                    <PageReadOnlyContext.Provider value={isReadOnly}>
                      <FormReadOnlyContext.Provider value={isReadOnly}>
                        <Section id="photos" anchor className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Icon
                                name="images"
                                style="solid"
                                className="w-5 h-5 text-indigo-600"
                              />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('createPage.photosSection')}</h2>
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
                      </FormReadOnlyContext.Provider>
                    </PageReadOnlyContext.Provider>

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
                        <h2 className="text-lg font-semibold text-gray-900">{t('createPage.landSection')}</h2>
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
                        <h2 className="text-lg font-semibold text-gray-900">
                          {t('createPage.buildingSection')}
                        </h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="building-info" anchor className="flex flex-col gap-6">
                        <BuildingDetailForm />
                      </Section>
                    </div>

                    {/* Construction Inspection Tab Content */}
                    {(isUnderConstruction || isCiAppraisal) && (
                      <div
                        id="construction-section"
                        className={`flex flex-col gap-6 ${activeTab !== 'construction' ? 'hidden' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Icon
                              name="helmet-safety"
                              style="solid"
                              className="w-5 h-5 text-teal-600"
                            />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            {t('createPage.constructionSection')}
                          </h2>
                        </div>
                        <div className="h-px bg-gray-200" />
                        <Section id="construction-info" anchor className="flex flex-col gap-6">
                          {/* Re-override FormReadOnlyContext so NumberInput fields inside CI tab stay editable */}
                          <FormReadOnlyContext.Provider value={isReadOnly}>
                            <ConstructionInspectionTab
                              readOnly={isReadOnly}
                              ciMode={isCiAppraisal}
                            />
                          </FormReadOnlyContext.Provider>
                        </Section>
                      </div>
                    )}

                    {/* Lease Agreement Tab Content */}
                    {isRentedOut && (
                      <div
                        id="lease-agreement-section"
                        className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'lease-agreement' ? 'hidden' : ''}`}
                      >
                        <Section anchor className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                              <Icon
                                name="file-contract"
                                style="solid"
                                className="w-5 h-5 text-purple-600"
                              />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('createPage.leaseAgreementSection')}</h2>
                          </div>
                          <div className="h-px bg-gray-200 mb-6" />
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
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                              <Icon
                                name="calendar-days"
                                style="solid"
                                className="w-5 h-5 text-teal-600"
                              />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">{t('createPage.rentalInfoSection')}</h2>
                          </div>
                          <div className="h-px bg-gray-200 mb-6" />
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
      </PageReadOnlyContext.Provider>
    </div>
  );
};

export default CreateLandBuildingPage;

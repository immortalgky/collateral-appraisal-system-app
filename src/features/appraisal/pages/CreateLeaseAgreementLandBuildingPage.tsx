import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useAppraisalId,
  useBasePath,
  useIsCiAppraisal,
} from '@/features/appraisal/context/AppraisalContext';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import TitleDeedForm from '../forms/TitleDeedForm';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useGetLeaseAgreementLandAndBuildingPropertyById } from '../api/property';
import LandDetailForm from '../forms/LandDetailForm';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import {
  createLeaseAgreementLandAndBuildingForm,
  createLeaseAgreementLandAndBuildingFormDefault,
  type createLeaseAgreementLandAndBuildingFormType,
} from '../schemas/form';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  mapLandAndBuildingFormDataToApiPayload,
  mapLandAndBuildingPropertyResponseToForm,
} from '../utils/mappers';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { PropertyEditorHeader } from '../components/PropertyEditorHeader';
import { usePageReadOnly, PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { ConstructionEditorSection } from '../components/construction/ConstructionEditorSection';
import { useConstructionTab } from '../hooks/useConstructionTab';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys } from '../api/propertyGroup';

// ─── Inline create/update mutations ──────────────────────────────

const useCreateLeaseAgreementLandBuildingProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: any;
    }): Promise<any> => {
      const url = `/appraisals/${params.appraisalId}/lease-agreement-land-and-building-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
    },
  });
};

const useUpdateLeaseAgreementLandBuildingProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: any;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/lease-agreement-land-building-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      // The page's own query, so the form is reset from what the server saved (as lease-condo does).
      queryClient.invalidateQueries({
        queryKey: [
          'appraisals',
          variables.appraisalId,
          'lease-agreement-land-and-building-properties',
          variables.propertyId,
        ],
      });
    },
  });
};

// ─── Page Component ───────────────────────────────────────────────

const CreateLeaseAgreementLandBuildingPage = () => {
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

  // ─── Land + Building detail form ─────────────────────────────
  const { data: propertyData, isLoading } = useGetLeaseAgreementLandAndBuildingPropertyById(
    appraisalId ?? '',
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData)
      return {
        ...mapLandAndBuildingPropertyResponseToForm(propertyData),
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      };
    return createLeaseAgreementLandAndBuildingFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLeaseAgreementLandAndBuildingFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLeaseAgreementLandAndBuildingForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (!isEditMode || !propertyData) return;
    const base = mapLandAndBuildingPropertyResponseToForm(propertyData);
    reset({
      ...createLeaseAgreementLandAndBuildingFormDefault,
      ...base,
      leaseAgreement: (propertyData as any).leaseAgreement ?? null,
      rentalInfo: (propertyData as any).rentalInfo ?? null,
    } as any);
  }, [isEditMode, propertyData]);

  const { mutate: createProperty, isPending: isCreating } =
    useCreateLeaseAgreementLandBuildingProperty();
  const { mutate: updateProperty, isPending: isUpdating } =
    useUpdateLeaseAgreementLandBuildingProperty();
  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // ─── Tab selection (Land / Building / Construction) ───────────
  const isUnderConstruction = methods.watch('isUnderConstruction');
  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'construction' ? 'construction' : 'land';
  const [activeTab, setActiveTab] = useState<
    'land' | 'building' | 'construction' | 'lease-agreement' | 'rental-info'
  >(initialTab);

  const { shownTab, hasTab: hasConstructionTab } = useConstructionTab({
    methods,
    isUnderConstruction,
    activeTab,
    setActiveTab,
    fallbackTab: 'land',
    isCreateMode: !isEditMode,
    isCiAppraisal,
  });

  const hasDirtyFields = methods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLeaseAgreementLandAndBuildingFormType> = async data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const basePayload = mapLandAndBuildingFormDataToApiPayload(rest as any);
    const payload = { ...basePayload, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.leaseAgreementLandBuildingUpdated'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createProperty(
        { appraisalId: appraisalId!, groupId, data: payload as any },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            toast.success(t('toasts.leaseAgreementLandBuildingCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/lease-land-building/${response.propertyId}`);
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
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const basePayload = mapLandAndBuildingFormDataToApiPayload(rest as any);
    const payload = { ...basePayload, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
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
      createProperty(
        { appraisalId: appraisalId!, groupId, data: payload as any },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/lease-land-building/${response.propertyId}`);
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

  const { isOpen, onToggle } = useDisclosure();

  if (isLoading || (isEditMode && !propertyData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // The header's tabs; construction appears only when it applies.
  const editorTabs = [
    { id: 'land', label: t('createPage.navLand') },
    { id: 'building', label: t('createPage.navBuilding') },
    ...(hasConstructionTab
      ? [{ id: 'construction', label: t('createPage.navConstructionInspection') }]
      : []),
    { id: 'lease-agreement', label: t('createPage.navLeaseAgreement') },
    { id: 'rental-info', label: t('createPage.navRentalInfo') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageReadOnlyContext.Provider value={isReadOnly}>
        <FormProvider methods={methods} schema={createLeaseAgreementLandAndBuildingForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="cas-form-grid flex-1 min-h-0 flex flex-col">
            {/* Scrollable Form Content */}
            <div
              id="form-scroll-container"
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
            >
              <PropertyEditorHeader
                appraisalId={appraisalId}
                propertyId={propertyId}
                typeCode="LS"
                photoSectionRef={photoSectionRef}
                tabs={editorTabs}
                activeTab={shownTab}
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
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${shownTab !== 'land' ? 'hidden' : ''}`}
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
                        <LandDetailForm propertyType="LS" />
                      </Section>
                    </div>

                    {/* Building Tab Content */}
                    <div
                      id="building-section"
                      className={`flex flex-col gap-6 ${shownTab !== 'building' ? 'hidden' : ''}`}
                    >
                      <Section id="building-info" anchor className="flex flex-col gap-6">
                        <BuildingDetailForm propertyType="LS" />
                      </Section>
                    </div>

                    {/* Construction Inspection Tab Content */}
                    <ConstructionEditorSection
                      key={propertyId}
                      shownTab={shownTab}
                      underConstruction={hasConstructionTab}
                      readOnly={isReadOnly}
                      ciMode={isCiAppraisal}
                      condo={false}
                    />

                    {/* Lease Agreement Tab Content */}
                    <div
                      id="lease-agreement-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${shownTab !== 'lease-agreement' ? 'hidden' : ''}`}
                    >
                      <Section anchor className="min-w-0 overflow-hidden">
                        <LeaseAgreementForm namePrefix="leaseAgreement" />
                      </Section>
                    </div>

                    {/* Rental Info Tab Content */}
                    <div
                      id="rental-info-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${shownTab !== 'rental-info' ? 'hidden' : ''}`}
                    >
                      <Section anchor className="min-w-0 overflow-hidden">
                        <RentalInfoForm namePrefix="rentalInfo" />
                      </Section>
                    </div>
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
      </PageReadOnlyContext.Provider>
    </div>
  );
};

export default CreateLeaseAgreementLandBuildingPage;

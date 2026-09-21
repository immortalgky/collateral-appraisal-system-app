import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys, useGetLeaseAgreementCondoPropertyById } from '../api';
import { PageReadOnlyContext, usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppraisalId, useBasePath, useIsCiAppraisal } from '../context/AppraisalContext';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { PropertyEditorHeader } from '../components/PropertyEditorHeader';
import { useEffect, useMemo, useRef, useState } from 'react';
import { mapCondoFormDataToApiPayload, mapCondoPropertyResponseToForm } from '../utils/mappers';
import {
  createLeaseAgreementCondoForm,
  createLeaseAgreementCondoFormDefault,
  type createLeaseAgreementCondoFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import Icon from '@/shared/components/Icon';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { FormProvider } from '@/shared/components/form/FormProvider';
import Section from '@/shared/components/sections/Section';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import CondoDetailForm from '../forms/CondoDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { Button } from '@/shared/components';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { ConstructionInspectionTab } from '../components/tabs/ConstructionInspectionTab';

// ─── Inline create/update mutations ──────────────────────────────

const useCreateLeaseAgreementCondoProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: any;
    }): Promise<any> => {
      const url = `/appraisals/${params.appraisalId}/lease-agreement-condo-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
    },
  });
};

const useUpdateLeaseAgreementCondoProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: any;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/lease-agreement-condo-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
      queryClient.invalidateQueries({
        queryKey: [
          'appraisals',
          variables.appraisalId,
          'lease-agreement-condo-properties',
          variables.propertyId,
        ],
      });
    },
  });
};

// ─── Page Component ───────────────────────────────────────────────

const CreateLeaseAgreementCondoPage = () => {
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

  // ─── Condo detail form ─────────────────────────────
  const { data: propertyData, isLoading } = useGetLeaseAgreementCondoPropertyById(
    appraisalId ?? '',
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData)
      return {
        ...mapCondoPropertyResponseToForm(propertyData),
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      };
    return createLeaseAgreementCondoFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLeaseAgreementCondoFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLeaseAgreementCondoForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (!isEditMode || !propertyData) return;
    const base = mapCondoPropertyResponseToForm(propertyData);
    reset({
      ...createLeaseAgreementCondoFormDefault,
      ...base,
      leaseAgreement: (propertyData as any).leaseAgreement ?? null,
      rentalInfo: (propertyData as any).rentalInfo ?? null,
    } as any);
  }, [isEditMode, propertyData]);

  const { mutate: createProperty, isPending: isCreating } = useCreateLeaseAgreementCondoProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateLeaseAgreementCondoProperty();
  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // ─── Construction tab ─────────────────────────────────────────
  const isUnderConstruction = methods.watch('isUnderConstruction');
  const tabParam = searchParams.get('tab');
  const initialCondoTab = tabParam === 'construction' ? 'construction' : 'condo';
  const [activeTab, setActiveTab] = useState<
    'condo' | 'construction' | 'lease-agreement' | 'rental-info'
  >(initialCondoTab);

  useEffect(() => {
    if (activeTab === 'construction' && !isUnderConstruction && !isCiAppraisal) {
      setActiveTab('condo');
    }
  }, [isUnderConstruction, activeTab, isCiAppraisal]);

  const hasDirtyFields = methods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLeaseAgreementCondoFormType> = async data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const basePayload = mapCondoFormDataToApiPayload(rest as any);
    const payload = { ...basePayload, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.leaseAgreementCondoUpdated'));
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
            toast.success(t('toasts.leaseAgreementCondoCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/lease-condo/${response.propertyId}`);
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
    const basePayload = mapCondoFormDataToApiPayload(rest as any);
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
              navigate(`${basePath}/property/lease-condo/${response.propertyId}`);
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
    { id: 'condo', label: t('createPage.navCondo') },
    ...(isUnderConstruction || isCiAppraisal
      ? [{ id: 'construction', label: t('createPage.navConstructionInspection') }]
      : []),
    { id: 'lease-agreement', label: t('createPage.navLeaseAgreement') },
    { id: 'rental-info', label: t('createPage.navRentalInfo') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <PageReadOnlyContext.Provider value={isReadOnly}>
        <FormProvider methods={methods} schema={createLeaseAgreementCondoForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="cas-form-grid flex-1 min-h-0 flex flex-col">
            {/* Scrollable Form Content */}
            <div
              id="form-scroll-container"
              className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
            >
              <PropertyEditorHeader
                appraisalId={appraisalId}
                propertyId={propertyId}
                typeCode="LSU"
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
                    {/* Condo Tab Content */}
                    <div
                      id="condo-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'condo' ? 'hidden' : ''}`}
                    >
                      <Section
                        id="condo-info"
                        anchor
                        className="flex flex-col gap-6 min-w-0 overflow-hidden"
                      >
                        <CondoDetailForm />
                      </Section>
                    </div>

                    {/* Construction Inspection Tab Content */}
                    {(isUnderConstruction || isCiAppraisal) && (
                      <div
                        id="construction-section"
                        className={`flex flex-col gap-6 ${activeTab !== 'construction' ? 'hidden' : ''}`}
                      >
                        <Section id="construction-info" anchor className="flex flex-col gap-6">
                          <ConstructionInspectionTab
                            readOnly={isReadOnly}
                            ciMode={isCiAppraisal}
                          />
                        </Section>
                      </div>
                    )}

                    {/* Lease Agreement Tab Content */}
                    <div
                      id="lease-agreement-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'lease-agreement' ? 'hidden' : ''}`}
                    >
                      <Section anchor className="min-w-0 overflow-hidden">
                        <LeaseAgreementForm namePrefix="leaseAgreement" />
                      </Section>
                    </div>

                    {/* Rental Info Tab Content */}
                    <div
                      id="rental-info-section"
                      className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'rental-info' ? 'hidden' : ''}`}
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

export default CreateLeaseAgreementCondoPage;

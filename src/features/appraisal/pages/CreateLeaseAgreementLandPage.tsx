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
import { useGetLeaseAgreementLandPropertyById } from '../api/property';
import LandDetailForm from '../forms/LandDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import {
  createLeaseAgreementLandForm,
  createLeaseAgreementLandFormDefault,
  type createLeaseAgreementLandFormType,
} from '../schemas/form';
import { mapLandPropertyResponseToForm } from '../utils/mappers';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import { PropertyEditorHeader } from '../components/PropertyEditorHeader';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys } from '../api/propertyGroup';

// ─── Inline create/update mutations ──────────────────────────────

const useCreateLeaseAgreementLandProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      groupId?: string;
      data: any;
    }): Promise<any> => {
      const url = `/appraisals/${params.appraisalId}/lease-agreement-land-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
    },
  });
};

const useUpdateLeaseAgreementLandProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      appraisalId: string;
      propertyId: string;
      data: any;
    }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/lease-agreement-land-detail`,
        params.data,
      );
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
      queryClient.invalidateQueries({
        queryKey: propertyGroupKeys.propertyDetail(variables.appraisalId, variables.propertyId),
      });
    },
  });
};

// ─── Page Component ───────────────────────────────────────────────

const CreateLeaseAgreementLandPage = () => {
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

  // ─── Land detail form ─────────────────────────────────────────
  const { data: propertyData, isLoading } = useGetLeaseAgreementLandPropertyById(
    appraisalId ?? '',
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData)
      return {
        ...mapLandPropertyResponseToForm(propertyData),
        leaseAgreement: (propertyData as any).leaseAgreement ?? null,
        rentalInfo: (propertyData as any).rentalInfo ?? null,
      };
    return createLeaseAgreementLandFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLeaseAgreementLandFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLeaseAgreementLandForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (!isEditMode || !propertyData) return;
    const base = mapLandPropertyResponseToForm(propertyData);
    reset({
      ...createLeaseAgreementLandFormDefault,
      ...base,
      leaseAgreement: (propertyData as any).leaseAgreement ?? null,
      rentalInfo: (propertyData as any).rentalInfo ?? null,
    } as any);
  }, [isEditMode, propertyData]);

  const { mutate: createProperty, isPending: isCreating } = useCreateLeaseAgreementLandProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateLeaseAgreementLandProperty();
  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const hasDirtyFields = methods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLeaseAgreementLandFormType> = async data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const payload = { ...rest, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.leaseAgreementLandUpdated'));
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
            toast.success(t('toasts.leaseAgreementLandCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/lease-land/${response.propertyId}`);
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
    const { leaseAgreement, rentalInfo, ...rest } = getValues();
    const payload = { ...rest, leaseAgreement, rentalInfo };

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
              navigate(`${basePath}/property/lease-land/${response.propertyId}`);
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

  const [activeTab, setActiveTab] = useState<'land' | 'lease-agreement' | 'rental-info'>('land');

  const { isOpen, onToggle } = useDisclosure();

  if (isLoading || (isEditMode && !propertyData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // The header's tabs.
  const editorTabs = [
    { id: 'land', label: t('createPage.navLand') },
    { id: 'lease-agreement', label: t('createPage.navLeaseAgreement') },
    { id: 'rental-info', label: t('createPage.navRentalInfo') },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={createLeaseAgreementLandForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="cas-form-grid flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <PropertyEditorHeader
              appraisalId={appraisalId}
              propertyId={propertyId}
              typeCode="LSL"
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
    </div>
  );
};

export default CreateLeaseAgreementLandPage;

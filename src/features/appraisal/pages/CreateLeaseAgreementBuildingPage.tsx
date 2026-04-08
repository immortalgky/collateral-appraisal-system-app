import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useBasePath, useAppraisalId } from '@/features/appraisal/context/AppraisalContext';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  useGetLeaseAgreementBuildingPropertyById,
} from '../api/property';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import {
  createLeaseAgreementBuildingForm,
  createLeaseAgreementBuildingFormDefault,
  type createLeaseAgreementBuildingFormType,
} from '../schemas/form';
import {
  mapBuildingPropertyResponseToForm,
  mapBuildingFormDataToApiPayload,
} from '../utils/mappers';
import toast from 'react-hot-toast';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { ConstructionInspectionTab } from '../components/tabs/ConstructionInspectionTab';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys } from '../api/propertyGroup';

// ─── Inline create/update mutations ──────────────────────────────

const useCreateLeaseAgreementBuildingProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { appraisalId: string; groupId?: string; data: any }): Promise<any> => {
      const url = `/appraisals/${params.appraisalId}/lease-agreement-building-properties${params.groupId ? `?groupId=${params.groupId}` : ''}`;
      const { data } = await axios.post(url, params.data);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: propertyGroupKeys.all(variables.appraisalId) });
    },
  });
};

const useUpdateLeaseAgreementBuildingProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { appraisalId: string; propertyId: string; data: any }): Promise<any> => {
      const { data } = await axios.put(
        `/appraisals/${params.appraisalId}/properties/${params.propertyId}/lease-agreement-building-detail`,
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

const CreateLeaseAgreementBuildingPage = () => {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  // ─── Building detail form ─────────────────────────────────────
  const { data: propertyData, isLoading } = useGetLeaseAgreementBuildingPropertyById(appraisalId, propertyId);

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) return {
      ...mapBuildingPropertyResponseToForm(propertyData),
      leaseAgreement: (propertyData as any).leaseAgreement ?? null,
      rentalInfo: (propertyData as any).rentalInfo ?? null,
    };
    return createLeaseAgreementBuildingFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLeaseAgreementBuildingFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLeaseAgreementBuildingForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (!isEditMode || !propertyData) return;
    const base = mapBuildingPropertyResponseToForm(propertyData);
    reset({
      ...createLeaseAgreementBuildingFormDefault,
      ...base,
      leaseAgreement: (propertyData as any).leaseAgreement ?? null,
      rentalInfo: (propertyData as any).rentalInfo ?? null,
    } as any);
  }, [isEditMode, propertyData]);

  const { mutate: createProperty, isPending: isCreating } = useCreateLeaseAgreementBuildingProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateLeaseAgreementBuildingProperty();
  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // ─── Construction tab ─────────────────────────────────────────
  const isUnderConstruction = methods.watch('isUnderConstruction');
  const tabParam = searchParams.get('tab');
  const initialBuildingTab = tabParam === 'construction' ? 'construction' : 'building';
  const [activeTab, setActiveTab] = useState<'building' | 'construction' | 'lease-agreement' | 'rental-info'>(initialBuildingTab);

  useEffect(() => {
    if (activeTab === 'construction' && !isUnderConstruction) {
      setActiveTab('building');
    }
  }, [isUnderConstruction, activeTab]);

  const hasDirtyFields = methods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLeaseAgreementBuildingFormType> = async data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const basePayload = mapBuildingFormDataToApiPayload(rest as any);
    const payload = { ...basePayload, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success('Lease agreement building updated successfully');
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
        { appraisalId: appraisalId!, groupId, data: payload },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            toast.success('Lease agreement building created successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/lease-building/${response.propertyId}`);
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
    const basePayload = mapBuildingFormDataToApiPayload(rest as any);
    const payload = { ...basePayload, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload },
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
      createProperty(
        { appraisalId: appraisalId!, groupId, data: payload },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/lease-building/${response.propertyId}`);
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Photos', id: 'photos', icon: 'images' },
            {
              label: 'Building',
              id: 'properties-section',
              icon: 'building',
              onClick: () => setActiveTab('building'),
            },
            ...(isUnderConstruction
              ? [
                  {
                    label: 'Construction Inspection',
                    id: 'construction-section',
                    icon: 'helmet-safety',
                    onClick: () => setActiveTab('construction'),
                  },
                ]
              : []),
            { label: 'Lease Agreement', id: 'lease-agreement-section', icon: 'file-contract', onClick: () => setActiveTab('lease-agreement') },
            { label: 'Rental Info', id: 'rental-info-section', icon: 'calendar-days', onClick: () => setActiveTab('rental-info') },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createLeaseAgreementBuildingForm}>
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

                  {/* Building Tab Content */}
                  <div
                    id="properties-section"
                    className={`flex flex-col gap-6 ${activeTab !== 'building' ? 'hidden' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Icon name="building" style="solid" className="w-5 h-5 text-blue-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Building Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                    <Section id="building-info" anchor className="flex flex-col gap-6">
                      <BuildingDetailForm />
                    </Section>
                  </div>

                  {/* Construction Inspection Tab Content */}
                  {isUnderConstruction && (
                    <div
                      id="construction-section"
                      className={`flex flex-col gap-6 ${activeTab !== 'construction' ? 'hidden' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Icon name="helmet-safety" style="solid" className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Construction Inspection
                        </h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="construction-info" anchor className="flex flex-col gap-6">
                        <ConstructionInspectionTab readOnly={isReadOnly} />
                      </Section>
                    </div>
                  )}

                  {/* Lease Agreement Tab Content */}
                  <div
                    id="lease-agreement-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'lease-agreement' ? 'hidden' : ''}`}
                  >
                    <Section anchor className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Icon name="file-contract" style="solid" className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Lease Agreement</h2>
                      </div>
                      <div className="h-px bg-gray-200 mb-6" />
                      <LeaseAgreementForm namePrefix="leaseAgreement" />
                    </Section>
                  </div>

                  {/* Rental Info Tab Content */}
                  <div
                    id="rental-info-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'rental-info' ? 'hidden' : ''}`}
                  >
                    <Section anchor className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                          <Icon name="calendar-days" style="solid" className="w-5 h-5 text-teal-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Rental Info</h2>
                      </div>
                      <div className="h-px bg-gray-200 mb-6" />
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

export default CreateLeaseAgreementBuildingPage;

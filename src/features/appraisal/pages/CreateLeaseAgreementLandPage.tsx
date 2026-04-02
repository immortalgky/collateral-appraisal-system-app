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
import TitleDeedForm from '../forms/TitleDeedForm';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import {
  useGetLandPropertyById,
  useGetLeaseAgreement,
  useGetRentalInfo,
} from '../api/property';
import LandDetailForm from '../forms/LandDetailForm';
import LeaseAgreementForm from '../forms/LeaseAgreementForm';
import RentalInfoForm from '../forms/RentalInfoForm';
import {
  createLandForm,
  createLandFormDefault,
  type createLandFormType,
  createLeaseAgreementForm,
  type createLeaseAgreementFormType,
  rentalInfoFormSchema,
  type RentalInfoFormType,
} from '../schemas/form';
import { mapLandPropertyResponseToForm } from '../utils/mappers';
import toast from 'react-hot-toast';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys } from '../api/propertyGroup';

// ─── Inline create/update mutations ──────────────────────────────

const useCreateLeaseAgreementLandProperty = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { appraisalId: string; groupId?: string; data: any }): Promise<any> => {
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
    mutationFn: async (params: { appraisalId: string; propertyId: string; data: any }): Promise<any> => {
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
  const { data: propertyData, isLoading } = useGetLandPropertyById(appraisalId, propertyId);

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) return mapLandPropertyResponseToForm(propertyData);
    return createLandFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createLandFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLandForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  useEffect(() => {
    if (isEditMode && propertyData) reset(mapLandPropertyResponseToForm(propertyData));
  }, [isEditMode, propertyData, reset]);

  const { mutate: createProperty, isPending: isCreating } = useCreateLeaseAgreementLandProperty();
  const { mutate: updateProperty, isPending: isUpdating } = useUpdateLeaseAgreementLandProperty();
  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // ─── Lease Agreement form ─────────────────────────────────────
  const { data: leaseAgreementData } = useGetLeaseAgreement(appraisalId, propertyId);

  const leaseAgreementMethods = useForm<createLeaseAgreementFormType>({
    resolver: zodResolver(createLeaseAgreementForm),
  });

  useEffect(() => {
    if (leaseAgreementData) leaseAgreementMethods.reset(leaseAgreementData as any);
  }, [leaseAgreementData, leaseAgreementMethods]);

  // ─── Rental Info form ─────────────────────────────────────────
  const { data: rentalInfoData } = useGetRentalInfo(appraisalId, propertyId);

  const rentalInfoMethods = useForm<RentalInfoFormType>({
    resolver: zodResolver(rentalInfoFormSchema),
  });

  useEffect(() => {
    if (rentalInfoData) rentalInfoMethods.reset(rentalInfoData as any);
  }, [rentalInfoData, rentalInfoMethods]);

  const hasDirtyFields = methods.formState.isDirty || leaseAgreementMethods.formState.isDirty || rentalInfoMethods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLandFormType> = data => {
    setSaveAction('submit');
    const leaseData = leaseAgreementMethods.getValues();
    const rentalData = rentalInfoMethods.getValues();
    const payload = { ...data, leaseAgreement: leaseData, rentalInfo: rentalData };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            leaseAgreementMethods.reset(leaseAgreementMethods.getValues());
            rentalInfoMethods.reset(rentalInfoMethods.getValues());
            toast.success('Lease agreement land updated successfully');
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
            leaseAgreementMethods.reset(leaseAgreementMethods.getValues());
            rentalInfoMethods.reset(rentalInfoMethods.getValues());
            toast.success('Lease agreement land created successfully');
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
    const data = getValues();
    const leaseData = leaseAgreementMethods.getValues();
    const rentalData = rentalInfoMethods.getValues();
    const payload = { ...data, leaseAgreement: leaseData, rentalInfo: rentalData };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            leaseAgreementMethods.reset(leaseAgreementMethods.getValues());
            rentalInfoMethods.reset(rentalInfoMethods.getValues());
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
        { appraisalId: appraisalId!, groupId, data: payload as any },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            leaseAgreementMethods.reset(leaseAgreementMethods.getValues());
            rentalInfoMethods.reset(rentalInfoMethods.getValues());
            toast.success('Draft saved successfully');
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Photos', id: 'photos', icon: 'images' },
            { label: 'Land', id: 'land-section', icon: 'mountain-sun', onClick: () => setActiveTab('land') },
            { label: 'Lease Agreement', id: 'lease-agreement-section', icon: 'file-contract', onClick: () => setActiveTab('lease-agreement') },
            { label: 'Rental Info', id: 'rental-info-section', icon: 'calendar-days', onClick: () => setActiveTab('rental-info') },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createLandForm}>
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

                  {/* Land Tab Content */}
                  <div
                    id="land-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'land' ? 'hidden' : ''}`}
                  >
                    <Section id="properties-section" anchor>
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Icon name="mountain-sun" style="solid" className="w-5 h-5 text-amber-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Land Information</h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                    </Section>
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
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg bg-purple-100 flex items-center justify-center">
                          <Icon name="file-contract" style="solid" className="w-5 h-5 text-purple-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Lease Agreement</h2>
                      </div>
                      <div className="h-px bg-gray-200 mb-6" />
                      <FormProvider methods={leaseAgreementMethods} schema={createLeaseAgreementForm}>
                        <LeaseAgreementForm />
                      </FormProvider>
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
                      <FormProvider methods={rentalInfoMethods} schema={rentalInfoFormSchema}>
                        <RentalInfoForm />
                      </FormProvider>
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

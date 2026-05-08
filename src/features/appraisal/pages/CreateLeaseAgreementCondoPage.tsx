import axios from '@shared/api/axiosInstance';
import { propertyGroupKeys, useGetLeaseAgreementCondoPropertyById } from '../api';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppraisalId, useBasePath } from '../context/AppraisalContext';
import type { PropertyPhotoSectionRef } from '../components/PropertyPhotoSection';
import PropertyPhotoSection from '../components/PropertyPhotoSection';
import { useEffect, useMemo, useRef, useState } from 'react';
import { mapCondoPropertyResponseToForm } from '../utils/mappers';
import {
  createLeaseAgreementCondoForm,
  createLeaseAgreementCondoFormDefault,
  type createLeaseAgreementCondoFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import Icon from '@/shared/components/Icon';
import NavAnchors from '@/shared/components/sections/NavAnchors';
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
  const isReadOnly = usePageReadOnly();
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

  const [activeTab, setActiveTab] = useState<'condo' | 'lease-agreement' | 'rental-info'>('condo');

  const hasDirtyFields = methods.formState.isDirty;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ─── Save handlers ────────────────────────────────────────────

  const onSubmit: SubmitHandler<createLeaseAgreementCondoFormType> = async data => {
    setSaveAction('submit');
    const { leaseAgreement, rentalInfo, ...rest } = data;
    const payload = { ...rest, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success('Lease agreement condo updated successfully');
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
            toast.success('Lease agreement condo created successfully');
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
    const payload = { ...rest, leaseAgreement, rentalInfo };

    if (isEditMode && propertyId) {
      updateProperty(
        { appraisalId: appraisalId!, propertyId, data: payload as any },
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
        { appraisalId: appraisalId!, groupId, data: payload as any },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            reset(getValues());
            toast.success('Draft saved successfully');
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors with Condo/Lease tabs */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Photos', id: 'photos', icon: 'images' },
            {
              label: 'Condo',
              id: 'properties-section',
              icon: 'building',
              onClick: () => setActiveTab('condo'),
            },
            {
              label: 'Lease Agreement',
              id: 'lease-agreement-section',
              icon: 'file-contract',
              onClick: () => setActiveTab('lease-agreement'),
            },
            {
              label: 'Rental Info',
              id: 'rental-info-section',
              icon: 'calendar-days',
              onClick: () => setActiveTab('rental-info'),
            },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createLeaseAgreementCondoForm}>
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

                  {/* Condo Tab Content */}
                  <div
                    id="condo-section"
                    className={`flex flex-col gap-6 min-w-0 max-w-full ${activeTab !== 'condo' ? 'hidden' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Icon
                          name="mountain-sun"
                          style="solid"
                          className="w-5 h-5 text-amber-600"
                        />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Condo Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />

                    <Section
                      id="condo-info"
                      anchor
                      className="flex flex-col gap-6 min-w-0 overflow-hidden"
                    >
                      <CondoDetailForm />
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
                          <Icon
                            name="file-contract"
                            style="solid"
                            className="w-5 h-5 text-purple-600"
                          />
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
                          <Icon
                            name="calendar-days"
                            style="solid"
                            className="w-5 h-5 text-teal-600"
                          />
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

export default CreateLeaseAgreementCondoPage;

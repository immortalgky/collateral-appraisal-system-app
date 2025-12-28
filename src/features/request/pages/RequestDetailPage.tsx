import { useParams, useNavigate } from 'react-router-dom';
import { createRequestForm, type createRequestFormType } from '@features/request/schemas/form';
import { createRequestFormDefault } from '../schemas/defaults';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider } from '@shared/components/form';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useCallback, useRef, useEffect, useState } from 'react';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import { DetailPageSkeleton } from '@/shared/components/Skeleton';
import AddressForm from '../forms/AddressForm';
import Button from '@/shared/components/Button';
import RequestRightMenu from '../components/RequestRightMenu';
import RightMenuPortal from '@/shared/components/RightMenuPortal';
import { useRightMenuPortal } from '@/shared/contexts/RightMenuPortalContext';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import {
  createUploadSession,
  useGetRequestById,
  useUpdateRequest,
  type GetRequestByIdResultType,
} from '../api';
import CancelButton from '@/shared/components/buttons/CancelButton';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import DuplicateButton from '@/shared/components/buttons/DuplicateButton';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import SearchUserModal from '../components/SearchUserModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import type { UserDtoType } from '../schemas/form';

/**
 * Map API response to form values
 */
const mapResponseToFormValues = (response: GetRequestByIdResultType): createRequestFormType => {
  return {
    purpose: response.purpose ?? '',
    channel: response.channel ?? '',
    priority: response.priority ?? 'normal',
    isPma: response.isPma ?? false,
    creator: response.creator ?? null,
    requestor: response.requestor ?? null,
    detail: {
      hasAppraisalBook: response.detail?.hasAppraisalBook ?? false,
      loanDetail: {
        bankingSegment: response.detail?.loanDetail?.bankingSegment ?? '',
        loanApplicationNumber: response.detail?.loanDetail?.loanApplicationNumber ?? '',
        facilityLimit: response.detail?.loanDetail?.facilityLimit ?? 0,
        additionalFacilityLimit: response.detail?.loanDetail?.additionalFacilityLimit ?? 0,
        previousFacilityLimit: response.detail?.loanDetail?.previousFacilityLimit ?? 0,
        totalSellingPrice: response.detail?.loanDetail?.totalSellingPrice ?? 0,
      },
      prevAppraisalId: response.detail?.prevAppraisalId ?? '',
      prevAppraisalValue: null,
      prevAppraisalDate: null,
      address: {
        houseNumber: response.detail?.address?.houseNumber ?? '',
        projectName: response.detail?.address?.projectName ?? '',
        moo: response.detail?.address?.moo ?? '',
        soi: response.detail?.address?.soi ?? '',
        road: response.detail?.address?.road ?? '',
        subDistrict: response.detail?.address?.subDistrict ?? '',
        district: response.detail?.address?.district ?? '',
        province: response.detail?.address?.province ?? '',
        postcode: response.detail?.address?.postcode ?? '',
      },
      contact: {
        contactPersonName: response.detail?.contact?.contactPersonName ?? '',
        contactPersonPhone: response.detail?.contact?.contactPersonPhone ?? '',
        dealerCode: response.detail?.contact?.dealerCode ?? '',
      },
      appointment: {
        appointmentDateTime: response.detail?.appointment?.appointmentDateTime ?? '',
        appointmentLocation: response.detail?.appointment?.appointmentLocation ?? '',
      },
      fee: {
        feePaymentType: response.detail?.fee?.feePaymentType ?? '',
        feeNotes: response.detail?.fee?.feeNotes ?? '',
        absorbedAmount: response.detail?.fee?.absorbedAmount ?? 0,
      },
    },
    customers: response.customers ?? [],
    properties: response.properties ?? [],
    titles: response.titles ?? [],
    documents: response.documents ?? [],
    comments: [],
  };
};

interface RequestDetailPageProps {
  /** When true, displays the page in view-only mode without edit capabilities */
  readOnly?: boolean;
}

function RequestDetailPage({ readOnly = false }: RequestDetailPageProps) {
  // Get requestId from URL params
  // Works for both /requests/:requestId and /appraisal/:appraisalId/request/:requestId routes
  const { requestId } = useParams<{ requestId: string }>();

  const navigate = useNavigate();

  // Fetch request data
  const {
    data: requestData,
    isLoading: isLoadingRequest,
    isError,
    error,
  } = useGetRequestById(requestId);

  // Add minimum loading delay for better UX (show skeleton)
  const [minLoadingDone, setMinLoadingDone] = useState(true);

  useEffect(() => {
    if (isLoadingRequest) {
      setMinLoadingDone(false);
      setTimeout(() => {
        setMinLoadingDone(true);
      }, 500); // 500ms minimum loading time
    }
  }, [isLoadingRequest]);

  const isLoading = isLoadingRequest || !minLoadingDone;

  // Update breadcrumb with request number instead of ID
  useBreadcrumb(requestData?.requestNumber, 'folder-open');

  // Form setup
  const methods = useForm<createRequestFormType>({
    defaultValues: createRequestFormDefault,
    resolver: zodResolver(createRequestForm),
  });

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = methods;

  // Update form when data is fetched
  useEffect(() => {
    if (requestData) {
      const formValues = mapResponseToFormValues(requestData);
      reset(formValues);
    }
  }, [requestData, reset]);

  // Mutation for updating request
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateRequest();

  // Upload session management
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Get or create an upload session for document uploads.
   */
  const getOrCreateSession = useCallback(async (): Promise<string> => {
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  const onSubmit: SubmitHandler<createRequestFormType> = data => {
    if (!requestId) return;

    updateRequest(
      {
        id: requestId,
        request: {
          ...data,
          requestor: data.requestor ?? { userId: '', username: '' },
          creator: data.creator ?? { userId: '', username: '' },
        },
      },
      {
        onSuccess: () => {
          // Navigate back to listing or show success message
          navigate('/requests');
        },
      },
    );
  };

  // Portal context for right menu (only used when not in readOnly mode)
  const rightMenuPortal = useRightMenuPortal();

  // Modal state for user search
  const {
    isOpen: isUserModalOpen,
    onOpen: openUserModal,
    onClose: closeUserModal,
  } = useDisclosure();

  const handleRequestorSelect = (user: UserDtoType) => {
    methods.setValue('requestor', user);
  };

  const handleSaveDraft = () => {
    if (!requestId) return;
    const data = getValues();
    updateRequest({
      id: requestId,
      request: {
        ...data,
        requestor: data.requestor ?? { userId: '', username: '' },
        creator: data.creator ?? { userId: '', username: '' },
      },
    });
  };

  console.log(errors);

  // Loading state
  if (isLoading) {
    return <DetailPageSkeleton showSidebar sidebarWidth="w-72" contentSections={2} />;
  }

  // Error state
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Icon style="solid" name="triangle-exclamation" className="size-16 text-red-500" />
        <h2 className="text-xl font-semibold text-gray-900">Failed to load request</h2>
        <p className="text-gray-500">{(error as Error)?.message || 'Unknown error'}</p>
        <Button onClick={() => navigate('/requests')}>
          <Icon style="solid" name="arrow-left" className="size-4 mr-2" />
          Back to Listing
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Navigation Tabs */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Request Information', id: 'request-information', icon: 'clipboard-list' },
            { label: 'Title Document', id: 'title-document-info', icon: 'file-certificate' },
            { label: 'Attachments', id: 'attach-document', icon: 'paperclip' },
          ]}
        />
      </div>

      {/* Main Content Area with Sidebar */}
      <FormProvider methods={methods} schema={createRequestForm} readOnly={readOnly}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex relative">
          {/* Scrollable Form Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div
              id="form-scroll-container"
              className="flex-1 min-h-0 overflow-y-auto scroll-smooth"
            >
              <div className="flex flex-col gap-6 pb-6 pr-6">
                <Section id="request-information" anchor>
                  <FormCard
                    title="Request Information"
                    subtitle="Customer, property, and appointment details"
                    icon="clipboard-list"
                    iconColor="blue"
                  >
                    <div className="flex flex-col gap-6">
                      <CustomersForm />
                      <RequestForm />
                      <PropertiesForm />
                      <AddressForm />
                      <AppointmentAndFeeForm />
                    </div>
                  </FormCard>
                </Section>

                <Section id="title-document-info" anchor>
                  <TitleInformationForm />
                </Section>

                <Section id="attach-document" anchor className="flex flex-col gap-6">
                  <AttachDocumentForm getOrCreateSession={getOrCreateSession} />
                </Section>
              </div>
            </div>

            {/* Sticky Action buttons - hidden in readOnly mode */}
            {!readOnly && (
              <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 pr-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <CancelButton />
                    <div className="h-6 w-px bg-gray-200" />
                    <div className="flex gap-3">
                      <DeleteButton />
                      <DuplicateButton />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={handleSaveDraft}
                      isLoading={isUpdating}
                    >
                      <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                      Save draft
                    </Button>
                    <Button type="submit" isLoading={isUpdating}>
                      <Icon style="solid" name="check" className="size-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Menu - rendered via portal to layout (only when not in AppraisalLayout) */}
          {!readOnly && (
            <RightMenuPortal>
              <RequestRightMenu
                requestId={requestId}
                onRequestorClick={openUserModal}
                onClose={rightMenuPortal?.onToggle}
              />
            </RightMenuPortal>
          )}
        </form>

        {/* User Search Modal for Requestor */}
        {!readOnly && (
          <SearchUserModal
            isOpen={isUserModalOpen}
            onClose={closeUserModal}
            onSelect={handleRequestorSelect}
          />
        )}
      </FormProvider>
    </div>
  );
}

export default RequestDetailPage;

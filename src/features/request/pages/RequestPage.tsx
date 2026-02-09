import { useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import {
  createRequestForm,
  createRequestFormDefault,
  type createRequestFormType,
  type UserDtoType,
} from '@features/request/schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider } from '@shared/components/form';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/features/auth/store';
import { useBreadcrumb } from '@shared/hooks/useBreadcrumb';
import { DetailPageSkeleton } from '@/shared/components/Skeleton';
import AddressForm from '../forms/AddressForm';
import Button from '@/shared/components/Button';
import RequestRightMenu, { type LocalComment } from '../components/RequestRightMenu';
import RightMenuPortal from '@/shared/components/RightMenuPortal';
import { useRightMenuPortal } from '@/shared/contexts/RightMenuPortalContext';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import { createUploadSession, useCreateRequest, useGetRequestById, useUpdateRequest } from '../api';
import { mapRequestResponseToForm } from '../utils/mappers';
import type { CreateRequestRequestType } from '@shared/schemas/v1';
import CancelButton from '@/shared/components/buttons/CancelButton';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import DuplicateButton from '@/shared/components/buttons/DuplicateButton';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import SearchUserModal from '../components/SearchUserModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';

interface RequestPageProps {
  /** When true, displays the page in view-only mode without edit capabilities */
  readOnly?: boolean;
}

/**
 * Unified Request Page component that handles both create and edit modes.
 * - Create mode: When no `requestId` is present in URL params
 * - Edit mode: When `requestId` is present in URL params
 */
function RequestPage({ readOnly = false }: RequestPageProps) {
  const navigate = useNavigate();
  const currentUser = useAuthStore(state => state.user);

  // Get requestId from URL params - determines create vs edit mode
  const { requestId } = useParams<{ requestId?: string }>();
  const isEditMode = Boolean(requestId);

  // Fetch request data (only in edit mode - enabled: !!id is built into the hook)
  const {
    data: requestData,
    isLoading: isLoadingRequest,
    isFetching,
    isError,
    error,
  } = useGetRequestById(requestId);

  // Add minimum loading delay for better UX (show skeleton) - only in edit mode
  // When data is cached, isLoadingRequest will be false immediately, so we skip the delay
  const [minLoadingDone, setMinLoadingDone] = useState(true);

  useEffect(() => {
    if (isEditMode && isLoadingRequest) {
      setMinLoadingDone(false);
      const timer = setTimeout(() => {
        setMinLoadingDone(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isEditMode, isLoadingRequest]);

  // Show skeleton while fetching (including retries) - don't show form during loading
  const isLoading = isEditMode && (isLoadingRequest || isFetching) && !minLoadingDone;

  // Update breadcrumb with request number (only in edit mode)
  useBreadcrumb(isEditMode ? requestData?.requestNumber : undefined, 'folder-open');

  // Form setup
  const methods = useForm<createRequestFormType>({
    defaultValues: createRequestFormDefault,
    resolver: zodResolver(createRequestForm),
  });

  const {
    handleSubmit,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = methods;

  console.log(getValues());
  console.log(errors);

  // Reset form when switching between create/edit mode or when requestId changes
  useEffect(() => {
    if (!isEditMode) {
      // Create mode: reset to defaults and set current user
      reset(createRequestFormDefault);
      if (currentUser) {
        const userDto: UserDtoType = {
          userId: currentUser.id,
          username: currentUser.name,
        };
        setValue('creator', userDto);
        setValue('requestor', userDto);
      }
    }
  }, [isEditMode, requestId, currentUser, reset, setValue]);

  // Update form when data is fetched (edit mode only)
  // Note: Comments are managed separately by RequestRightMenu via useGetComments API
  useEffect(() => {
    if (isEditMode && requestData) {
      const formValues = mapRequestResponseToForm(requestData);
      reset(formValues);
    }
  }, [isEditMode, requestData, reset]);

  // Mutations
  const { mutate: createRequest, isPending: isCreating } = useCreateRequest();
  const { mutate: updateRequest, isPending: isUpdating } = useUpdateRequest();

  const isPending = isCreating || isUpdating;

  // Track which save action is in progress (for loading state on the correct button)
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Portal context for the right menu
  const rightMenuPortal = useRightMenuPortal();

  // Local comments state for create mode (managed by RequestRightMenu)
  const [pendingComments, setPendingComments] = useState<LocalComment[]>([]);

  // Modal state for user search
  const {
    isOpen: isUserModalOpen,
    onOpen: openUserModal,
    onClose: closeUserModal,
  } = useDisclosure();

  const handleRequestorSelect = (user: UserDtoType) => {
    setValue('requestor', user);
  };

  // Upload session management
  const uploadSessionIdRef = useRef<string | null>(null);
  const sessionPromiseRef = useRef<Promise<string> | null>(null);

  /**
   * Get or create an upload session for document uploads.
   * This function ensures only one session is created per page load,
   * even if called multiple times concurrently.
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
    setSaveAction('submit');

    if (isEditMode && requestId) {
      // Update existing request
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
            toast.success('Request updated successfully');
            setSaveAction(null);
            navigate('/requests');
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update request. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      // Create a new request - include pending comments from local state
      // Don't send id/requestId - backend will assign them
      const commentsForApi = pendingComments.map(c => ({
        comment: c.comment,
        commentedBy: c.commentedBy,
        commentedByName: c.commentedByName,
        commentedAt: c.commentedAt,
        lastModifiedAt: c.lastModifiedAt ?? null,
      }));

      createRequest(
        {
          ...data,
          sessionId: uploadSessionIdRef.current,
          comments: commentsForApi,
        } as CreateRequestRequestType,
        {
          onSuccess: response => {
            toast.success('Request created successfully');
            setSaveAction(null);
            if (response.id) {
              navigate(`/requests/${response.id}`);
            }
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to save request. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();

    if (isEditMode && requestId) {
      // Update existing request as draft
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
      // Create new request as draft - include pending comments from local state
      // Don't send id/requestId - backend will assign them
      const commentsForApi = pendingComments.map(c => ({
        comment: c.comment,
        commentedBy: c.commentedBy,
        commentedByName: c.commentedByName,
        commentedAt: c.commentedAt,
        lastModifiedAt: c.lastModifiedAt ?? null,
      }));

      createRequest(
        {
          ...data,
          sessionId: uploadSessionIdRef.current || '',
          comments: commentsForApi,
        } as CreateRequestRequestType,
        {
          onSuccess: response => {
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.id) {
              navigate(`/requests/${response.id}`);
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

  // Loading state (edit mode only)
  if (isLoading) {
    return <DetailPageSkeleton showSidebar sidebarWidth="w-72" contentSections={2} />;
  }

  // Error state (edit mode only)
  if (isEditMode && isError) {
    const is404 = isAxiosError(error) && error.response?.status === 404;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Icon
          style="solid"
          name={is404 ? 'file-circle-question' : 'triangle-exclamation'}
          className="size-16 text-red-500"
        />
        <h2 className="text-xl font-semibold text-gray-900">
          {is404 ? 'Request not found' : 'Failed to load request'}
        </h2>
        <p className="text-gray-500">
          {is404
            ? 'The request you are looking for does not exist or has been deleted.'
            : (error as Error)?.message || 'Unknown error'}
        </p>
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
                      isLoading={isPending && saveAction === 'draft'}
                      disabled={isPending}
                    >
                      <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                      Save draft
                    </Button>
                    <Button
                      type="submit"
                      isLoading={isPending && saveAction === 'submit'}
                      disabled={isPending}
                    >
                      <Icon style="solid" name="check" className="size-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Menu - rendered via portal to layout (only when not in readOnly mode) */}
          {!readOnly && (
            <RightMenuPortal>
              <RequestRightMenu
                requestId={requestId}
                onRequestorClick={openUserModal}
                onClose={rightMenuPortal?.onToggle}
                onLocalCommentsChange={setPendingComments}
                requestData={
                  isEditMode && requestData
                    ? {
                        status: requestData.status,
                        // Try both field names in case backend uses either
                        createdAt:
                          (requestData as any).createdAt ||
                          (requestData as any).createdDate ||
                          (requestData as any).createDate,
                        dueDate: (requestData as any).dueDate,
                        completedAt:
                          (requestData as any).completedAt || (requestData as any).completedDate,
                      }
                    : undefined
                }
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

export default RequestPage;

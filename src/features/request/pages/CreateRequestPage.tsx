//import { CreateRequestRequest, type CreateRequestRequestType } from '@shared/forms/v1';
import {
  createRequestForm,
  type createRequestFormType,
  type UserDtoType,
} from '@features/request/schemas/form';
import { createRequestFormDefault } from '../schemas/defaults';
import { zodResolver } from '@hookform/resolvers/zod'; // import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useCallback, useEffect, useRef } from 'react';
import { useAuthStore } from '@/features/auth/store';
import AddressForm from '../forms/AddressForm';
import Button from '@/shared/components/Button';
import RequestRightMenu from '../components/RequestRightMenu';
import SearchUserModal from '../components/SearchUserModal';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import { createUploadSession, useCreateRequest } from '../api';
import CancelButton from '@/shared/components/buttons/CancelButton';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import DuplicateButton from '@/shared/components/buttons/DuplicateButton';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';
import RightMenuPortal from '@/shared/components/RightMenuPortal';
import { useRightMenuPortal } from '@/shared/contexts/RightMenuPortalContext';

function CreateRequestPage() {
  const currentUser = useAuthStore(state => state.user);

  const methods = useForm<createRequestFormType>({
    defaultValues: createRequestFormDefault,
    resolver: zodResolver(createRequestForm),
  });

  const {
    handleSubmit,
    getValues,
    setValue,
    formState: { errors },
  } = methods;

  // Set creator and requestor from current user on mount
  useEffect(() => {
    if (currentUser) {
      const userDto: UserDtoType = {
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        avatar: null,
      };
      setValue('creator', userDto);
      setValue('requestor', userDto);
    }
  }, [currentUser, setValue]);

  const { mutate } = useCreateRequest();

  // Portal context for right menu
  const rightMenuPortal = useRightMenuPortal();

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
    // If we already have a session ID, return it
    if (uploadSessionIdRef.current) {
      return uploadSessionIdRef.current;
    }

    // If a session creation is already in progress, wait for it
    if (sessionPromiseRef.current) {
      return sessionPromiseRef.current;
    }

    // Create a new session
    sessionPromiseRef.current = createUploadSession()
      .then(response => {
        uploadSessionIdRef.current = response.sessionId;
        return response.sessionId;
      })
      .catch(error => {
        // Reset promise so the next attempt can retry
        sessionPromiseRef.current = null;
        throw error;
      });

    return sessionPromiseRef.current;
  }, []);

  const onSubmit: SubmitHandler<createRequestFormType> = data => {
    mutate({ ...data, sessionId: uploadSessionIdRef.current || '' });
  };

  const handleSaveDraft = () => {
    const data = getValues();
    mutate({ ...data, sessionId: uploadSessionIdRef.current || '' });
  };

  console.log(errors);

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
      {/*<FormProvider {...methods}>*/}
      <FormProvider methods={methods} schema={createRequestForm}>
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

            {/* Sticky Action buttons */}
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
                  <Button variant="outline" type="button" onClick={handleSaveDraft}>
                    <Icon style="regular" name="floppy-disk" className="size-4 mr-2" />
                    Save draft
                  </Button>
                  <Button type="submit">
                    <Icon style="solid" name="check" className="size-4 mr-2" />
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Menu - rendered via portal to layout */}
          <RightMenuPortal>
            <RequestRightMenu
              onRequestorClick={openUserModal}
              onClose={rightMenuPortal?.onToggle}
            />
          </RightMenuPortal>
        </form>

        {/* User Search Modal for Requestor */}
        <SearchUserModal
          isOpen={isUserModalOpen}
          onClose={closeUserModal}
          onSelect={handleRequestorSelect}
        />
      </FormProvider>
    </div>
  );
}

export default CreateRequestPage;

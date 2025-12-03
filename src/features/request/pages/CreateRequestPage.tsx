import { createRequestRequestDefaults } from '@/shared/forms/defaults';
import { CreateRequestRequest, type CreateRequestRequestType } from '@/shared/forms/v1';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import AddressForm from '../forms/AddressForm';
import Button from '@/shared/components/Button';
import RequestRightMenu from '../components/RequestRightMenu';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import AppHeader from '../../../shared/components/sections/AppHeader';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import { useCreateRequest } from '../api';
import CancelButton from '@/shared/components/buttons/CancelButton';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import DuplicateButton from '@/shared/components/buttons/DuplicateButton';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';

function CreateRequestPage() {
  const methods = useForm<CreateRequestRequestType>({
    defaultValues: createRequestRequestDefaults,
    resolver: zodResolver(CreateRequestRequest),
  });
  const { handleSubmit, getValues } = methods;

  const { mutate } = useCreateRequest();
  const onSubmit: SubmitHandler<CreateRequestRequestType> = data => {
    mutate(data);
  };
  const { isOpen, onToggle } = useDisclosure();
  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <AppHeader iconVariant="folder" title={'New request'} />
        <NavAnchors
          anchors={[
            { label: 'Request Information', id: 'request-information' },
            { label: 'Title Document Info', id: 'title-document-info' },
            { label: 'Attach Document', id: 'attach-document' },
          ]}
        />
      </div>
      <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex-auto flex flex-col gap-6">
                  <Section id="request-information" anchor className="flex flex-col gap-6">
                    <CustomersForm />
                    <RequestForm />
                    <PropertiesForm />
                    <AddressForm />
                    <AppointmentAndFeeForm />
                  </Section>
                  <Section id="title-document-info" anchor className="flex flex-col gap-6">
                    <TitleInformationForm />
                  </Section>
                  <Section id="attach-document" anchor className="flex flex-col gap-6">
                    <AttachDocumentForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
              <ResizableSidebar.Sidebar>
                <RequestRightMenu />
              </ResizableSidebar.Sidebar>
            </ResizableSidebar>

            {/* Action buttons */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
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
                    Save draft
                  </Button>
                  <Button type="submit">Save</Button>
                </div>
              </div>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

export default CreateRequestPage;

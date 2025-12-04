import { createRequestRequestDefaults } from '@/shared/forms/defaults';
import { CreateRequestRequest, type CreateRequestRequestType } from '@/shared/forms/v1';
import { zodResolver } from '@hookform/resolvers/zod';
import { FormProvider, type SubmitHandler, useForm } from 'react-hook-form';
import AddressForm from '../forms/AddressForm';
import Button from '@/shared/components/Button';
import RequestRightMenu from '../components/RequestRightMenu';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import CustomersForm from '../forms/CustomersForm';
import PropertiesForm from '../forms/PropertiesForm';
import RequestForm from '../forms/RequestForm';
import AppointmentAndFeeForm from '../forms/AppointmentAndFeeForm';
import TitleInformationForm from '../forms/TitleInformationForm';
import AttachDocumentForm from '../forms/AttachDocumentForm';
import { useCreateRequest } from '../api';
import CancelButton from '@/shared/components/buttons/CancelButton';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import DuplicateButton from '@/shared/components/buttons/DuplicateButton';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import ReturnButton from '@/shared/components/buttons/ReturnButton';
import Icon from '@/shared/components/Icon';
import FormCard from '@/shared/components/sections/FormCard';

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
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: true });
  const handleSaveDraft = () => {
    const data = getValues();
    mutate(data);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Compact Header */}
      <div className="shrink-0 pb-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-2 mb-3">
          <div className="flex items-center justify-between">
            {/* Left: Back + Title */}
            <div className="flex items-center gap-3">
              <ReturnButton />
              <div className="h-5 w-px bg-gray-200" />
              <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <Icon style="solid" name="folder-open" className="size-4 text-white" />
              </div>
              <span className="text-base font-semibold text-gray-900">New Request</span>
            </div>

            {/* Right: Status Badge */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
              <Icon style="solid" name="circle" className="size-1.5" />
              Draft
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
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
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex relative">
          {/* Scrollable Form Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div id="form-scroll-container" className="flex-1 min-h-0 overflow-y-auto scroll-smooth">
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
                  <AttachDocumentForm />
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

          {/* Right Sidebar */}
          {isOpen ? (
            <div className="w-72 shrink-0 border-l border-gray-100 h-full flex flex-col">
              {/* Sidebar Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</span>
                <button
                  type="button"
                  onClick={onToggle}
                  className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                  title="Close panel"
                >
                  <Icon style="solid" name="xmark" className="size-3.5" />
                </button>
              </div>
              {/* Sidebar Content */}
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <RequestRightMenu />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onToggle}
              className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-all shadow-sm"
              title="Open panel"
            >
              <Icon style="solid" name="sidebar" className="size-4" />
            </button>
          )}
        </form>
      </FormProvider>
    </div>
  );
}

export default CreateRequestPage;

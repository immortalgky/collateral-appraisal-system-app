import { FormProvider, useForm, type SubmitHandler } from 'react-hook-form';
import Button from '@/shared/components/Button';
import CancelButton from '@/shared/components/buttons/CancelButton';
import {
  AppHeader,
  DeleteButton,
  DuplicateButton,
  NavAnchors,
  ResizableSidebar,
  Section,
} from '@/shared/components';
import {
  CreateCollateralCondoRequest,
  CreateCollateralCondoRequestDefaults,
} from '@/shared/forms/typeCondo';
import { zodResolver } from '@hookform/resolvers/zod';
import CondoDetailForm from '../forms/CondoDetailForm';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useCreateCondoRequest } from '../api';
import { CreateCondoRequestType } from '../../../shared/forms/typeCondo';

function CreateCondoPage() {
  const methods = useForm<CreateCondoRequestType>({
    defaultValues: CreateCollateralCondoRequestDefaults,
    resolver: zodResolver(CreateCollateralCondoRequest),
  });

  const { handleSubmit, getValues } = methods;

  const { isOpen, onToggle } = useDisclosure();

  const { mutate } = useCreateCondoRequest();

  const onSubmit: SubmitHandler<CreateCondoRequestType> = data => {
    // mutate(data)
    console.log(data);
  };

  const handleSaveDraft = () => {
    const data = getValues();
    console.log(data);
  };

  return (
    <div>
      <div className="flex flex-col gap-4 mb-6">
        <AppHeader iconVariant="folder" title={'Request for Credit Limit'} />
        <NavAnchors anchors={[{ label: 'Properties', id: 'properties-information' }]} />
      </div>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-6 overflow-y-auto h-[calc(100dvh-15rem)] scroll-smooth">
            <ResizableSidebar
              isOpen={isOpen}
              onToggle={onToggle}
              openedWidth="w-1/5"
              closedWidth="w-1/50"
            >
              <ResizableSidebar.Main>
                <div className="flex-auto flex flex-col gap-6 ">
                  <div>
                    <h2 className="text-lg font-semibol mb-2">Appraisal Information</h2>
                    <div className="h-[0.1px] bg-gray-300 col-span-5"></div>
                  </div>
                  <Section id="land-info" anchor className="flex flex-col gap-6">
                    <CondoDetailForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>
          <div className="bg-white py-4 flex justify-between items-center">
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
        </form>
      </FormProvider>
    </div>
  );
}

export default CreateCondoPage;

import { zodResolver } from '@hookform/resolvers/zod';
import {
  landAndBuildingPMAForm,
  landAndBuildingPMAFormDefault,
  type landAndBuildingPMAFormType,
} from '../schemas/form';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
//import { useGetLandAndBuildingPMAPropertyById, useUpdateLandAndBuildingPMAProperty } from '../api';
import { useEffect, useState } from 'react';
import { mapLandAndBuildingPMAPropertyResponseToForm } from '../utils/mappers';
import { Button, CancelButton, Icon, ResizableSidebar, Section } from '@/shared/components';
import { FormProvider } from '@/shared/components/form';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import LandBuildingPMAForm from '../forms/LandBuildingPMAForm';
import RightMenuPortal from '@/shared/components/RightMenuPortal';

const LandBuildingPMAPage = () => {
  const { propertyId } = useParams<{ propertyId?: string }>();

  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;

  const methods = useForm<landAndBuildingPMAFormType>({
    defaultValues: landAndBuildingPMAFormDefault,
    resolver: zodResolver(landAndBuildingPMAForm),
  });
  const { handleSubmit, getValues, reset } = methods;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  //const { mutate, isPending } = useUpdateLandAndBuildingPMAProperty();

  // const { data: propertyData, isLoading } = useGetLandAndBuildingPMAPropertyById(
  //   appraisalId,
  //   propertyId,
  // );

  const data = {};
  const isPending = false;

  const onSubmit: SubmitHandler<landAndBuildingPMAFormType> = data => {
    setSaveAction('submit');

    //mutate({ ...data, apprId: appraisalId, propertyId: propertyId } as any);
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();
    //mutate({ ...data, apprId: appraisalId, propertyId: propertyId } as any);
  };

  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (propertyData) {
      const formValue = mapLandAndBuildingPMAPropertyResponseToForm(propertyData);
      reset(formValue);
    }
  }, [propertyData, reset]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={landAndBuildingPMAForm}>
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
                  {/* Building Form */}
                  <Section className="flex flex-col gap-6 min-w-0 overflow-hidden">
                    <LandBuildingPMAForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Sticky Action Buttons */}

          <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <CancelButton />
                <div className="h-6 w-px bg-gray-200" />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
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
              </div>
            </div>
          </div>

          <RightMenuPortal>
            <div></div>
          </RightMenuPortal>
        </form>
      </FormProvider>
    </div>
  );
};

export default LandBuildingPMAPage;

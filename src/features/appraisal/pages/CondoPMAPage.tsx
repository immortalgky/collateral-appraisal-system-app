import { useParams } from 'react-router-dom';
import {
  createCondoPMAForm,
  createCondoPMAFormDefault,
  type createCondoPMAFormType,
} from '../schemas/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useEffect, useState } from 'react';
//import { useGetCondoPMAPropertyById, useUpdateCondoPMAProperty } from '../api';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { mapCondoPMAPropertyResponseToForm } from '../utils/mappers';
import { Button, CancelButton, Icon, ResizableSidebar, Section } from '@/shared/components';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import { FormProvider } from '@/shared/components/form';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import RightMenuPortal from '@/shared/components/RightMenuPortal';
import CondoPMAForm from '../forms/CondoPMAForm';
import { useAppraisalReadOnly } from '../context/AppraisalContext';

const CondoPMAPage = () => {
  const { isReadOnly } = useAppraisalReadOnly('Property Information');
  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useParams<{ appraisalId: string }>().appraisalId;

  const methods = useForm<createCondoPMAFormType>({
    defaultValues: createCondoPMAFormDefault,
    resolver: zodResolver(createCondoPMAForm),
  });
  const {
    handleSubmit,
    getValues,
    reset,
    formState: { isDirty },
  } = methods;

  const { blocker } = useUnsavedChangesWarning(isDirty);

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  //const { mutate, isPending } = useUpdateCondoPMAProperty();

  //const { data: propertyData, isLoading } = useGetCondoPMAPropertyById(appraisalId, propertyId);

  const propertyData = undefined; // TODO: replace with useGetCondoPMAPropertyById(appraisalId, propertyId)
  const isLoading = false;
  const isPending = false;

  const onSubmit: SubmitHandler<createCondoPMAFormType> = data => {
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
      const formValue = mapCondoPMAPropertyResponseToForm(propertyData);
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
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'PMA', id: 'pma-section', icon: 'file-invoice-dollar' },
            { label: 'Property', id: 'property-section', icon: 'city' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createCondoPMAForm}>
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
                  <Section
                    id="pma-section"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <CondoPMAForm />
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
                {!isReadOnly && (
                  <>
                    <div className="h-6 w-px bg-gray-200" />
                    {isDirty && (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Unsaved changes
                      </span>
                    )}
                  </>
                )}
              </div>
              {!isReadOnly && (
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
              )}
            </div>
          </div>

          <UnsavedChangesDialog blocker={blocker} />

          <RightMenuPortal>
            <div></div>
          </RightMenuPortal>
        </form>
      </FormProvider>
    </div>
  );
};

export default CondoPMAPage;

import { ActionBar, Button, CancelButton, Icon, NavAnchors, Section } from '@/shared/components';
import { SupportingDataMaintenanceDetailForm } from '../components/SupportingDataMaintenanceDetailForm';
import {
  createSupportingDataDetailForm,
  defaultSupportingDataDetail,
  type createSupportingDataDetailFormType,
} from '../schemas/form';
import { FormProvider } from '@shared/components/form';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { useNavigate } from 'react-router-dom';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';

export function SupportingDataMaintenanceDetailPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();

  // ------------------------------------------------------------------
  // Form
  // ------------------------------------------------------------------
  const methods = useForm<createSupportingDataDetailFormType>({
    resolver: zodResolver(createSupportingDataDetailForm),
    defaultValues: defaultSupportingDataDetail,
    mode: 'onSubmit',
  });
  const {
    handleSubmit,
    getValues,
    formState: { dirtyFields },
  } = methods;

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  // ------------------------------------------------------------------
  // Submit / Save Draft
  // ------------------------------------------------------------------
  const onSubmit: SubmitHandler<createSupportingDataDetailFormType> = data => {
    // Submit goes through react-hook-form so Zod validation runs first.
    console.log('Submit:', data);
    // TODO: call submit API
  };

  const handleSaveDraft = async () => {
    // Save draft skips validation by reading values directly.
    const data = getValues();
    console.log('Save draft:', data);
    // TODO: call save-draft API
    toast.success('Draft saved');
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* NavAnchors */}
      <div className="shrink-0 pb-4">
        <NavAnchors
          containerId="form-scroll-container"
          anchors={[
            { label: 'Photos', id: 'photos', icon: 'images' },
            { label: 'Land', id: 'supporting-data-detail-section', icon: 'mountain-sun' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createSupportingDataDetailForm}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 min-h-0 flex flex-col min-w-0"
          noValidate
        >
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <div className="flex-auto flex flex-col gap-6 min-w-0 mb-4">
              {/* Photos Section */}
              <Section id="photos" anchor className="min-w-0 overflow-hidden">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                    <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
                </div>
                <div className="h-px bg-gray-200 mb-4" />
                {/* {appraisalId && (
              <PropertyPhotoSection
                ref={photoSectionRef}
                appraisalId={appraisalId}
                propertyId={propertyId}
              />
            )} */}
              </Section>

              {/* Supporting Data Detail Header */}
              <Section id="supporting-data-detail-section" anchor>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                    <Icon
                      name="file-circle-info"
                      style="solid"
                      className="w-5 h-5 text-amber-600"
                    />
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900">Supporting Data Detail</h2>
                </div>
                <div className="h-px bg-gray-200" />
              </Section>

              {/* Supporting Data Form */}
              <Section id="supporting-data-detail" anchor className="flex flex-col gap-6 min-w-0">
                <SupportingDataMaintenanceDetailForm />
              </Section>
            </div>
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
                  // isLoading={isPending && saveAction === 'draft'}
                  // disabled={isPending}
                >
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save draft
                </Button>
                <Button
                  type="submit"
                  // isLoading={isPending && saveAction === 'submit'}
                  // disabled={isPending}
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
}

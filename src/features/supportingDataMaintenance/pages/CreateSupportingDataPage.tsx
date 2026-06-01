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
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useCreateSupportingDetailData,
  useGetSupportingDataDetailById,
  useUpdateSupportingDetailData,
} from '../api';
import { useEffect, useMemo, useRef, useState } from 'react';
import { mapSupportingDataDetailResponseToForm } from '../utils/mapper';
import SupportingDataDetailPhotoSection, {
  type SupportingDataDetailPhotoSectionRef,
} from '../components/SupportingDataDetailPhotoSection';
import { useTranslation } from 'react-i18next';

export function CreateSupportingDataPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const { t } = useTranslation('supportingDataMaintenance');

  const { supportingId, id } = useParams<{ supportingId: string; id?: string }>();

  const isEditMode = Boolean(id);

  const { data: supportingData, isLoading } = useGetSupportingDataDetailById(supportingId, id);

  const formDefaults = useMemo(() => {
    if (isEditMode && supportingData) {
      return mapSupportingDataDetailResponseToForm(supportingData);
    }
    return defaultSupportingDataDetail;
  }, [isEditMode, supportingData]);

  // ------------------------------------------------------------------
  // Form
  // ------------------------------------------------------------------
  const methods = useForm<createSupportingDataDetailFormType>({
    resolver: zodResolver(createSupportingDataDetailForm),
    defaultValues: formDefaults,
  });

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { dirtyFields },
  } = methods;

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  useEffect(() => {
    if (isEditMode && supportingData) {
      reset(mapSupportingDataDetailResponseToForm(supportingData));
    }
  }, [isEditMode, supportingData, reset]);

  const photoSectionRef = useRef<SupportingDataDetailPhotoSectionRef>(null);

  const { mutate: createSupportingData, isPending: isCreating } = useCreateSupportingDetailData();
  const { mutate: updateSupportingData, isPending: isUpdating } = useUpdateSupportingDetailData();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createSupportingDataDetailFormType> = data => {
    setSaveAction('submit');

    if (isEditMode && id) {
      updateSupportingData(
        {
          supportingId: supportingId!,
          id,
          data: data as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.detailUpdatedSuccess'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.detailUpdateFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      createSupportingData(
        {
          supportingId: supportingId!,
          data: data as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkImagesToDetail(
              response.supportingId ?? supportingId!,
              response.id,
            );
            toast.success(t('toasts.detailCreatedSuccess'));
            setSaveAction(null);
            skipWarning();
            navigate(
              `/standalone/supporting-data-maintenance/${response.supportingId}/data/${response.id}`,
            );
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.detailCreateFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();

    if (isEditMode && id) {
      updateSupportingData(
        {
          supportingId: supportingId!,
          id,
          data: data as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.detailDraftSavedSuccess'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.detailDraftSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    } else {
      createSupportingData(
        {
          supportingId: supportingId!,
          data: data as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkImagesToDetail(
              response.supportingId ?? supportingId!,
              response.id,
            );
            toast.success(t('toasts.detailDraftSavedSuccess'));
            setSaveAction(null);
            skipWarning();
            navigate(
              `/standalone/supporting-data-maintenance/${response.supportingId}/data/${response.id}`,
            );
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || t('toasts.detailDraftSaveFailed'));
            setSaveAction(null);
          },
        },
      );
    }
  };

  if (isLoading || (isEditMode && !supportingData)) {
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
            { label: t('nav.photos'), id: 'photos', icon: 'images' },
            {
              label: t('nav.supportingDataDetail'),
              id: 'supporting-data-detail-section',
              icon: 'file-circle-info',
            },
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
                  <h2 className="text-lg font-semibold text-gray-900">{t('nav.photos')}</h2>
                </div>
                <div className="h-px bg-gray-200 mb-4" />
                <SupportingDataDetailPhotoSection
                  ref={photoSectionRef}
                  supportingId={supportingId!}
                  detailId={id}
                  images={supportingData?.images}
                />
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
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('formSections.supportingDataDetailHeader')}
                  </h2>
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
              <CancelButton
                fallbackPath={`/standalone/supporting-data-maintenance/${supportingId}`}
              />
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
                  type="submit"
                  isLoading={isPending && saveAction === 'submit'}
                  disabled={isPending}
                >
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  {t('actions.save')}
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

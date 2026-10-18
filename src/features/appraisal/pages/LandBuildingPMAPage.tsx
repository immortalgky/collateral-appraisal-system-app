import { zodResolver } from '@hookform/resolvers/zod';
import {
  useLandAndBuildingPMAFormSchema,
  createLandAndBuildingPMAFormDefault,
  type createLandAndBuildingPMAFormType,
} from '../schemas/form';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import {
  useCreateLandAndBuildingPMAProperty,
  useGetLandAndBuildingPMAPropertyById,
  useSaveLandAndBuildingPMAPropertyDraft,
  useUpdateLandAndBuildingPMAProperty,
} from '../api';
import { useEffect, useState } from 'react';
import {
  mapLandAndBuildingPMAFormToPayload,
  mapLandAndBuildingPMAPropertyResponseToForm,
} from '../utils/mappers';
import { Button, CancelButton, Icon, ResizableSidebar, Section } from '@/shared/components';
import { FormProvider } from '@/shared/components/form';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import LandBuildingPMAForm from '../forms/LandBuildingPMAForm';
import RightMenuPortal from '@/shared/components/RightMenuPortal';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import ActionBar from '@/shared/components/ActionBar';
import { PropertyEditorHeader } from '../components/PropertyEditorHeader';
import PmaSyncStatus from '../components/PmaSyncStatus';

const LandBuildingPMAPage = () => {
  const { t } = useTranslation('appraisal');
  const isReadOnly = usePageReadOnly();
  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const landAndBuildingPMAFormSchema = useLandAndBuildingPMAFormSchema();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const groupId = searchParams.get('groupId') ?? undefined;
  const isEditMode = Boolean(propertyId);

  const methods = useForm<createLandAndBuildingPMAFormType>({
    defaultValues: createLandAndBuildingPMAFormDefault,
    resolver: zodResolver(landAndBuildingPMAFormSchema),
  });
  const {
    handleSubmit,
    getValues,
    reset,
    formState: { dirtyFields },
  } = methods;

  // The one dirty signal for this page — the leave guard, the unsaved badge and both Save buttons.
  // Per-field, like the other property pages; this used to count the keys of isDirty, a boolean,
  // so the guard never fired. Not isDirty for the badge either: react-hook-form can re-emit an
  // isDirty computed before a derived write (the forced-sale proposal, Total Sq.Wa) and leave it
  // stale, while dirtyFields is updated in place and always current.
  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const { mutate: updateLandPMAProperties, isPending: isUpdating } =
    useUpdateLandAndBuildingPMAProperty();

  const { mutate: saveLandPMAPropertiesDraft, isPending: isSavingDraft } =
    useSaveLandAndBuildingPMAPropertyDraft();

  const { mutate: createLandPMAProperties, isPending: isCreating } =
    useCreateLandAndBuildingPMAProperty();

  const isPending = isCreating || isUpdating || isSavingDraft;

  const { data: propertyData, isLoading } = useGetLandAndBuildingPMAPropertyById(
    appraisalId ?? '',
    propertyId,
  );

  const onSubmit: SubmitHandler<createLandAndBuildingPMAFormType> = data => {
    setSaveAction('submit');
    const payload = mapLandAndBuildingPMAFormToPayload(data, propertyData?.titles ?? []);
    if (isEditMode && propertyId) {
      updateLandPMAProperties(
        { data: payload, appraisalId: appraisalId!, propertyId: propertyId },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.propertyLandBuildingUpdated'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createLandPMAProperties(
        { data: payload, appraisalId: appraisalId!, groupId: groupId },
        {
          onSuccess: (response: any) => {
            toast.success(t('toasts.propertyLandBuildingCreated'));
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/land-building/${response.propertyId}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to create property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();
    const payload = mapLandAndBuildingPMAFormToPayload(data, propertyData?.titles ?? []);
    if (isEditMode && propertyId) {
      saveLandPMAPropertiesDraft(
        { data: payload, appraisalId: appraisalId!, propertyId: propertyId },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to save draft. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createLandPMAProperties(
        { data: payload, appraisalId: appraisalId!, groupId: groupId },
        {
          onSuccess: (response: any) => {
            toast.success(t('toasts.draftSaved'));
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property-pma/land-building/${response.propertyId}`);
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

  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && propertyData) {
      const formValue = mapLandAndBuildingPMAPropertyResponseToForm(propertyData);
      reset(formValue);
    }
  }, [isEditMode, propertyData, reset]);

  if (isLoading || (isEditMode && !propertyData)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <FormProvider methods={methods} schema={landAndBuildingPMAFormSchema}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="cas-form-grid flex-1 min-h-0 flex flex-col"
        >
          {/* Scrollable Form Content */}
          <div
            id="form-scroll-container"
            className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <PropertyEditorHeader
              appraisalId={appraisalId}
              propertyId={propertyId}
              typeCode="LB"
              pma
              meta={
                <PmaSyncStatus
                  status={isEditMode ? propertyData?.externalSyncStatus : undefined}
                  error={isEditMode ? propertyData?.externalSyncError : undefined}
                  syncedAt={isEditMode ? propertyData?.externalSyncedAt : undefined}
                />
              }
              tabs={[{ id: 'pma', label: t('createPage.navPma') }]}
              activeTab="pma"
            />
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
                    <LandBuildingPMAForm />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
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
                  isLoading={isPending && saveAction === 'draft'}
                  disabled={isPending || !hasDirtyFields}
                >
                  {t('createPage.saveDraft')}
                </Button>
                <Button
                  type="submit"
                  isLoading={isPending && saveAction === 'submit'}
                  disabled={
                    isPending || (!hasDirtyFields && propertyData?.externalSyncStatus !== 'Failed')
                  }
                >
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  {t('createPage.save')}
                </Button>
              </ActionBar.Right>
            )}
          </ActionBar>

          <UnsavedChangesDialog blocker={blocker} />

          <RightMenuPortal>
            <div></div>
          </RightMenuPortal>
        </form>
      </FormProvider>
    </div>
  );
};

export default LandBuildingPMAPage;

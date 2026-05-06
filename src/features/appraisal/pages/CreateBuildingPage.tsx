import { useEffect, useMemo, useRef, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { FormProvider } from '@shared/components/form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  useBasePath,
  useAppraisalId,
  useAppraisalContextSafe,
  useIsCiAppraisal,
} from '@/features/appraisal/context/AppraisalContext';
import { useCollateralPrefillStore } from '@/features/collateralMaster/store/collateralPrefillStore';
import { useProgressivePrefill } from '@/features/collateralMaster/hooks/useProgressivePrefill';

import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import BuildingDetailForm from '../forms/BuildingDetailForm';
import {
  useCreateBuildingProperty,
  useGetBuildingPropertyById,
  useUpdateBuildingProperty,
} from '../api/property';
import {
  createBuildingForm,
  createBuildingFormDefault,
  type createBuildingFormType,
} from '../schemas/form';
import {
  mapBuildingPropertyResponseToForm,
  mapBuildingFormDataToApiPayload,
} from '../utils/mappers';
import toast from 'react-hot-toast';
import PropertyPhotoSection, {
  type PropertyPhotoSectionRef,
} from '../components/PropertyPhotoSection';
import { usePageReadOnly, PageReadOnlyContext } from '@/shared/contexts/PageReadOnlyContext';
import { FormReadOnlyContext } from '@shared/components/form';
import { ConstructionInspectionTab } from '../components/tabs/ConstructionInspectionTab';

const CreateBuildingPage = () => {
  const _baseReadOnly = usePageReadOnly();
  const isCiAppraisal = useIsCiAppraisal();
  const isReadOnly = _baseReadOnly || isCiAppraisal;
  const navigate = useNavigate();
  const basePath = useBasePath();

  const { propertyId } = useParams<{ propertyId?: string }>();
  const appraisalId = useAppraisalId();
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId') ?? undefined;
  const photoSectionRef = useRef<PropertyPhotoSectionRef>(null);

  const isEditMode = Boolean(propertyId);

  const { data: propertyData, isLoading } = useGetBuildingPropertyById(
    appraisalId ?? '',
    propertyId,
  );

  const formDefaults = useMemo(() => {
    if (isEditMode && propertyData) {
      return mapBuildingPropertyResponseToForm(propertyData);
    }
    return createBuildingFormDefault;
  }, [isEditMode, propertyData]);

  const methods = useForm<createBuildingFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createBuildingForm),
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
    if (isEditMode && propertyData) {
      reset(mapBuildingPropertyResponseToForm(propertyData));
    }
  }, [isEditMode, propertyData, reset]);

  // ── Progressive appraisal prefill ──────────────────────────────────────────
  // In create mode for a Progressive appraisal, seed the construction inspection
  // fields from the prior inspection stored on the CollateralMaster.
  const appraisalCtx = useAppraisalContextSafe();
  const appraisal = appraisalCtx?.appraisal ?? null;
  const isProgressive = appraisal?.appraisalType === 'Progressive';
  const lastConstructionInspectionId = useCollateralPrefillStore(
    s => s.lastConstructionInspectionId,
  );
  // Only call the hook when conditions warrant a prefill — null disables the query
  const prefillInspectionId = !isEditMode && isProgressive ? lastConstructionInspectionId : null;

  const { buildSeedRows, isSummaryMode, summaryPreviousProgressPct, priorDetails } =
    useProgressivePrefill(prefillInspectionId);

  // Guard: apply prefill only once per create-mode mount
  const prefillAppliedRef = useRef(false);

  useEffect(() => {
    if (prefillAppliedRef.current) return;
    if (!priorDetails) return;
    if (isEditMode) return;

    prefillAppliedRef.current = true;

    if (!isSummaryMode) {
      const seeds = buildSeedRows();
      if (seeds && seeds.length > 0) {
        methods.setValue('constructionEnterDetail', true, { shouldDirty: true });
        methods.setValue(
          'constructionSubItems',
          seeds.map(s => ({
            id: null,
            constructionWorkGroupId: s.constructionWorkGroupId ?? '',
            constructionWorkItemId: s.constructionWorkItemId ?? null,
            workItemName: s.workItemName ?? '',
            displayOrder: s.displayOrder ?? 0,
            proportionPct: s.proportionPct ?? 0,
            previousProgressPct: s.previousProgressPct ?? 0,
            currentProgressPct: 0, // fresh inspection starts at 0 delta from previous
          })),
          { shouldDirty: true },
        );
      }
    } else {
      // Summary mode: seed the previous progress from prior summary
      methods.setValue('constructionEnterDetail', false, { shouldDirty: true });
      methods.setValue(
        'constructionSummary.summaryPreviousProgressPct',
        summaryPreviousProgressPct ?? 0,
        { shouldDirty: true },
      );
    }
  }, [priorDetails, isEditMode, isSummaryMode, buildSeedRows, summaryPreviousProgressPct, methods]);
  // ──────────────────────────────────────────────────────────────────────────

  const { mutate: createBuildingProperties, isPending: isCreating } = useCreateBuildingProperty();
  const { mutate: updateBuildingProperties, isPending: isUpdating } = useUpdateBuildingProperty();

  const isPending = isCreating || isUpdating;

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const onSubmit: SubmitHandler<createBuildingFormType> = data => {
    setSaveAction('submit');
    const payload = mapBuildingFormDataToApiPayload(data);

    if (isEditMode && propertyId) {
      updateBuildingProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: payload,
        },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success('Property building updated successfully');
            setSaveAction(null);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to update property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    } else {
      createBuildingProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: payload,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Property building created successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/property/building/${response.propertyId}`);
          },
          onError: (error: any) => {
            toast.error(error.apiError?.detail || 'Failed to create property. Please try again.');
            setSaveAction(null);
          },
        },
      );
    }
  };

  const { isOpen, onToggle } = useDisclosure();

  const handleSaveDraft = () => {
    setSaveAction('draft');
    const data = getValues();
    const payload = mapBuildingFormDataToApiPayload(data);

    if (isEditMode && propertyId) {
      updateBuildingProperties(
        {
          appraisalId: appraisalId!,
          propertyId,
          data: { ...payload, isDraft: true } as any,
        },
        {
          onSuccess: () => {
            reset(getValues());
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
      createBuildingProperties(
        {
          appraisalId: appraisalId!,
          groupId,
          data: { ...payload, isDraft: true } as any,
        },
        {
          onSuccess: async (response: any) => {
            await photoSectionRef.current?.linkPhotosToProperty(response.propertyId ?? response.id);
            toast.success('Draft saved successfully');
            setSaveAction(null);
            if (response.propertyId) {
              skipWarning();
              navigate(`${basePath}/property/building/${response.propertyId}`);
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

  const isUnderConstruction = methods.watch('isUnderConstruction');
  const tabParam = searchParams.get('tab');
  const initialBuildingTab = tabParam === 'construction' ? 'construction' : 'building';
  const [activeTab, setActiveTab] = useState<'building' | 'construction'>(initialBuildingTab);

  // Reset to default tab if construction tab is active but property is not under construction (CI appraisals always show it)
  useEffect(() => {
    if (activeTab === 'construction' && !isUnderConstruction && !isCiAppraisal) {
      setActiveTab('building');
    }
  }, [isUnderConstruction, activeTab, isCiAppraisal]);

  if (isLoading || (isEditMode && !propertyData)) {
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
            { label: 'Photos', id: 'photos', icon: 'images' },
            {
              label: 'Building',
              id: 'properties-section',
              icon: 'building',
              onClick: () => setActiveTab('building'),
            },
            ...(isUnderConstruction || isCiAppraisal
              ? [
                  {
                    label: 'Construction Inspection',
                    id: 'construction-section',
                    icon: 'helmet-safety',
                    onClick: () => setActiveTab('construction'),
                  },
                ]
              : []),
          ]}
        />
      </div>

      <PageReadOnlyContext.Provider value={isReadOnly}>
        <FormProvider methods={methods} schema={createBuildingForm}>
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
                    {/* Photos Section — re-override to status-only readonly so CI appraisals can still manage photos */}
                    <PageReadOnlyContext.Provider value={_baseReadOnly}>
                      <FormReadOnlyContext.Provider value={_baseReadOnly}>
                        <Section id="photos" anchor className="min-w-0 overflow-hidden">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                              <Icon
                                name="images"
                                style="solid"
                                className="w-5 h-5 text-indigo-600"
                              />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900">Photos</h2>
                          </div>
                          <div className="h-px bg-gray-200 mb-4" />
                          {appraisalId && (
                            <PropertyPhotoSection
                              ref={photoSectionRef}
                              appraisalId={appraisalId}
                              propertyId={propertyId}
                            />
                          )}
                        </Section>
                      </FormReadOnlyContext.Provider>
                    </PageReadOnlyContext.Provider>

                    {/* Building Tab Content */}
                    <div
                      id="properties-section"
                      className={`flex flex-col gap-6 ${activeTab !== 'building' ? 'hidden' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                          <Icon name="building" style="solid" className="w-5 h-5 text-blue-600" />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          Building Information
                        </h2>
                      </div>
                      <div className="h-px bg-gray-200" />
                      <Section id="building-info" anchor className="flex flex-col gap-6">
                        <BuildingDetailForm />
                      </Section>
                    </div>

                    {/* Construction Inspection Tab Content */}
                    {(isUnderConstruction || isCiAppraisal) && (
                      <div
                        id="construction-section"
                        className={`flex flex-col gap-6 ${activeTab !== 'construction' ? 'hidden' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-teal-100 flex items-center justify-center">
                            <Icon
                              name="helmet-safety"
                              style="solid"
                              className="w-5 h-5 text-teal-600"
                            />
                          </div>
                          <h2 className="text-lg font-semibold text-gray-900">
                            Construction Inspection
                          </h2>
                        </div>
                        <div className="h-px bg-gray-200" />
                        <Section id="construction-info" anchor className="flex flex-col gap-6">
                          <FormReadOnlyContext.Provider value={_baseReadOnly}>
                            <ConstructionInspectionTab
                              readOnly={_baseReadOnly}
                              ciMode={isCiAppraisal}
                            />
                          </FormReadOnlyContext.Provider>
                        </Section>
                      </div>
                    )}
                  </div>
                </ResizableSidebar.Main>
              </ResizableSidebar>
            </div>

            {/* Sticky Action Buttons */}
            <ActionBar>
              <ActionBar.Left>
                <CancelButton />
                {!_baseReadOnly && (
                  <>
                    <ActionBar.Divider />
                    <ActionBar.UnsavedIndicator show={hasDirtyFields} />
                  </>
                )}
              </ActionBar.Left>
              {!_baseReadOnly && (
                <ActionBar.Right>
                  <Button
                    variant="ghost"
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
                </ActionBar.Right>
              )}
            </ActionBar>

            <UnsavedChangesDialog blocker={blocker} />
          </form>
        </FormProvider>
      </PageReadOnlyContext.Provider>
    </div>
  );
};

export default CreateBuildingPage;

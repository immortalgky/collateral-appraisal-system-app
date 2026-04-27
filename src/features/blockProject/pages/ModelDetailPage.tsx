import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import Section from '@/shared/components/sections/Section';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import { FormProvider } from '@/shared/components/form';
import type { ApiError } from '@/shared/types/api';

import {
  useGetProjectModelById,
  useCreateProjectModel,
  useUpdateProjectModel,
} from '../api/projectModel';
import ModelDetailForm from '../forms/ModelDetailForm';
import {
  projectModelForm,
  condoModelFormDefaults,
  lbModelFormDefaults,
  type CondoModelFormType,
  type LbModelFormType,
} from '../schemas/form';
import type { ProjectType } from '../types';

type AppError = AxiosError & { apiError?: ApiError };

interface ModelDetailPageProps {
  projectType: ProjectType;
}

/**
 * Unified model detail page for Condo and LandAndBuilding project types.
 * On create navigates to block-condo/model/:id or block-village/model/:id
 * depending on projectType.
 */
export default function ModelDetailPage({ projectType }: ModelDetailPageProps) {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { modelId } = useParams<{ modelId?: string }>();

  const isEditMode = Boolean(modelId);
  const routeSegment = projectType === 'Condo' ? 'block-condo' : 'block-village';
  const schema = projectModelForm(projectType);

  const { data: modelData, isLoading } = useGetProjectModelById(appraisalId ?? '', modelId);
  const { mutate: createModel, isPending: isCreating } = useCreateProjectModel();
  const { mutate: updateModel, isPending: isUpdating } = useUpdateProjectModel();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const formDefaults = useMemo(() => {
    if (isEditMode && modelData) {
      if (projectType === 'Condo') {
        return {
          modelName: modelData.modelName ?? '',
          modelDescription: modelData.modelDescription ?? null,
          buildingNumber: modelData.buildingNumber ?? '',
          startingPriceMin: modelData.startingPriceMin ?? null,
          startingPriceMax: modelData.startingPriceMax ?? null,
          standardPrice: modelData.standardPrice ?? null,
          hasMezzanine: modelData.hasMezzanine ?? false,
          usableAreaMin: modelData.usableAreaMin ?? null,
          usableAreaMax: modelData.usableAreaMax ?? null,
          standardUsableArea: modelData.standardUsableArea ?? null,
          fireInsuranceCondition: modelData.fireInsuranceCondition ?? null,
          roomLayoutType: modelData.roomLayoutType ?? null,
          roomLayoutTypeOther: modelData.roomLayoutTypeOther ?? null,
          groundFloorMaterialType: modelData.groundFloorMaterialType ?? null,
          groundFloorMaterialTypeOther: modelData.groundFloorMaterialTypeOther ?? null,
          upperFloorMaterialType: modelData.upperFloorMaterialType ?? null,
          upperFloorMaterialTypeOther: modelData.upperFloorMaterialTypeOther ?? null,
          bathroomFloorMaterialType: modelData.bathroomFloorMaterialType ?? null,
          bathroomFloorMaterialTypeOther: modelData.bathroomFloorMaterialTypeOther ?? null,
          remark: modelData.remark ?? null,
          areaDetails: modelData.areaDetails ?? [],
        } satisfies CondoModelFormType;
      }
      // LandAndBuilding
      return {
        modelName: modelData.modelName ?? '',
        modelDescription: modelData.modelDescription ?? null,
        numberOfHouse: modelData.numberOfHouse ?? null,
        startingPrice: modelData.startingPrice ?? null,
        standardPrice: modelData.standardPrice ?? null,
        usableAreaMin: modelData.usableAreaMin ?? null,
        usableAreaMax: modelData.usableAreaMax ?? null,
        standardUsableArea: modelData.standardUsableArea ?? null,
        landAreaRai: modelData.landAreaRai ?? null,
        landAreaNgan: modelData.landAreaNgan ?? null,
        landAreaWa: modelData.landAreaWa ?? null,
        standardLandArea: modelData.standardLandArea ?? null,
        fireInsuranceCondition: modelData.fireInsuranceCondition ?? null,
        groundFloorMaterialType: modelData.groundFloorMaterialType ?? null,
        groundFloorMaterialTypeOther: modelData.groundFloorMaterialTypeOther ?? null,
        upperFloorMaterialType: modelData.upperFloorMaterialType ?? null,
        upperFloorMaterialTypeOther: modelData.upperFloorMaterialTypeOther ?? null,
        bathroomFloorMaterialType: modelData.bathroomFloorMaterialType ?? null,
        bathroomFloorMaterialTypeOther: modelData.bathroomFloorMaterialTypeOther ?? null,
        remark: modelData.remark ?? null,
        buildingType: modelData.buildingType ?? null,
        buildingTypeOther: modelData.buildingTypeOther ?? null,
        numberOfFloors: modelData.numberOfFloors ?? null,
        decorationType: modelData.decorationType ?? null,
        decorationTypeOther: modelData.decorationTypeOther ?? null,
        isEncroachingOthers: modelData.isEncroachingOthers ?? false,
        encroachingOthersRemark: modelData.encroachingOthersRemark ?? null,
        encroachingOthersArea: modelData.encroachingOthersArea ?? null,
        buildingMaterialType: modelData.buildingMaterialType ?? null,
        buildingStyleType: modelData.buildingStyleType ?? null,
        isResidential: modelData.isResidential ?? false,
        buildingAge: modelData.buildingAge ?? null,
        constructionYear: modelData.constructionYear ?? null,
        residentialRemark: modelData.residentialRemark ?? null,
        constructionStyleType: modelData.constructionStyleType ?? null,
        constructionStyleRemark: modelData.constructionStyleRemark ?? null,
        constructionType: modelData.constructionType ?? null,
        constructionTypeOther: modelData.constructionTypeOther ?? null,
        utilizationType: modelData.utilizationType ?? null,
        utilizationTypeOther: modelData.utilizationTypeOther ?? null,
        structureType: modelData.structureType ?? [],
        structureTypeOther: modelData.structureTypeOther ?? null,
        roofFrameType: modelData.roofFrameType ?? [],
        roofFrameTypeOther: modelData.roofFrameTypeOther ?? null,
        roofType: modelData.roofType ?? [],
        roofTypeOther: modelData.roofTypeOther ?? null,
        ceilingType: modelData.ceilingType ?? [],
        ceilingTypeOther: modelData.ceilingTypeOther ?? null,
        interiorWallType: modelData.interiorWallType ?? [],
        interiorWallTypeOther: modelData.interiorWallTypeOther ?? null,
        exteriorWallType: modelData.exteriorWallType ?? [],
        exteriorWallTypeOther: modelData.exteriorWallTypeOther ?? null,
        fenceType: modelData.fenceType ?? [],
        fenceTypeOther: modelData.fenceTypeOther ?? null,
        areaDetails: modelData.areaDetails ?? [],
        surfaces: modelData.surfaces ?? [],
        depreciationDetails: modelData.depreciationDetails ?? [],
      } satisfies Partial<LbModelFormType>;
    }
    return projectType === 'Condo' ? condoModelFormDefaults : lbModelFormDefaults;
  }, [isEditMode, modelData, projectType]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    defaultValues: formDefaults,
    resolver: zodResolver(schema),
  });

  const { handleSubmit, getValues, reset, formState: { dirtyFields } } = methods;
  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && modelData) {
      reset(formDefaults);
    }
  }, [isEditMode, modelData, reset, formDefaults]);

  const handleNavigateBack = () => {
    navigate(`${basePath}/${routeSegment}?tab=models`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitForm = (data: any, isDraft: boolean) => {
    if (!appraisalId) return;
    if (isEditMode && modelId) {
      updateModel(
        { appraisalId, modelId, data },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(isDraft ? 'Draft saved successfully' : 'Model updated successfully');
            setSaveAction(null);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? 'Failed to save draft' : 'Failed to update model'),
            );
            setSaveAction(null);
          },
        },
      );
    } else {
      createModel(
        { appraisalId, data },
        {
          onSuccess: response => {
            toast.success(isDraft ? 'Draft saved successfully' : 'Model saved successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/${routeSegment}/model/${response.id}`);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? 'Failed to save draft' : 'Failed to create model'),
            );
            setSaveAction(null);
          },
        },
      );
    }
  };

  const handleSave = handleSubmit(data => {
    setSaveAction('submit');
    submitForm(data, false);
  });

  const handleSaveDraft = () => {
    setSaveAction('draft');
    submitForm(getValues(), true);
  };

  if (isLoading || (isEditMode && !modelData)) {
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
          containerId="model-form-scroll"
          anchors={[
            { label: 'Images', id: 'model-images', icon: 'images' },
            { label: 'Model Info', id: 'model-info', icon: 'layer-group' },
            { label: 'Remark', id: 'remark', icon: 'comment' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={schema}>
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
          <div
            id="model-form-scroll"
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
                  {/* Model Images */}
                  <Section id="model-images" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Model Images</h2>
                    </div>
                    <div className="h-px bg-gray-200 mb-4" />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-12 gap-3">
                      <Icon name="images" style="regular" className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-400">Image upload coming soon</p>
                      {modelData?.imageDocumentIds && modelData.imageDocumentIds.length > 0 && (
                        <div className="flex gap-2 flex-wrap justify-center mt-2">
                          {modelData.imageDocumentIds.map(docId => (
                            <div
                              key={docId}
                              className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500 overflow-hidden"
                            >
                              <Icon name="image" style="regular" className="w-6 h-6 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Model Information */}
                  <Section id="model-info" anchor className="min-w-0 overflow-hidden">
                    <ModelDetailForm projectType={projectType} />
                  </Section>
                </div>
              </ResizableSidebar.Main>
            </ResizableSidebar>
          </div>

          {/* Action Bar */}
          <ActionBar>
            <ActionBar.Left>
              <Button variant="ghost" type="button" onClick={handleNavigateBack}>
                Cancel
              </Button>
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
    </div>
  );
}

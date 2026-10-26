import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import useBreadcrumbExtras from '@/shared/hooks/useBreadcrumbExtras';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import type { ApiError } from '@/shared/types/api';

import {
  useGetProjectModelById,
  useCreateProjectModel,
  useUpdateProjectModel,
  useDeleteProjectModel,
} from '../api/projectModel';
import ConfirmDialog from '@/shared/components/ConfirmDialog';
import DeleteButton from '@/shared/components/buttons/DeleteButton';
import { useGetProjectTowers } from '../api/projectTower';
import ModelDetailForm from '../forms/ModelDetailForm';
import ProjectModelPhotoSection, {
  type ProjectModelPhotoSectionRef,
} from '../components/ProjectModelPhotoSection';
import {
  projectModelForm,
  condoModelFormDefaults,
  lbModelFormDefaults,
  type CondoModelFormType,
  type LbModelFormType,
} from '../schemas/form';
import { CondoDetailShell } from '../components/condo/towersModels/CondoDetailShell';
import { ModelPricingButton } from '../components/condo/towersModels/ModelPricingButton';
import { VillageModelFacts } from '../components/condo/towersModels/VillageModelFacts';
import { isCondo } from '../types';
import type { ProjectType } from '../types';
import { mapSurfacesToApi } from '@/features/appraisal/utils/mappers';

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
  const { t } = useTranslation('blockProject');
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { modelId } = useParams<{ modelId?: string }>();

  const isEditMode = Boolean(modelId);
  const routeSegment = isCondo(projectType) ? 'block-condo' : 'block-village';
  const schema = useMemo(() => projectModelForm(projectType), [projectType]);
  const location = useLocation();

  const { data: modelData, isLoading } = useGetProjectModelById(appraisalId ?? '', modelId);

  // Structural "Property Information → Model" parents come from the URL (layout).
  // Only push the dynamic model name here; "New Model" is handled by the layout.
  const modelLeafLabel = isEditMode ? modelData?.modelName?.trim() || '...' : null;
  useBreadcrumbExtras(
    modelLeafLabel
      ? [
          {
            label: modelLeafLabel,
            href: location.pathname,
            icon: isCondo(projectType) ? 'layer-group' : 'house',
          },
        ]
      : [],
    [modelLeafLabel, location.pathname, projectType],
  );
  // Condo: fetch towers for the tower selector on the model form
  const { data: towersData } = useGetProjectTowers(appraisalId ?? '');
  const towers = isCondo(projectType) ? (towersData ?? []) : [];

  const { mutate: createModel, isPending: isCreating } = useCreateProjectModel();
  const { mutate: updateModel, isPending: isUpdating } = useUpdateProjectModel();
  const { mutate: deleteModel, isPending: isDeleting } = useDeleteProjectModel();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const photoSectionRef = useRef<ProjectModelPhotoSectionRef>(null);

  const formDefaults = useMemo(() => {
    if (isEditMode && modelData) {
      if (isCondo(projectType)) {
        return {
          modelName: modelData.modelName ?? '',
          modelDescription: modelData.modelDescription ?? null,
          projectTowerId: modelData.projectTowerId ?? null,
          startingPriceMin: modelData.startingPriceMin ?? null,
          startingPriceMax: modelData.startingPriceMax ?? null,
          hasMezzanine: modelData.hasMezzanine ?? false,
          usableAreaMin: modelData.usableAreaMin ?? null,
          usableAreaMax: modelData.usableAreaMax ?? null,
          standardUsableArea: modelData.standardUsableArea ?? null,
          fireInsuranceCode: modelData.fireInsuranceCode ?? null,
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
        startingPriceMin: modelData.startingPriceMin ?? null,
        startingPriceMax: modelData.startingPriceMax ?? null,
        usableAreaMin: modelData.usableAreaMin ?? null,
        usableAreaMax: modelData.usableAreaMax ?? null,
        standardUsableArea: modelData.standardUsableArea ?? null,
        landAreaMin: modelData.landAreaMin ?? null,
        landAreaMax: modelData.landAreaMax ?? null,
        standardLandArea: modelData.standardLandArea ?? null,
        fireInsuranceCode: modelData.fireInsuranceCode ?? null,
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
        surfaces: [...(modelData.surfaces ?? [])].sort(
          (a, b) => (a.fromFloorNumber ?? 0) - (b.fromFloorNumber ?? 0),
        ),
        depreciationDetails: modelData.depreciationDetails ?? [],
      } satisfies Partial<LbModelFormType>;
    }
    return isCondo(projectType) ? condoModelFormDefaults : lbModelFormDefaults;
  }, [isEditMode, modelData, projectType]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    defaultValues: formDefaults,
    resolver: zodResolver(schema),
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
    if (isEditMode && modelData) {
      reset(formDefaults);
    }
  }, [isEditMode, modelData, reset, formDefaults]);

  const handleNavigateBack = () => {
    navigate(`${basePath}/${routeSegment}?tab=models`);
  };

  const handleDelete = () => {
    if (!appraisalId || !modelId) return;
    deleteModel(
      { appraisalId, modelId },
      {
        onSuccess: () => {
          toast.success(t('toasts.model.deleteSuccess'));
          skipWarning();
          navigate(`${basePath}/${routeSegment}?tab=models`);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.model.deleteFailed'));
          setIsDeleteDialogOpen(false);
        },
      },
    );
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitForm = (data: any, isDraft: boolean) => {
    if (!appraisalId) return;
    const payload = data.surfaces ? { ...data, surfaces: mapSurfacesToApi(data.surfaces) } : data;
    if (isEditMode && modelId) {
      updateModel(
        { appraisalId, modelId, data: payload },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(
              isDraft ? t('toasts.model.saveDraftSuccess') : t('toasts.model.updateSuccess'),
            );
            setSaveAction(null);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? t('toasts.model.saveDraftFailed') : t('toasts.model.updateFailed')),
            );
            setSaveAction(null);
          },
        },
      );
    } else {
      createModel(
        { appraisalId, data: payload },
        {
          onSuccess: async response => {
            await photoSectionRef.current?.linkImagesToModel(response.id);
            toast.success(
              isDraft ? t('toasts.model.saveDraftSuccess') : t('toasts.model.saveSuccess'),
            );
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/${routeSegment}/model/${response.id}`);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? t('toasts.model.saveDraftFailed') : t('toasts.model.createFailed')),
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
        <Icon
          name="spinner"
          style="solid"
          className="w-8 h-8 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  }

  const footer = (
    <>
      {/* Action Bar */}
      <ActionBar>
        <ActionBar.Left>
          <Button variant="ghost" type="button" onClick={handleNavigateBack}>
            {t('actions.cancel')}
          </Button>
          {isEditMode && !isReadOnly && (
            <DeleteButton
              onClick={() => setIsDeleteDialogOpen(true)}
              disabled={isPending || isDeleting}
            />
          )}
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
              {t('actions.saveDraft')}
            </Button>
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

      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('dialogs.deleteModel.title')}
        message={t('dialogs.deleteModel.message')}
        confirmText={t('dialogs.deleteModel.confirm')}
        isLoading={isDeleting}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );

  const savedModel = isEditMode ? modelData : undefined;
  // The pricing action sits at the right end of the "Model information" section head, in Condo and
  // Land and Building alike. Never "calculate" on a read-only page.
  const pricingAction =
    savedModel && (!isReadOnly || savedModel.pricingAnalysisId) ? (
      <ModelPricingButton model={savedModel} projectType={projectType} />
    ) : undefined;
  // Land and Building: the model's figures, quiet text in that same head.
  const facts =
    !isCondo(projectType) && savedModel ? <VillageModelFacts model={savedModel} /> : undefined;

  return (
    <CondoDetailShell
      methods={methods}
      schema={schema}
      onSubmit={handleSave}
      photos={renderGallery => (
        <ProjectModelPhotoSection
          ref={photoSectionRef}
          appraisalId={appraisalId ?? ''}
          entityId={modelId}
          images={modelData?.images}
          renderGallery={renderGallery}
        />
      )}
      footer={footer}
    >
      <ModelDetailForm
        projectType={projectType}
        towers={towers}
        pricingAction={pricingAction}
        facts={facts}
      />
    </CondoDetailShell>
  );
}

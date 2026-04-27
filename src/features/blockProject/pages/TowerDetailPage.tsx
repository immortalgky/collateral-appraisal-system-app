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
  useGetProjectTowerById,
  useCreateProjectTower,
  useUpdateProjectTower,
} from '../api/projectTower';
import { useGetProjectModels } from '../api/projectModel';
import TowerDetailForm from '../forms/TowerDetailForm';
import { projectTowerForm, projectTowerFormDefaults, type ProjectTowerFormType } from '../schemas/form';

type AppError = AxiosError & { apiError?: ApiError };

/**
 * Condo-only tower detail page.
 * Navigation back goes to block-condo?tab=towers.
 * On create navigates to block-condo/tower/:id.
 */
export default function TowerDetailPage() {
  const isReadOnly = usePageReadOnly();
  const navigate = useNavigate();
  const basePath = useBasePath();
  const appraisalId = useAppraisalId();
  const { towerId } = useParams<{ towerId?: string }>();

  const isEditMode = Boolean(towerId);

  const { data: towerData, isLoading } = useGetProjectTowerById(appraisalId ?? '', towerId);
  const { data: modelsData } = useGetProjectModels(appraisalId ?? '');
  const models = Array.isArray(modelsData) ? modelsData : [];

  const { mutate: createTower, isPending: isCreating } = useCreateProjectTower();
  const { mutate: updateTower, isPending: isUpdating } = useUpdateProjectTower();

  const isPending = isCreating || isUpdating;
  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  const formDefaults = useMemo<ProjectTowerFormType>(() => {
    if (isEditMode && towerData) {
      return {
        towerName: towerData.towerName ?? null,
        numberOfUnits: towerData.numberOfUnits ?? 0,
        numberOfFloors: towerData.numberOfFloors ?? 0,
        condoRegistrationNumber: towerData.condoRegistrationNumber ?? '',
        modelTypeIds: towerData.modelTypeIds ?? [],
        conditionType: towerData.conditionType ?? null,
        hasObligation: towerData.hasObligation ?? false,
        obligationDetails: towerData.obligationDetails ?? null,
        documentValidationType: towerData.documentValidationType ?? null,
        isLocationCorrect: towerData.isLocationCorrect ?? true,
        distance: towerData.distance ?? null,
        roadWidth: towerData.roadWidth ?? null,
        rightOfWay: towerData.rightOfWay ?? null,
        roadSurfaceType: towerData.roadSurfaceType ?? null,
        roadSurfaceTypeOther: towerData.roadSurfaceTypeOther ?? null,
        decorationType: towerData.decorationType ?? null,
        decorationTypeOther: towerData.decorationTypeOther ?? null,
        constructionYear: towerData.constructionYear ?? null,
        totalNumberOfFloors: towerData.totalNumberOfFloors ?? null,
        buildingFormType: towerData.buildingFormType ?? null,
        constructionMaterialType: towerData.constructionMaterialType ?? null,
        groundFloorMaterialType: towerData.groundFloorMaterialType ?? null,
        groundFloorMaterialTypeOther: towerData.groundFloorMaterialTypeOther ?? null,
        upperFloorMaterialType: towerData.upperFloorMaterialType ?? null,
        upperFloorMaterialTypeOther: towerData.upperFloorMaterialTypeOther ?? null,
        bathroomFloorMaterialType: towerData.bathroomFloorMaterialType ?? null,
        bathroomFloorMaterialTypeOther: towerData.bathroomFloorMaterialTypeOther ?? null,
        roofType: towerData.roofType ?? [],
        roofTypeOther: towerData.roofTypeOther ?? null,
        isExpropriated: towerData.isExpropriated ?? false,
        expropriationRemark: towerData.expropriationRemark ?? null,
        isInExpropriationLine: towerData.isInExpropriationLine ?? false,
        royalDecree: towerData.royalDecree ?? null,
        isForestBoundary: towerData.isForestBoundary ?? false,
        forestBoundaryRemark: towerData.forestBoundaryRemark ?? null,
        remark: towerData.remark ?? null,
      };
    }
    return projectTowerFormDefaults;
  }, [isEditMode, towerData]);

  const methods = useForm<ProjectTowerFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(projectTowerForm),
  });

  const { handleSubmit, getValues, reset, formState: { dirtyFields } } = methods;
  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { isOpen, onToggle } = useDisclosure();

  useEffect(() => {
    if (isEditMode && towerData) {
      reset(formDefaults);
    }
  }, [isEditMode, towerData, reset, formDefaults]);

  const handleNavigateBack = () => {
    navigate(`${basePath}/block-condo?tab=towers`);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const submitForm = (data: any, isDraft: boolean) => {
    if (!appraisalId) return;
    if (isEditMode && towerId) {
      updateTower(
        { appraisalId, towerId, data },
        {
          onSuccess: () => {
            reset(getValues());
            toast.success(isDraft ? 'Draft saved successfully' : 'Tower updated successfully');
            setSaveAction(null);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? 'Failed to save draft' : 'Failed to update tower'),
            );
            setSaveAction(null);
          },
        },
      );
    } else {
      createTower(
        { appraisalId, data },
        {
          onSuccess: response => {
            toast.success(isDraft ? 'Draft saved successfully' : 'Tower saved successfully');
            setSaveAction(null);
            skipWarning();
            navigate(`${basePath}/block-condo/tower/${response.id}`);
          },
          onError: (err: unknown) => {
            const error = err as AppError;
            toast.error(
              error?.apiError?.detail ??
                (isDraft ? 'Failed to save draft' : 'Failed to create tower'),
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

  if (isLoading || (isEditMode && !towerData)) {
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
          containerId="tower-form-scroll"
          anchors={[
            { label: 'Images', id: 'tower-images', icon: 'images' },
            { label: 'Tower Info', id: 'tower-info', icon: 'building' },
            { label: 'Remark', id: 'tower-remark', icon: 'comment' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={projectTowerForm}>
        <form onSubmit={handleSave} className="flex-1 min-h-0 flex flex-col">
          <div
            id="tower-form-scroll"
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
                  {/* Tower Images */}
                  <Section id="tower-images" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <Icon name="images" style="solid" className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Tower Images</h2>
                    </div>
                    <div className="h-px bg-gray-200 mb-4" />
                    <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 flex flex-col items-center justify-center py-12 gap-3">
                      <Icon name="images" style="regular" className="w-10 h-10 text-gray-300" />
                      <p className="text-sm text-gray-400">Image upload coming soon</p>
                      {towerData?.imageDocumentIds && towerData.imageDocumentIds.length > 0 && (
                        <div className="flex gap-2 flex-wrap justify-center mt-2">
                          {towerData.imageDocumentIds.map(docId => (
                            <div
                              key={docId}
                              className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center"
                            >
                              <Icon name="image" style="regular" className="w-6 h-6 text-gray-400" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </Section>

                  {/* Tower Information */}
                  <Section id="tower-info" anchor className="min-w-0 overflow-hidden">
                    <TowerDetailForm models={models} />
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

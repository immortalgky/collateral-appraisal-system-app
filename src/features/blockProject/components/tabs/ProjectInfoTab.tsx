import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId, useBasePath } from '@/features/appraisal/context/AppraisalContext';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@/shared/components/form';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import CancelButton from '@/shared/components/buttons/CancelButton';
import type { ApiError } from '@/shared/types/api';

import { useGetProject, useSaveProject } from '../../api/project';
import { isCondo } from '../../types';
import type { ProjectType } from '../../types';
import ProjectInfoForm from '../../forms/ProjectInfoForm';
import ChangeProjectTypeDialog, { type ChildCounts } from '../ChangeProjectTypeDialog';
import {
  condoProjectInfoFormDefaults,
  lbProjectInfoFormDefaults,
  projectInfoForm,
} from '../../schemas/form';

type AppError = AxiosError & { apiError?: ApiError };

interface ProjectInfoTabProps {
  projectType: ProjectType;
  hasExistingProject: boolean;
  childCounts: ChildCounts;
}

/**
 * Merged ProjectInfo tab for both Condo and LandAndBuilding.
 * Uses the correct schema factory based on projectType.
 */
export default function ProjectInfoTab({
  projectType,
  hasExistingProject,
  childCounts,
}: ProjectInfoTabProps) {
  const { t } = useTranslation('blockProject');
  const appraisalId = useAppraisalId();
  const basePath = useBasePath();
  const isReadOnly = usePageReadOnly();

  const [pendingType, setPendingType] = useState<ProjectType | null>(null);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);

  // Defensive: clears pending selection if projectType prop changes without unmount.
  // Under normal flow the router navigates to a new route on type change, which
  // remounts this component and resets state automatically.
  useEffect(() => {
    setPendingType(null);
  }, [projectType]);

  const schema = projectInfoForm(projectType);
  const defaults = isCondo(projectType) ? condoProjectInfoFormDefaults : lbProjectInfoFormDefaults;

  const { data: project, isLoading } = useGetProject(appraisalId ?? '', projectType);
  const { mutate: saveProject, isPending } = useSaveProject();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const methods = useForm<any>({
    resolver: zodResolver(schema),
    defaultValues: defaults,
  });

  const {
    handleSubmit,
    getValues,
    reset,
    formState: { isDirty },
  } = methods;

  useEffect(() => {
    if (project) {
      if (isCondo(projectType)) {
        reset({
          projectName: project.projectName ?? '',
          projectDescription: project.projectDescription ?? null,
          developer: project.developer ?? null,
          projectSaleLaunchDate: project.projectSaleLaunchDate ?? null,
          landAreaRai: project.landAreaRai ?? null,
          landAreaNgan: project.landAreaNgan ?? null,
          landAreaSquareWa: project.landAreaSquareWa ?? null,
          unitForSaleCount: project.unitForSaleCount ?? null,
          landOffice: project.landOffice ?? '',
          projectType: '', // placeholder; stamped from the route prop at submit (see line ~144)
          numberOfPhase: project.numberOfPhase ?? null,
          houseNumber: project.houseNumber ?? null,
          road: project.road ?? null,
          soi: project.soi ?? null,
          subDistrict: project.subDistrict ?? null,
          district: project.district ?? null,
          province: project.province ?? null,
          postcode: project.postcode ?? null,
          latitude: project.latitude ?? null,
          longitude: project.longitude ?? null,
          builtOnTitleDeedNumber: project.builtOnTitleDeedNumber ?? null,
          utilities: project.utilities ?? [],
          utilitiesOther: project.utilitiesOther ?? null,
          facilities: project.facilities ?? [],
          facilitiesOther: project.facilitiesOther ?? null,
          remark: project.remark ?? null,
        });
      } else {
        reset({
          projectName: project.projectName ?? '',
          projectDescription: project.projectDescription ?? null,
          developer: project.developer ?? null,
          projectSaleLaunchDate: project.projectSaleLaunchDate ?? null,
          landAreaRai: project.landAreaRai ?? null,
          landAreaNgan: project.landAreaNgan ?? null,
          landAreaSquareWa: project.landAreaSquareWa ?? null,
          unitForSaleCount: project.unitForSaleCount ?? null,
          landOffice: project.landOffice ?? '',
          projectType: '', // placeholder; stamped from the route prop at submit (see line ~144)
          numberOfPhase: project.numberOfPhase ?? null,
          houseNumber: project.houseNumber ?? null,
          road: project.road ?? null,
          soi: project.soi ?? null,
          subDistrict: project.subDistrict ?? null,
          district: project.district ?? null,
          province: project.province ?? null,
          postcode: project.postcode ?? null,
          latitude: project.latitude ?? null,
          longitude: project.longitude ?? null,
          licenseExpirationDate: project.licenseExpirationDate ?? null,
          utilities: project.utilities ?? [],
          utilitiesOther: project.utilitiesOther ?? null,
          facilities: project.facilities ?? [],
          facilitiesOther: project.facilitiesOther ?? null,
          remark: project.remark ?? null,
        });
      }
    }
  }, [project, reset, projectType]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onSubmit = (data: any, isDraft = false) => {
    if (!appraisalId) return;
    // If user changed project type, confirm via dialog before saving
    if (pendingType !== null) {
      setIsTypeDialogOpen(true);
      return;
    }
    saveProject(
      { appraisalId, data: { ...data, projectType }, isDraft },
      {
        onSuccess: () => {
          toast.success(
            isDraft ? t('toasts.project.saveDraftSuccess') : t('toasts.project.saveSuccess'),
          );
          reset(data);
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.project.saveFailed'));
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon name="spinner" style="solid" className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <FormProvider methods={methods} schema={schema}>
        <form
          onSubmit={handleSubmit(data => onSubmit(data, false))}
          className="flex flex-col h-full min-h-0"
        >
          <div className="flex-1 min-h-0 overflow-y-auto pb-4">
            <ProjectInfoForm
              projectType={projectType}
              pendingType={pendingType}
              hasExistingProject={hasExistingProject}
              onProjectTypeChange={setPendingType}
            />
          </div>

          <ActionBar>
            <ActionBar.Left>
              <CancelButton />
              {!isReadOnly && (
                <>
                  <ActionBar.Divider />
                  <ActionBar.UnsavedIndicator show={isDirty} />
                </>
              )}
            </ActionBar.Left>
            {!isReadOnly && (
              <ActionBar.Right>
                <Button
                  variant="ghost"
                  type="button"
                  onClick={() => onSubmit(getValues(), true)}
                  isLoading={isPending}
                  disabled={isPending}
                >
                  <Icon name="floppy-disk" style="regular" className="size-4 mr-2" />
                  Save Draft
                </Button>
                <Button type="submit" isLoading={isPending} disabled={isPending}>
                  <Icon name="check" style="solid" className="size-4 mr-2" />
                  Save
                </Button>
              </ActionBar.Right>
            )}
          </ActionBar>
        </form>
      </FormProvider>

      {appraisalId && isTypeDialogOpen && (
        <ChangeProjectTypeDialog
          isOpen={isTypeDialogOpen}
          onClose={() => setIsTypeDialogOpen(false)}
          currentProjectType={projectType}
          appraisalId={appraisalId}
          basePath={basePath ?? ''}
          childCounts={childCounts}
        />
      )}
    </>
  );
}

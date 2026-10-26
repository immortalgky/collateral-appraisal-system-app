import { useEffect, useMemo, useState } from 'react';
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
import { findAddressBySubDistrictCode } from '@/shared/data/thaiAddresses';
import type { ApiError } from '@/shared/types/api';

import { useGetProject, useSaveProject } from '../../api/project';
import { isCondo } from '../../types';
import type { ProjectType } from '../../types';
import ProjectInfoForm from '../../forms/ProjectInfoForm';
import { CondoFrame } from '../condo';
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
 * Merged ProjectInfo tab for Condo, LandAndBuilding and Land.
 * Uses the correct schema factory based on projectType, which BlockProjectPage resolves from the
 * stored project (so a Land project on the village route loads and saves as 'L').
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

  const schema = useMemo(() => projectInfoForm(projectType), [projectType]);
  const defaults = isCondo(projectType) ? condoProjectInfoFormDefaults : lbProjectInfoFormDefaults;

  const { data: project, isLoading } = useGetProject(appraisalId ?? '');
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
      // The names are display-only and normally written by the location selector, which a read page
      // does not mount. Any source, as the field's resolveFromAnySource does.
      const address = project.subDistrict
        ? findAddressBySubDistrictCode(project.subDistrict)
        : undefined;
      const locationNames = {
        subDistrictName: address?.subDistrictName ?? null,
        districtName: address?.districtName ?? null,
        provinceName: address?.provinceName ?? null,
      };
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
          projectType: '', // placeholder; stamped from the stored type at submit (see onSubmit)
          numberOfPhase: project.numberOfPhase ?? null,
          isUnderConstruction: project.isUnderConstruction ?? null,
          constructionProgressPercent: project.constructionProgressPercent ?? null,
          houseNumber: project.houseNumber ?? null,
          road: project.road ?? null,
          soi: project.soi ?? null,
          subDistrict: project.subDistrict ?? null,
          district: project.district ?? null,
          province: project.province ?? null,
          postcode: project.postcode ?? null,
          ...locationNames,
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
          projectType: '', // placeholder; stamped from the stored type at submit (see onSubmit)
          numberOfPhase: project.numberOfPhase ?? null,
          isUnderConstruction: project.isUnderConstruction ?? null,
          constructionProgressPercent: project.constructionProgressPercent ?? null,
          houseNumber: project.houseNumber ?? null,
          road: project.road ?? null,
          soi: project.soi ?? null,
          subDistrict: project.subDistrict ?? null,
          district: project.district ?? null,
          province: project.province ?? null,
          postcode: project.postcode ?? null,
          ...locationNames,
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
      <CondoFrame>
        <div className="flex items-center justify-center h-64">
          <Icon
            name="spinner"
            style="solid"
            className="w-8 h-8 animate-spin text-(--palette-accent-ink)"
          />
        </div>
      </CondoFrame>
    );
  }

  const infoForm = (
    <ProjectInfoForm
      projectType={projectType}
      pendingType={pendingType}
      hasExistingProject={hasExistingProject}
      onProjectTypeChange={setPendingType}
    />
  );

  const actionBar = (
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
            {t('actions.saveDraft')}
          </Button>
          <Button type="submit" isLoading={isPending} disabled={isPending}>
            <Icon name="check" style="solid" className="size-4 mr-2" />
            {t('actions.save')}
          </Button>
        </ActionBar.Right>
      )}
    </ActionBar>
  );

  return (
    <>
      <FormProvider methods={methods} schema={schema}>
        <CondoFrame
          as="form"
          onSubmit={handleSubmit(data => onSubmit(data, false))}
          panelId="project-info-section"
          footer={actionBar}
        >
          {infoForm}
        </CondoFrame>
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

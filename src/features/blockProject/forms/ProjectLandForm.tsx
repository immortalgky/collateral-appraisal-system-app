import { useEffect, useMemo, useState } from 'react';
import { type SubmitHandler, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetProjectLand, useSaveProjectLand } from '../api/projectLand';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormLayoutProvider, FormProvider } from '@shared/components/form';
import { FormShell } from '@/features/appraisal/components/FormShell';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import TitleDeedForm from '@/features/appraisal/forms/TitleDeedForm';
import BlockLandDetailForm from './BlockLandDetailForm';
import {
  createLandFormDefault,
  createProjectLandForm,
  type createLandFormType,
  type createProjectLandFormType,
} from '@/features/appraisal/schemas/form';
import { mapProjectLandPropertyResponseToForm } from '@/features/appraisal/utils/mappers';
import { toRaiNganWa } from '@/features/appraisal/utils/areaFormat';
import { toSquareWa } from '@/shared/utils/landArea';
import { formatNumber } from '@/shared/utils/formatUtils';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

/**
 * LandAndBuilding-only project land form.
 *
 * Sits on the same shell body as `CreateLandPage` (`FormShellBody`: the form, and the section TOC in
 * the rail when wide, no photos) and reuses the appraisal feature's `TitleDeedForm`, so the Block
 * Village land flow has the same UX as the Property Land flow. Persistence is wired to BV's
 * PUT /project/land endpoint.
 */
export default function ProjectLandForm() {
  const { t } = useTranslation('blockProject');
  const isReadOnly = usePageReadOnly();
  const appraisalId = useAppraisalId();

  const { data: landData, isLoading } = useGetProjectLand(appraisalId ?? '');
  const { mutate: saveLand, isPending } = useSaveProjectLand();

  const [saveAction, setSaveAction] = useState<'draft' | 'submit' | null>(null);

  // Hydrate from BV's ProjectLand DTO. Field shapes mirror GetLandPropertyResponse
  // closely enough that the appraisal mapper handles them; cast through `any` to
  // avoid a tight coupling to the appraisal response type.
  const formDefaults = useMemo(() => {
    if (landData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return mapProjectLandPropertyResponseToForm(landData as any);
    }
    return { ...createLandFormDefault, ownerName: '', isOwnerVerified: true };
  }, [landData]);

  const methods = useForm<createProjectLandFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createProjectLandForm),
  });
  const {
    control,
    handleSubmit,
    getValues,
    reset,
    formState: { dirtyFields },
  } = methods;

  // The section head's summary follows the table as it is edited (rows are added before Save).
  const titles = useWatch({ control, name: 'titles' }) as
    | { rai?: unknown; ngan?: unknown; squareWa?: unknown }[]
    | undefined;
  const titlesWa = (titles ?? []).reduce(
    (sum, row) => sum + toSquareWa(row.rai, row.ngan, row.squareWa),
    0,
  );

  const hasDirtyFields = Object.keys(dirtyFields).length > 0;
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);

  useEffect(() => {
    if (landData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reset(mapProjectLandPropertyResponseToForm(landData as any));
    }
  }, [landData, reset]);

  const persist = (data: createLandFormType, isDraft: boolean) => {
    if (!appraisalId) return;
    setSaveAction(isDraft ? 'draft' : 'submit');
    saveLand(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { appraisalId, data: data as any },
      {
        onSuccess: () => {
          reset(getValues());
          toast.success(isDraft ? t('toasts.land.saveDraftSuccess') : t('toasts.land.saveSuccess'));
          setSaveAction(null);
          if (!isDraft) skipWarning();
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? t('toasts.land.saveFailed'));
          setSaveAction(null);
        },
      },
    );
  };

  const onSubmit: SubmitHandler<createLandFormType> = data => persist(data, false);
  const handleSaveDraft = () => persist(getValues(), true);

  if (isLoading) {
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

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Block pages are always the Standard layout, whatever the user's setting. */}
      <FormLayoutProvider layout="standard">
        <FormProvider methods={methods} schema={createProjectLandForm}>
          <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
            {/* The property shell without photos: the form, and the section TOC in the rail when
              wide. Nothing is pinned above it, so sections scroll to the top edge. */}
            <FormShell bodyClassName="pb-4">
              <div className="flex flex-col gap-6 min-w-0">
                {/* A project land does not store title order, so no order controls. */}
                <TitleDeedForm
                  orderable={false}
                  hint={t('landDetail.titlesSummary', {
                    n: formatNumber(titles?.length ?? 0),
                    rnw: toRaiNganWa(titlesWa),
                    wa: formatNumber(titlesWa, 2),
                  })}
                />
                <BlockLandDetailForm />
              </div>
            </FormShell>

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

            <UnsavedChangesDialog blocker={blocker} />
          </form>
        </FormProvider>
      </FormLayoutProvider>
    </div>
  );
}

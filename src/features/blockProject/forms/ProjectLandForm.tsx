import { useEffect, useMemo, useState } from 'react';
import { type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import type { AxiosError } from 'axios';

import { useAppraisalId } from '@/features/appraisal/context/AppraisalContext';
import { useGetProjectLand, useSaveProjectLand } from '../api/projectLand';
import { usePageReadOnly } from '@/shared/contexts/PageReadOnlyContext';
import { FormProvider } from '@shared/components/form';
import { useDisclosure } from '@/shared/hooks/useDisclosure';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import ResizableSidebar from '@/shared/components/ResizableSidebar';
import NavAnchors from '@/shared/components/sections/NavAnchors';
import Section from '@/shared/components/sections/Section';
import ActionBar from '@/shared/components/ActionBar';
import CancelButton from '@/shared/components/buttons/CancelButton';
import Button from '@/shared/components/Button';
import Icon from '@/shared/components/Icon';
import TitleDeedForm from '@/features/appraisal/forms/TitleDeedForm';
import BlockLandDetailForm from './BlockLandDetailForm';
import {
  createLandForm,
  createLandFormDefault,
  type createLandFormType,
} from '@/features/appraisal/schemas/form';
import { mapLandPropertyResponseToForm } from '@/features/appraisal/utils/mappers';
import type { ApiError } from '@/shared/types/api';

type AppError = AxiosError & { apiError?: ApiError };

/**
 * LandAndBuilding-only project land form.
 *
 * Mirrors the structure of `CreateLandPage` (NavAnchors + ResizableSidebar +
 * Section blocks + ActionBar) and reuses the appraisal feature's `TitleDeedForm`
 * and `LandDetailForm`, so the Block Village land flow has the same UX as the
 * Property Land flow. Persistence is wired to BV's PUT /project/land endpoint.
 */
export default function ProjectLandForm() {
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
      return mapLandPropertyResponseToForm(landData as any);
    }
    return createLandFormDefault;
  }, [landData]);

  const methods = useForm<createLandFormType>({
    defaultValues: formDefaults,
    resolver: zodResolver(createLandForm),
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
    if (landData) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      reset(mapLandPropertyResponseToForm(landData as any));
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
          toast.success(isDraft ? 'Draft saved successfully' : 'Project land saved');
          setSaveAction(null);
          if (!isDraft) skipWarning();
        },
        onError: (err: unknown) => {
          const error = err as AppError;
          toast.error(error?.apiError?.detail ?? 'Failed to save project land');
          setSaveAction(null);
        },
      },
    );
  };

  const onSubmit: SubmitHandler<createLandFormType> = data => persist(data, false);
  const handleSaveDraft = () => persist(getValues(), true);

  const { isOpen, onToggle } = useDisclosure();

  if (isLoading) {
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
          containerId="project-land-scroll-container"
          anchors={[
            { label: 'Land Title', id: 'land-title', icon: 'file-lines' },
            { label: 'Land Detail', id: 'land-info', icon: 'mountain-sun' },
          ]}
        />
      </div>

      <FormProvider methods={methods} schema={createLandForm}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          {/* Scrollable Form Content */}
          <div
            id="project-land-scroll-container"
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
                  {/* Land Information Header */}
                  <Section id="properties-section" anchor>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
                        <Icon
                          name="mountain-sun"
                          style="solid"
                          className="w-5 h-5 text-amber-600"
                        />
                      </div>
                      <h2 className="text-lg font-semibold text-gray-900">Land Information</h2>
                    </div>
                    <div className="h-px bg-gray-200" />
                  </Section>

                  {/* Title Deeds */}
                  <Section
                    id="land-title"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <TitleDeedForm />
                  </Section>

                  {/* Land Detail */}
                  <Section
                    id="land-info"
                    anchor
                    className="flex flex-col gap-6 min-w-0 overflow-hidden"
                  >
                    <BlockLandDetailForm />
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

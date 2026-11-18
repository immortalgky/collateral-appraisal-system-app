import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import type { z } from 'zod';
import {
  FormFields,
  FormLayoutProvider,
  FormProvider,
  FormSection,
  FormSheet,
  type FormField,
} from '@shared/components/form';
import ActionBar from '@/shared/components/ActionBar';
import Button from '@/shared/components/Button';
import DataErrorState from '@/shared/components/DataErrorState';
import Icon from '@/shared/components/Icon';
import UnsavedChangesDialog from '@/shared/components/UnsavedChangesDialog';
import { useUnsavedChangesWarning } from '@/shared/hooks/useUnsavedChangesWarning';
import { EditorHeader } from '@/features/appraisal/components/EditorHeader';
import type { PropertyCorrectionDtoType } from '@shared/schemas/v1';
import {
  useCorrectProjectData,
  type ProjectCorrectionTarget,
} from '../../api/appraisalDataCorrection';
import { diffFormValues, type DiffEntry } from '../../utils/formDiff';
import { readApiError } from '../../utils/readApiError';
import { withReason } from '../../utils/withReason';
import CorrectionConfirmDialog from '../CorrectionConfirmDialog';
import { EditorScroller, hasEdit } from '../EditorScroller';
import LatestCorrectionCard from '../LatestCorrectionCard';

/** What the editor needs of the record's query; a refetch is started on mount (see below). */
export interface ProjectRecordQuery<T> {
  data: T | null | undefined;
  isError: boolean;
  dataUpdatedAt: number;
  refetch: () => unknown;
}

interface ProjectCorrectionEditorProps<T> {
  appraisalId: string;
  target: ProjectCorrectionTarget;
  /** The model or tower, for those two targets. */
  targetId?: string;
  record: ProjectRecordQuery<T>;
  /** The block page's own schema for this form. */
  schema: z.ZodTypeAny;
  /** The block page's own record-to-form mapper. */
  toForm: (record: T) => Record<string, unknown>;
  /** The body the block page's PUT sends. Defaults to the form values as they are. */
  toPayload?: (values: Record<string, unknown>) => unknown;
  title: string;
  titleMuted?: boolean;
  badge?: ReactNode;
  /** Undefined until the history has loaded. */
  editCount: number | undefined;
  latestEdit: PropertyCorrectionDtoType | undefined;
  onOpenHistory: () => void;
  onDirtyChange: (isDirty: boolean) => void;
  /** A model or tower: back to its list. */
  onBack?: () => void;
  /** The block page's form body (its FormSheet / FormSections). */
  children: ReactNode;
}

/**
 * Corrects one part of a block appraisal's project with the block page's own form: the project
 * counterpart of the property editor on this page, with the same rules. The record is refetched on
 * open (the save overwrites the whole part, so a cached copy would revert another admin's correction),
 * the schema is enforced in full, a reason is required, and the confirm dialog shows the diff.
 *
 * Block pages are always the Standard layout (DESIGN.md 17.1), and so is this editor.
 */
export function ProjectCorrectionEditor<T>({
  appraisalId,
  target,
  targetId,
  record,
  schema: pageSchema,
  toForm,
  toPayload = values => values,
  title,
  titleMuted,
  badge,
  editCount,
  latestEdit,
  onOpenHistory,
  onDirtyChange,
  onBack,
  children,
}: ProjectCorrectionEditorProps<T>) {
  const { t } = useTranslation('appraisalDataCorrection');
  const [pendingSubmit, setPendingSubmit] = useState<{
    reason: string;
    payload: unknown;
    diff: DiffEntry[];
  } | null>(null);

  const schema = useMemo(() => withReason(pageSchema, t('detail.reasonRequired')), [pageSchema, t]);

  // Fresh on open; `isFresh` rather than "fetched after mount", which a failed refetch also sets.
  const { data: raw, isError, dataUpdatedAt, refetch } = record;
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const isFresh = dataUpdatedAt >= mountedAt;

  const defaults = useMemo(() => {
    if (!raw || !isFresh) return undefined;
    return { ...toForm(raw), reason: '' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw, isFresh]);

  const methods = useForm<Record<string, unknown>>({
    defaultValues: defaults ?? { reason: '' },
    // See the property editor: the registry-wide schema type needs the cast zodResolver's overloads want.
    resolver: zodResolver(schema as never) as Resolver<Record<string, unknown>>,
  });
  const {
    handleSubmit,
    reset,
    getValues,
    formState: { dirtyFields },
  } = methods;

  // The record as loaded or as just saved: what Discard returns to and the diff is taken against.
  const baseline = useRef<Record<string, unknown> | undefined>(defaults);
  const hasDirtyFields = Object.entries(dirtyFields).some(([k, v]) => k !== 'reason' && hasEdit(v));
  useEffect(() => {
    if (!defaults) return;
    // A refetch (the one a save triggers) must not throw away field edits typed since then.
    if (baseline.current && hasDirtyFields) return;
    baseline.current = defaults;
    reset({ ...defaults, reason: getValues('reason') ?? '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaults]);

  useEffect(() => {
    onDirtyChange(hasDirtyFields);
    return () => onDirtyChange(false);
  }, [hasDirtyFields, onDirtyChange]);
  const { blocker, skipWarning } = useUnsavedChangesWarning(hasDirtyFields);
  const { mutate: correct, isPending } = useCorrectProjectData();

  if (isError && !defaults) return <DataErrorState onRetry={() => refetch()} />;

  // Nothing stored for this part (a project land never saved): there is nothing to correct.
  if (isFresh && raw === null) {
    return (
      <div className="flex items-center justify-center h-64 text-(--palette-gray-500)">
        {t('project.nothingSaved')}
      </div>
    );
  }

  if (!defaults) {
    return (
      <div className="flex items-center justify-center h-64">
        <Icon
          name="spinner"
          style="solid"
          className="size-8 animate-spin text-(--palette-primary-text)"
        />
      </div>
    );
  }

  // Read from the form, not the resolver's output: a zod object drops undeclared keys, and the
  // update is a full overwrite.
  const onSubmit = () => {
    const formValues = getValues();
    const diff = diffFormValues(baseline.current ?? defaults, formValues);
    if (diff.length === 0) {
      toast.error(t('detail.noChanges'));
      return;
    }
    const values = { ...formValues };
    delete values.reason;
    setPendingSubmit({
      reason: String(getValues('reason') ?? '').trim(),
      payload: toPayload(values),
      diff,
    });
  };

  const handleConfirm = () => {
    if (!pendingSubmit) return;
    correct(
      {
        appraisalId,
        target,
        targetId,
        reason: pendingSubmit.reason,
        data: pendingSubmit.payload,
      },
      {
        onSuccess: () => {
          toast.success(t('detail.saveSuccess'));
          setPendingSubmit(null);
          skipWarning();
          const saved = { ...getValues(), reason: '' };
          baseline.current = saved;
          reset(saved);
        },
        onError: error => {
          const { errorCode, detail } = readApiError(error);
          if (errorCode === 'APPRAISAL_NOT_COMPLETED')
            toast.error(t('detail.appraisalNotCompleted'));
          else if (errorCode === 'NO_CHANGES') toast.error(t('detail.noChangesSaved'));
          else toast.error(detail || t('detail.saveFailed'));
          setPendingSubmit(null);
        },
      },
    );
  };

  const reasonField: FormField = {
    type: 'textarea',
    label: t('confirmDialog.reasonLabel'),
    name: 'reason',
    required: true,
    maxLength: 4000,
    showCharCount: true,
    wrapperClassName: 'col-span-12',
  };

  return (
    <FormLayoutProvider layout="standard">
      <FormProvider methods={methods} schema={schema}>
        <form onSubmit={handleSubmit(onSubmit)} className="flex-1 min-h-0 flex flex-col">
          <EditorScroller pinned={false}>
            <EditorHeader
              badge={badge}
              title={title}
              titleMuted={titleMuted}
              facts={
                editCount !== undefined && (
                  <span>
                    {editCount > 0 ? t('edits.count', { count: editCount }) : t('edits.none')}
                  </span>
                )
              }
              actions={
                onBack && (
                  <Button type="button" variant="ghost" size="sm" onClick={onBack}>
                    <Icon name="arrow-left" style="solid" className="mr-1.5 text-xs" />
                    {t('project.backToList')}
                  </Button>
                )
              }
            />
            <div className="@container/form-shell px-3 pb-6 pt-[0.8571rem]">
              <div className="flex min-w-0 flex-col gap-[0.8571rem]">
                {latestEdit && (
                  <LatestCorrectionCard correction={latestEdit} onViewAll={onOpenHistory} />
                )}
                {children}
                <FormSheet>
                  <FormSection title={t('detail.reasonTitle')} icon="comment">
                    <FormFields fields={[reasonField]} />
                  </FormSection>
                </FormSheet>
              </div>
            </div>
          </EditorScroller>

          <ActionBar>
            <ActionBar.Left>
              <Button
                type="button"
                variant="ghost"
                onClick={() => reset(baseline.current ?? defaults)}
                disabled={!hasDirtyFields || isPending}
              >
                {t('detail.discard')}
              </Button>
            </ActionBar.Left>
            <ActionBar.Right>
              <Button type="submit" disabled={!hasDirtyFields || isPending}>
                {t('detail.submit')}
              </Button>
            </ActionBar.Right>
          </ActionBar>
        </form>

        <CorrectionConfirmDialog
          isOpen={pendingSubmit !== null}
          onClose={() => setPendingSubmit(null)}
          onConfirm={handleConfirm}
          diff={pendingSubmit?.diff ?? []}
          reason={pendingSubmit?.reason ?? ''}
          isLoading={isPending}
        />

        <UnsavedChangesDialog blocker={blocker} />
      </FormProvider>
    </FormLayoutProvider>
  );
}

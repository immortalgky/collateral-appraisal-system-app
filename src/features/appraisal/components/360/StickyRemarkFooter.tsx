import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CloseButton, Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import Icon from '@/shared/components/Icon';
import Button from '@/shared/components/Button';
import Textarea from '@/shared/components/inputs/Textarea';
import { useSaveTaskDecisionDraft, type TaskDetailResult } from '../../api/workflow';

interface StickyRemarkFooterProps {
  taskId?: string;
  taskDraft?: TaskDetailResult;
  /** Task owner, not read-only, and on a task-wrapped route */
  canEdit: boolean;
}

/**
 * Floating comment control pinned to the bottom-right of the 360 view. Collapsed
 * to a circular action button; clicking it opens a popover card with the per-task
 * decision draft's comment — the same draft the Decision → Comments box on the
 * Summary & Decision page reads/writes. The task owner can edit and explicitly
 * save it; everyone else sees it read-only.
 */
const StickyRemarkFooter = ({ taskId, taskDraft, canEdit }: StickyRemarkFooterProps) => {
  const { t } = useTranslation(['appraisal', 'common']);
  const { mutate: saveDraft, isPending } = useSaveTaskDecisionDraft();

  // Seed the local draft once PER TASK from the fetched value, so a post-save refetch
  // doesn't clobber an in-progress edit but switching tasks without unmounting does
  // re-seed. Order matters: the `taskDraft === undefined` guard must come first, or a
  // refetch that momentarily has no data would wipe what the user is typing.
  const seededTaskIdRef = useRef<string | undefined>(undefined);
  const [draft, setDraft] = useState('');
  useEffect(() => {
    if (taskDraft === undefined || seededTaskIdRef.current === taskId) return;
    setDraft(taskDraft.comment ?? '');
    seededTaskIdRef.current = taskId;
  }, [taskId, taskDraft]);

  const editable = canEdit && taskDraft !== undefined;
  const savedComment = taskDraft?.comment ?? '';
  const isDirty = draft !== savedComment;
  const hasComment = savedComment.trim().length > 0;

  const handleSave = () => {
    if (!taskId) return;
    saveDraft(
      {
        taskId,
        comment: draft,
        decisionTaken: taskDraft?.decisionTaken ?? null,
        reasonCode: taskDraft?.reasonCode ?? null,
        assignee: taskDraft?.assignee ?? null,
      },
      {
        onSuccess: () => toast.success(t('view360.remarkFooter.saved')),
        onError: () => toast.error(t('view360.remarkFooter.saveFailed')),
      },
    );
  };

  return (
    // Headless UI Popover supplies Escape-to-close, outside-click and focus return to the
    // FAB. PopoverPanel deliberately gets no `anchor` — anchoring portals it out of this
    // flex column and the card would no longer stack above the button.
    <Popover className="pointer-events-none absolute inset-x-6 bottom-6 z-30 flex flex-col items-end gap-3">
      {/* Expanded comment card */}
      <PopoverPanel className="pointer-events-auto w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl ring-1 ring-black/5 transition">
        {/* Header — colorized */}
        <div className="flex items-center gap-2.5 bg-gradient-to-r from-primary/10 to-teal-50 px-4 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Icon name="comment-dots" style="solid" className="h-4 w-4" />
          </div>
          <p className="flex-1 text-sm font-semibold text-gray-800">
            {t('view360.remarkFooter.label')}
          </p>
          <CloseButton
            type="button"
            aria-label={t('common:actions.close')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-white/70 hover:text-gray-600"
          >
            <Icon name="xmark" style="solid" className="h-4 w-4" />
          </CloseButton>
        </div>

        {/* Body */}
        <div className="px-4 py-3">
          {editable ? (
            <>
              <Textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder={t('view360.remarkFooter.placeholder')}
                maxLength={4000}
                showCharCount
                className="min-h-[120px]"
              />
              <div className="mt-3 flex justify-end">
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!isDirty || isPending}
                  onClick={handleSave}
                >
                  <Icon style="regular" name="floppy-disk" className="mr-1.5 size-3.5" />
                  {t('view360.remarkFooter.save')}
                </Button>
              </div>
            </>
          ) : (
            <p className="max-h-60 overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-700">
              {savedComment || '-'}
            </p>
          )}
        </div>
      </PopoverPanel>

      {/* Circular action button */}
      <PopoverButton
        type="button"
        aria-label={t('view360.remarkFooter.label')}
        title={t('view360.remarkFooter.label')}
        className={({ open }: { open: boolean }) =>
          clsx(
            'pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2',
            open
              ? 'bg-gray-600 shadow-gray-500/30'
              : 'bg-gradient-to-br from-primary to-teal-600 shadow-primary/40',
          )
        }
      >
        {({ open }: { open: boolean }) => (
          <>
            <Icon name={open ? 'xmark' : 'comment-dots'} style="solid" className="h-5 w-5" />
            {/* Has-content indicator */}
            {!open && hasComment && (
              <span className="absolute -right-0.5 -top-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-amber-400" />
            )}
          </>
        )}
      </PopoverButton>
    </Popover>
  );
};

export default StickyRemarkFooter;

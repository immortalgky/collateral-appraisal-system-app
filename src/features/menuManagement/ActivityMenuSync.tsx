import { useEffect } from 'react';
import { fetchMyMenu } from './api/menus';
import { useMenuStore } from './store';

/**
 * Keeps the appraisal menu tree in sync with the active task's activityId.
 *
 * Mounted inside <TaskLayout> once the task has loaded. When `activityId`
 * changes, refetches /auth/me/menu?activityId=... and replaces only the
 * appraisal tree — main nav is unaffected. On unmount (leaving the task
 * context), refetches the default role-only menu so returning to the
 * appraisal list does not keep stale activity-scoped visibility.
 */
export function ActivityMenuSync({ activityId }: { activityId: string | undefined }) {
  const setAppraisalTree = useMenuStore(state => state.setAppraisalTree);
  const activeActivityId = useMenuStore(state => state.activeActivityId);
  const isLoaded = useMenuStore(state => state.isLoaded);

  useEffect(() => {
    // Wait for the initial role-based fetch (MenuInitializer) before layering
    // activity overrides — otherwise the main tree may clobber itself on race.
    if (!isLoaded) return;

    const next = activityId ?? null;
    if (next === activeActivityId) return;

    let cancelled = false;
    fetchMyMenu(activityId)
      .then(({ appraisal }) => {
        if (!cancelled) setAppraisalTree(appraisal, next);
      })
      .catch(() => {
        // Silent: keep the previous tree. MenuInitializer's toast handles the
        // broader "can't load menu" case; here we just skip the activity overlay.
      });

    return () => {
      cancelled = true;
    };
  }, [activityId, activeActivityId, isLoaded, setAppraisalTree]);

  // On unmount of the task layout, restore the default (role-only) appraisal
  // tree. Runs once because activityId/setAppraisalTree live outside the dep
  // list of this cleanup effect.
  useEffect(() => {
    return () => {
      if (useMenuStore.getState().activeActivityId === null) return;
      fetchMyMenu()
        .then(({ appraisal }) => useMenuStore.getState().setAppraisalTree(appraisal, null))
        .catch(() => {});
    };
  }, []);

  return null;
}

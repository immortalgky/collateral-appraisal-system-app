import { useEffect, useRef, useState } from 'react';
import { taskListUrl } from '../utils/taskReturn';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useOpenTask, useUnlockTask } from '../api';
import LoadingSpinner from '@shared/components/LoadingSpinner';
import Icon from '@shared/components/Icon';

/** Task sub-routes a caller may ask to land on; router state is not trusted to build the URL. */
const LAND_ON_ROUTES = ['administration'] as const;

function OpeningTaskPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  // PoolTaskListPage passes { lockedTaskId } in navigate state when it acquired a fresh lock.
  // If OpenTask fails, we release the lock so other users can claim the task.
  const lockedTaskId: string | undefined = location.state?.lockedTaskId;
  // Optional sub-route of the task to land on instead of the default page; unknown values are ignored.
  const requestedLandOn: unknown = location.state?.landOn;
  const landOn = LAND_ON_ROUTES.find(route => route === requestedLandOn);

  // Guard against React StrictMode double-mounting the effect (which would fire the POST twice)
  const hasFiredRef = useRef(false);

  // Use mutateAsync so navigation is a plain promise .then() continuation — not an observer
  // callback. TanStack Query v5 suppresses per-call onSuccess/onError when the component
  // unmounts (StrictMode remounts the component, so mount-1 is unmounted before the async
  // completes). Plain promise continuations are NOT suppressed, so navigate() fires reliably.
  const { mutateAsync: openTask } = useOpenTask();
  const { mutate: unlockTask } = useUnlockTask();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!taskId || hasFiredRef.current) return;
    hasFiredRef.current = true;

    openTask(taskId)
      .then(result => {
        if (result.isSuccess) {
          navigate(landOn ? `/tasks/${taskId}/${landOn}` : `/tasks/${taskId}`, { replace: true });
        } else {
          if (lockedTaskId) unlockTask(lockedTaskId);
          setErrorMessage(result.errorMessage ?? 'Unable to open this task. Please try again.');
        }
      })
      .catch((err: { response?: { data?: { errorMessage?: string; message?: string } } }) => {
        if (lockedTaskId) unlockTask(lockedTaskId);
        setErrorMessage(
          err?.response?.data?.errorMessage ??
            err?.response?.data?.message ??
            'Unable to open this task. Please try again.',
        );
      });
  }, [taskId]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: fire once on mount

  if (errorMessage !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <Icon name="circle-exclamation" style="solid" className="size-16 text-error" />
          </div>
          <h1 className="text-xl font-semibold text-base-content mb-2">Cannot Open Task</h1>
          <p className="text-base-content/60 mb-8">{errorMessage}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate(taskListUrl())}>
            <Icon name="arrow-left" style="solid" className="size-4" />
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200">
      <LoadingSpinner size="lg" variant="default" text="Opening task..." />
    </div>
  );
}

export default OpeningTaskPage;

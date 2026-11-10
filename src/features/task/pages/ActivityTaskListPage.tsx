import { useSearchParams, Navigate } from 'react-router-dom';
import { getActivityConfig } from '../config/activityConfig';
import TaskListingPage from './TaskListingPage';

function ActivityTaskListPage() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId') ?? undefined;
  const config = activityId ? getActivityConfig(activityId) : undefined;

  if (!config) return <Navigate to="/tasks" replace />;

  // keyed: switching activity starts the page's state and column layout afresh
  return <TaskListingPage key={config.activityId} activity={config} />;
}

export default ActivityTaskListPage;

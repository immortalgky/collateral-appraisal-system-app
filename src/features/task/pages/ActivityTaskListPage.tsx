import { useSearchParams, Navigate } from 'react-router-dom';
import { ActivityTaskTable } from '../components/ActivityTaskTable';
import { getActivityConfig } from '../config/activityConfig';

function ActivityTaskListPage() {
  const [searchParams] = useSearchParams();
  const activityId = searchParams.get('activityId') ?? undefined;

  if (!activityId) return <Navigate to="/tasks" replace />;

  const config = getActivityConfig(activityId);

  if (!config) return <Navigate to="/tasks" replace />;

  return (
    <ActivityTaskTable
      activityId={config.activityId}
      title={config.title}
      description={config.description}
    />
  );
}

export default ActivityTaskListPage;

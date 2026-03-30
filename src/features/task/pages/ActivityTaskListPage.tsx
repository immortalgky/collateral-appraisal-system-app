import { useParams, Navigate } from 'react-router-dom';
import { ActivityTaskTable } from '../components/ActivityTaskTable';
import { getActivityConfig } from '../config/activityConfig';

function ActivityTaskListPage() {
  const { activityId } = useParams<{ activityId: string }>();

  if (!activityId) return <Navigate to="/tasks" replace />;

  const config = getActivityConfig(activityId);

  if (!config) return <Navigate to="/tasks" replace />;

  return (
    <ActivityTaskTable
      activityId={config.activityId}
      title={config.title}
      description={config.description}
      columns={config.columns}
    />
  );
}

export default ActivityTaskListPage;

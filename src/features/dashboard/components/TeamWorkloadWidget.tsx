import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';

type TeamMember = {
  name: string;
  avatar?: string;
  notStarted: number;
  inProgress: number;
  overdue: number;
  completed: number;
};

const MOCK_DATA: TeamMember[] = [
  { name: 'Darrell Steward', notStarted: 12, inProgress: 8, overdue: 2, completed: 15 },
  { name: 'Marvin McKinney', notStarted: 10, inProgress: 12, overdue: 1, completed: 20 },
  { name: 'Jenny Wilson', notStarted: 8, inProgress: 6, overdue: 3, completed: 18 },
  { name: 'Devon Lane', notStarted: 15, inProgress: 10, overdue: 0, completed: 12 },
  { name: 'Guy Hawkins', notStarted: 6, inProgress: 14, overdue: 4, completed: 22 },
];

function TeamWorkloadWidget() {
  const data = MOCK_DATA;
  const maxTotal = Math.max(...data.map((m) => m.notStarted + m.inProgress + m.overdue + m.completed));

  return (
    <WidgetWrapper id="team-workload">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Team Workload</h3>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <Icon name="ellipsis-vertical" style="solid" className="size-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Legend */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-xs text-gray-500">Not Started</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-xs text-gray-500">In Progress</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-red-500" />
              <span className="text-xs text-gray-500">Overdue</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-xs text-gray-500">Completed</span>
            </div>
          </div>

          {/* Team members */}
          <div className="space-y-4">
            {data.map((member) => {
              const total = member.notStarted + member.inProgress + member.overdue + member.completed;
              const notStartedWidth = (member.notStarted / maxTotal) * 100;
              const inProgressWidth = (member.inProgress / maxTotal) * 100;
              const overdueWidth = (member.overdue / maxTotal) * 100;
              const completedWidth = (member.completed / maxTotal) * 100;

              return (
                <div key={member.name} className="flex items-center gap-4">
                  {/* Avatar and name */}
                  <div className="flex items-center gap-3 w-40 shrink-0">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xs font-medium">
                      {member.name.split(' ').map((n) => n[0]).join('')}
                    </div>
                    <span className="text-sm text-gray-700 truncate">{member.name}</span>
                  </div>

                  {/* Bar chart */}
                  <div className="flex-1 flex items-center gap-0.5 h-6">
                    {member.notStarted > 0 && (
                      <div
                        className="h-full bg-blue-500 rounded-l-md flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${notStartedWidth}%`, minWidth: member.notStarted > 0 ? '24px' : '0' }}
                      >
                        {member.notStarted}
                      </div>
                    )}
                    {member.inProgress > 0 && (
                      <div
                        className="h-full bg-amber-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${inProgressWidth}%`, minWidth: member.inProgress > 0 ? '24px' : '0' }}
                      >
                        {member.inProgress}
                      </div>
                    )}
                    {member.overdue > 0 && (
                      <div
                        className="h-full bg-red-500 flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${overdueWidth}%`, minWidth: member.overdue > 0 ? '24px' : '0' }}
                      >
                        {member.overdue}
                      </div>
                    )}
                    {member.completed > 0 && (
                      <div
                        className="h-full bg-emerald-500 rounded-r-md flex items-center justify-center text-white text-xs font-medium transition-all"
                        style={{ width: `${completedWidth}%`, minWidth: member.completed > 0 ? '24px' : '0' }}
                      >
                        {member.completed}
                      </div>
                    )}
                  </div>

                  {/* Total */}
                  <span className="text-sm font-medium text-gray-700 w-10 text-right">{total}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default TeamWorkloadWidget;

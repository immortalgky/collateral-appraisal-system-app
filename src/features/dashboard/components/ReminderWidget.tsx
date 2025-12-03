import Icon from '@shared/components/Icon';
import WidgetWrapper from './WidgetWrapper';
import type { Reminder } from '../types';

type ReminderWidgetProps = {
  reminders?: Reminder[];
};

function ReminderWidget({ reminders }: ReminderWidgetProps) {
  // Mock data if not provided
  const reminderData: Reminder[] = reminders || [
    { id: '1', title: 'Overdue alert', time: 'Tomorrow - 11.45', reportNo: 'AP67xxxxx', isOverdue: false },
    { id: '2', title: 'Overdue alert', time: 'Today - 12.00', reportNo: 'AP67xxxxx', isOverdue: true },
    { id: '3', title: 'Overdue alert', time: 'in 4 days - 11.30', reportNo: 'AP67xxxxx', isOverdue: false },
  ];

  return (
    <WidgetWrapper id="reminders">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Reminders</h3>
          <button type="button" className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <Icon name="ellipsis-vertical" style="solid" className="size-4" />
          </button>
        </div>

        {/* Reminder list */}
        <div className="divide-y divide-gray-100">
          {reminderData.map((reminder) => (
            <div key={reminder.id} className="flex items-center gap-3 px-5 py-4 hover:bg-gray-50 transition-colors">
              <div className={`p-2 rounded-full ${reminder.isOverdue ? 'bg-red-50' : 'bg-blue-50'}`}>
                <Icon
                  name="bell"
                  style="solid"
                  className={`size-4 ${reminder.isOverdue ? 'text-red-500' : 'text-blue-500'}`}
                />
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-800">{reminder.title}</span>
                <span className="text-xs text-gray-400">{reminder.time}</span>
              </div>
              <span
                className={`px-2.5 py-1 text-xs font-medium rounded-full shrink-0 ${
                  reminder.isOverdue
                    ? 'bg-red-50 text-red-600'
                    : 'bg-blue-50 text-blue-600'
                }`}
              >
                {reminder.reportNo}
              </span>
            </div>
          ))}
        </div>
      </div>
    </WidgetWrapper>
  );
}

export default ReminderWidget;

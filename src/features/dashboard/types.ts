export type WidgetType = 'task-summary' | 'recent-task' | 'calendar' | 'reminders' | 'notes' | 'total-appraisals' | 'progress-summary' | 'team-workload' | 'external-task-summary';

// Column spans in a 12-column grid
export type ColumnSpan = 3 | 4 | 6 | 8 | 12;

export type WidgetPosition = 'main' | 'sidebar';

// Sidebar width threshold - widgets with minCols <= this can go in sidebar
export const SIDEBAR_MAX_COLS = 4;

export type WidgetConfig = {
  type: WidgetType;
  title: string;
  description: string;
  minCols: ColumnSpan; // Minimum columns the widget needs
  maxCols: ColumnSpan; // Maximum columns the widget can expand to
  defaultCols: ColumnSpan; // Default/preferred column size
};

export type Widget = {
  id: string;
  type: WidgetType;
  cols: ColumnSpan; // Current column span
  order: number;
  visible: boolean;
  position: WidgetPosition; // Current position (main or sidebar)
};

// Helper to check if a widget type can be placed in sidebar
export const canPlaceInSidebar = (type: WidgetType): boolean => {
  const config = WIDGET_CONFIGS[type];
  return config.minCols <= SIDEBAR_MAX_COLS;
};

// Widget configurations with min/max sizes
export const WIDGET_CONFIGS: Record<WidgetType, WidgetConfig> = {
  'total-appraisals': {
    type: 'total-appraisals',
    title: 'Total Appraisals',
    description: 'Line chart showing appraisal trends',
    minCols: 6,
    maxCols: 12,
    defaultCols: 6,
  },
  'task-summary': {
    type: 'task-summary',
    title: 'Task Summary',
    description: 'Overview of task statuses with gauges',
    minCols: 8,
    maxCols: 12,
    defaultCols: 12,
  },
  'progress-summary': {
    type: 'progress-summary',
    title: 'Progress Summary',
    description: 'Donut chart of pending requests',
    minCols: 6,
    maxCols: 12,
    defaultCols: 6,
  },
  'team-workload': {
    type: 'team-workload',
    title: 'Team Workload',
    description: 'Team member task distribution',
    minCols: 6,
    maxCols: 12,
    defaultCols: 6,
  },
  'recent-task': {
    type: 'recent-task',
    title: 'Recent Task',
    description: 'Table of recent tasks',
    minCols: 8,
    maxCols: 12,
    defaultCols: 12,
  },
  'external-task-summary': {
    type: 'external-task-summary',
    title: 'External Task Summary',
    description: 'Bar chart of external appraisals',
    minCols: 6,
    maxCols: 12,
    defaultCols: 6,
  },
  'calendar': {
    type: 'calendar',
    title: 'Calendar',
    description: 'Mini calendar view',
    minCols: 3,
    maxCols: 6,
    defaultCols: 3,
  },
  'reminders': {
    type: 'reminders',
    title: 'Reminders',
    description: 'Upcoming reminders and alerts',
    minCols: 3,
    maxCols: 6,
    defaultCols: 3,
  },
  'notes': {
    type: 'notes',
    title: 'Notes',
    description: 'Personal notes',
    minCols: 3,
    maxCols: 6,
    defaultCols: 3,
  },
};

// Helper to get column class based on span
export const getColSpanClass = (cols: ColumnSpan): string => {
  const classes: Record<ColumnSpan, string> = {
    3: 'col-span-12 sm:col-span-6 lg:col-span-3',
    4: 'col-span-12 sm:col-span-6 lg:col-span-4',
    6: 'col-span-12 lg:col-span-6',
    8: 'col-span-12 lg:col-span-8',
    12: 'col-span-12',
  };
  return classes[cols];
};

export type TaskSummaryData = {
  notStarted: number;
  inProgress: number;
  overdue: number;
  completed: number;
};

export type RecentTask = {
  id: string;
  reportNo: string;
  customerName: string;
  taskType: string;
  purpose: string;
  status: 'pending' | 'draft' | 'completed';
  requestDate: string;
};

export type Reminder = {
  id: string;
  title: string;
  time: string;
  reportNo: string;
  isOverdue: boolean;
};

export type Note = {
  id: string;
  content: string;
  time: string;
};

export const DEFAULT_WIDGETS: Widget[] = [
  { id: 'total-appraisals', type: 'total-appraisals', cols: 6, order: 1, visible: true, position: 'main' },
  { id: 'calendar', type: 'calendar', cols: 3, order: 2, visible: true, position: 'sidebar' },
  { id: 'reminders', type: 'reminders', cols: 3, order: 3, visible: true, position: 'sidebar' },
  { id: 'task-summary', type: 'task-summary', cols: 12, order: 4, visible: true, position: 'main' },
  { id: 'progress-summary', type: 'progress-summary', cols: 6, order: 5, visible: true, position: 'main' },
  { id: 'team-workload', type: 'team-workload', cols: 6, order: 6, visible: true, position: 'main' },
  { id: 'recent-task', type: 'recent-task', cols: 12, order: 7, visible: true, position: 'main' },
  { id: 'notes', type: 'notes', cols: 3, order: 8, visible: true, position: 'sidebar' },
  { id: 'external-task-summary', type: 'external-task-summary', cols: 6, order: 9, visible: false, position: 'main' },
];

export const AVAILABLE_WIDGETS = Object.values(WIDGET_CONFIGS);

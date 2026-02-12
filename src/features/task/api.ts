import { useQuery } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';
import type {
  Assignee,
  GetTasksParams,
  KanbanStatusType,
  MovementType,
  PropertyTypeType,
  Task,
  TaskActionType,
  TaskListResponse,
  TaskPriorityType,
  TaskPurposeType,
  TaskStatusType,
  TaskTypeType,
} from './types';

// Customer names matching Figma design
const customerNames = [
  'Roger Vetrovs',
  'Adison Ekstrom Bothman',
  'Aspen Dias',
  'Jordyn George',
  'Mira Dorwart',
  'Giana Torff',
  'Abram Franci',
  'Marilyn Kenter',
  'Miracle Saris',
  'Allison Vetrovs',
  'Kierra Rosser',
  'Marcus Levin',
  'Tiana Philips',
  'Kaiya Lubin',
  'Jaylon Herwitz',
];

const taskTypes: TaskTypeType[] = ['Route Back Follow Up', 'New Appraisal', 'Review', 'Revision'];

const purposes: TaskPurposeType[] = [
  'Request for credit limit',
  'Request to review',
  'Refinance',
  'New Loan',
];

const propertyTypes: PropertyTypeType[] = ['Land', 'Land and building', 'Condominium', 'Building'];

const statuses: TaskStatusType[] = ['Draft', 'Pending', 'InProgress', 'Completed'];

const kanbanStatuses: KanbanStatusType[] = ['Not Started', 'In Progress', 'Overdue', 'Completed'];

const priorities: TaskPriorityType[] = ['High', 'Medium', 'Low'];

const actions: TaskActionType[] = ['Forward', 'Review', 'Approve', 'Reject'];

const movements: MovementType[] = ['Forward', 'Backward'];

// Mock assignees
const assignees: Assignee[] = [
  { id: 'user-1', name: 'Roger Vetrovs', avatar: 'https://i.pravatar.cc/150?u=roger' },
  { id: 'user-2', name: 'Adison Ekstrom', avatar: 'https://i.pravatar.cc/150?u=adison' },
  { id: 'user-3', name: 'Aspen Dias', avatar: 'https://i.pravatar.cc/150?u=aspen' },
  { id: 'user-4', name: 'Jordyn George', avatar: 'https://i.pravatar.cc/150?u=jordyn' },
];

/**
 * Generate a random date within a range
 */
const randomDate = (startDaysAgo: number, endDaysAgo: number): string => {
  const start = Date.now() - startDaysAgo * 24 * 60 * 60 * 1000;
  const end = Date.now() - endDaysAgo * 24 * 60 * 60 * 1000;
  const randomTime = start + Math.random() * (end - start);
  return new Date(randomTime).toISOString().split('T')[0]; // YYYY-MM-DD format
};

/**
 * Generate mock tasks matching Figma design
 */
export const generateMockTasks = (count: number = 87): Task[] => {
  return Array.from({ length: count }, (_, i) => {
    const hasRef = i % 5 === 0; // Some items have reference numbers
    const kanbanStatus = kanbanStatuses[i % kanbanStatuses.length];
    const olaValue = [1, 2][i % 2];
    const olaActualValue = Math.round((0.5 + Math.random() * 1) * 10) / 10; // 0.5 to 1.5
    const olaDiffValue = Math.round((olaValue - olaActualValue) * 10) / 10;

    return {
      id: `task-${i + 1}`,
      appraisalReportNo: `67${String(Math.floor(Math.random() * 1000000)).padStart(6, 'X')}`,
      referenceNo: hasRef
        ? `66${String(Math.floor(Math.random() * 1000000)).padStart(6, 'x')}`
        : undefined,
      customerName: customerNames[i % customerNames.length],
      taskType: taskTypes[i % taskTypes.length],
      purpose: purposes[i % purposes.length],
      propertyType: propertyTypes[i % propertyTypes.length],
      status: statuses[i % statuses.length],
      kanbanStatus,
      priority: priorities[i % priorities.length],
      action: actions[i % actions.length],
      assignee: assignees[i % assignees.length],
      commentCount: Math.floor(Math.random() * 5),
      timeInfo: '1 / 0.7 / 0.3',
      appointmentDate: i % 3 !== 0 ? randomDate(30, 0) : undefined, // Some have appointment dates
      requestDate: randomDate(60, 30),
      movement: movements[i % movements.length],
      ola: olaValue,
      olaActual: olaActualValue,
      olaDifference: olaDiffValue,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
};

// Cache the mock data to maintain consistency during session
let cachedMockTasks: Task[] | null = null;

const getMockTasks = (): Task[] => {
  if (!cachedMockTasks) {
    cachedMockTasks = generateMockTasks(87);
  }
  return cachedMockTasks;
};

/**
 * Hook for fetching a paginated list of tasks
 */
export const useGetTasks = (params: GetTasksParams = {}) => {
  const {
    pageNumber = 0,
    pageSize = 10,
    search,
    status,
    taskType,
    propertyType,
    purpose,
    sortBy,
    sortDirection = 'asc',
  } = params;

  // Build query key with only defined values
  const queryKey = [
    'tasks',
    {
      pageNumber,
      pageSize,
      ...(search && { search }),
      ...(status && { status }),
      ...(taskType && { taskType }),
      ...(propertyType && { propertyType }),
      ...(purpose && { purpose }),
      ...(sortBy && { sortBy }),
      ...(sortDirection && sortBy && { sortDirection }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<TaskListResponse> => {
      const { data } = await axios.get('/tasks');

      return data;
    },
    staleTime: 30 * 1000, // Cache for 30 seconds
  });
};

/**
 * Hook for fetching a single task by ID
 */
export const useGetTaskById = (id: string | undefined) => {
  return useQuery({
    queryKey: ['task', id],
    queryFn: async (): Promise<Task | null> => {
      await new Promise(resolve => setTimeout(resolve, 200));
      const tasks = getMockTasks();
      return tasks.find(t => t.id === id) ?? null;
    },
    enabled: !!id,
  });
};

/**
 * Hook for fetching all tasks for Kanban view (no pagination)
 */
export const useGetTasksForKanban = (
  params: Omit<GetTasksParams, 'pageNumber' | 'pageSize'> = {},
) => {
  const { search, status, taskType, propertyType, purpose } = params;

  const queryKey = [
    'tasks-kanban',
    {
      ...(search && { search }),
      ...(status && { status }),
      ...(taskType && { taskType }),
      ...(propertyType && { propertyType }),
      ...(purpose && { purpose }),
    },
  ];

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Task[]> => {
      await new Promise(resolve => setTimeout(resolve, 300));

      let tasks = [...getMockTasks()];

      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        tasks = tasks.filter(
          t =>
            t.appraisalReportNo.toLowerCase().includes(searchLower) ||
            t.customerName.toLowerCase().includes(searchLower) ||
            (t.referenceNo && t.referenceNo.toLowerCase().includes(searchLower)),
        );
      }

      // Apply filters
      if (status) tasks = tasks.filter(t => t.status === status);
      if (taskType) tasks = tasks.filter(t => t.taskType === taskType);
      if (propertyType) tasks = tasks.filter(t => t.propertyType === propertyType);
      if (purpose) tasks = tasks.filter(t => t.purpose === purpose);

      return tasks;
    },
    staleTime: 30 * 1000,
  });
};

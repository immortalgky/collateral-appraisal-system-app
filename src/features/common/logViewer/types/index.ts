export type LogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';

export interface LogItem {
  id: number;
  timeStamp: string;
  level: LogLevel | null;
  message: string | null;
  exception: string | null;
  correlationId: string | null;
  entityId: string | null;
  appraisalId: string | null;
  requestId: string | null;
  workflowInstanceId: string | null;
  collateralId: string | null;
  documentId: string | null;
  machineName: string | null;
}

export interface LogListResult {
  items: LogItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetLogsParams {
  pageNumber?: number;
  pageSize?: number;
  level?: LogLevel | '';
  correlationId?: string;
  appraisalId?: string;
  requestId?: string;
  entityId?: string;
  from?: string;
  to?: string;
  search?: string;
}

export const logLevelBadgeClass: Record<LogLevel, string> = {
  Verbose: 'bg-gray-100 text-gray-500',
  Debug: 'bg-gray-100 text-gray-500',
  Information: 'bg-blue-50 text-blue-700',
  Warning: 'bg-amber-50 text-amber-700',
  Error: 'bg-red-50 text-red-700',
  Fatal: 'bg-red-100 text-red-800',
};

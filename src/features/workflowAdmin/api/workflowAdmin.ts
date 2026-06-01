import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from '@shared/api/axiosInstance';

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

export interface StepCatalogItem {
  name: string;
  displayName: string;
  kind: string;
  /** JSON Schema string describing the step's parameters shape */
  parametersSchema: string | null;
  description: string | null;
  /** Example parameters JSON for documentation/copy-paste reference */
  exampleParametersJson?: string | null;
}

export interface ProcessConfigRow {
  processorName: string;
  sortOrder: number;
  parametersJson: string | null;
  runIfExpression: string | null;
  isActive: boolean;
}

export interface ValidationError {
  index: number;
  stepName: string;
  message: string;
}

export interface ValidateConfigResult {
  valid: boolean;
  errors?: ValidationError[];
}

export interface ValidationField {
  key: string;
  column: string;
  dataType: string;
  displayName: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Query key factory
// ──────────────────────────────────────────────────────────────────────────────

export const workflowAdminKeys = {
  stepCatalog: ['workflow-admin', 'step-catalog'] as const,
  processConfig: (activityName: string) =>
    ['workflow-admin', 'process-config', activityName] as const,
  validationFields: ['workflow-admin', 'validation-fields'] as const,
  propertyValidationFields: ['workflow-admin', 'property-validation-fields'] as const,
};

// ──────────────────────────────────────────────────────────────────────────────
// Hooks
// ──────────────────────────────────────────────────────────────────────────────

/** GET /api/workflow/admin/step-catalog */
export function useGetStepCatalog() {
  return useQuery({
    queryKey: workflowAdminKeys.stepCatalog,
    queryFn: async (): Promise<StepCatalogItem[]> => {
      const { data } = await axios.get('/api/workflow/admin/step-catalog');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /api/workflow/admin/activities/{activityName}/process-config */
export function useGetProcessConfig(activityName: string | undefined) {
  return useQuery({
    queryKey: workflowAdminKeys.processConfig(activityName ?? ''),
    queryFn: async (): Promise<ProcessConfigRow[]> => {
      const { data } = await axios.get(
        `/api/workflow/admin/activities/${activityName}/process-config`,
      );
      return data;
    },
    enabled: !!activityName,
    staleTime: 30 * 1000,
  });
}

/** PUT /api/workflow/admin/activities/{activityName}/process-config */
export function useSaveProcessConfig(activityName: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rows: ProcessConfigRow[]): Promise<void> => {
      await axios.put(
        `/api/workflow/admin/activities/${activityName}/process-config`,
        rows,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workflowAdminKeys.processConfig(activityName),
      });
    },
  });
}

/** POST /api/workflow/admin/activities/{activityName}/process-config:validate */
export function useValidateProcessConfig(activityName: string) {
  return useMutation({
    mutationFn: async (rows: ProcessConfigRow[]): Promise<ValidateConfigResult> => {
      const { data } = await axios.post(
        `/api/workflow/admin/activities/${activityName}/process-config:validate`,
        rows,
      );
      return data;
    },
  });
}

/** GET /api/workflow/admin/validation-fields */
export function useGetValidationFields() {
  return useQuery({
    queryKey: workflowAdminKeys.validationFields,
    queryFn: async (): Promise<ValidationField[]> => {
      const { data } = await axios.get('/api/workflow/admin/validation-fields');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** GET /api/workflow/admin/property-validation-fields */
export function useGetPropertyValidationFields() {
  return useQuery({
    queryKey: workflowAdminKeys.propertyValidationFields,
    queryFn: async (): Promise<ValidationField[]> => {
      const { data } = await axios.get('/api/workflow/admin/property-validation-fields');
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

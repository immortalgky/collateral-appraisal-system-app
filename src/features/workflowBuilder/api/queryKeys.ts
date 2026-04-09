export const workflowKeys = {
  all: ['workflows'] as const,
  definitions: () => ['workflows', 'definitions'] as const,
  versions: (definitionId: string) =>
    ['workflows', definitionId, 'versions'] as const,
  version: (definitionId: string, versionId: string) =>
    ['workflows', definitionId, 'versions', versionId] as const,
  latestVersion: (definitionId: string) =>
    ['workflows', definitionId, 'versions', 'latest'] as const,
  activityTypes: () => ['workflows', 'activity-types'] as const,
  publishPreview: (definitionId: string, versionId: string) =>
    ['workflows', definitionId, 'versions', versionId, 'publish-preview'] as const,
  runningInstances: (definitionId: string, versionId?: string) =>
    versionId
      ? (['workflows', definitionId, 'instances', 'running', versionId] as const)
      : (['workflows', definitionId, 'instances', 'running'] as const),
};

import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { TaskProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('TaskActivity');

function formatDuration(iso: string): string {
  const match = iso.match(/PT(\d+)H/);
  if (!match) return iso;
  const hours = parseInt(match[1], 10);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  return `${hours}h`;
}

export function TaskNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as TaskProperties;
  const decisions = Object.keys(props?.decisionConditions ?? {});

  const outputs =
    decisions.length > 0
      ? decisions.map((d) => ({ id: d, label: d }))
      : undefined;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Task'}
      subtitle={props?.assigneeRole || undefined}
      selected={selected}
      outputs={outputs}
    >
      <div className="flex flex-wrap gap-1">
        {props?.assigneeRole && (
          <span className="badge badge-primary badge-sm badge-outline">
            {props.assigneeRole}
          </span>
        )}
        {props?.timeoutDuration && (
          <span className="badge badge-secondary badge-sm badge-outline">
            {formatDuration(props.timeoutDuration)}
          </span>
        )}
      </div>
    </BaseNode>
  );
}

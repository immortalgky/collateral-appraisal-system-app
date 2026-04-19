import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { ForkProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('ForkActivity');

export function ForkNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as ForkProperties;
  const branches = props?.branches ?? [];

  const outputs =
    branches.length > 0
      ? branches.map((b) => ({ id: b, label: b }))
      : undefined;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Fork'}
      selected={selected}
      outputs={outputs}
    >
      <div className="flex gap-1">
        <span className="badge badge-secondary badge-sm badge-outline">
          {props?.forkType || 'parallel'}
        </span>
        {branches.length > 0 && (
          <span className="badge badge-ghost badge-sm">
            {branches.length} branches
          </span>
        )}
      </div>
    </BaseNode>
  );
}

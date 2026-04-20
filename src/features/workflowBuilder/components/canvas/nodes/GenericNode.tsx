import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

export function GenericNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const visual = getActivityVisual(nodeData.type as string);

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || visual.label}
      subtitle={nodeData.type as string}
      selected={selected}
    />
  );
}

import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('EndActivity');

export function EndNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'End'}
      selected={selected}
      hasOutput={false}
    />
  );
}

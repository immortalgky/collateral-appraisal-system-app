import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { IfElseProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('IfElseActivity');

const IF_ELSE_OUTPUTS = [
  { id: 'true', label: 'true' },
  { id: 'false', label: 'false' },
];

export function IfElseNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as IfElseProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'If / Else'}
      subtitle={props?.condition || undefined}
      selected={selected}
      outputs={IF_ELSE_OUTPUTS}
    />
  );
}

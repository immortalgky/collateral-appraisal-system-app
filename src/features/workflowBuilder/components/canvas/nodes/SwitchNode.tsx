import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { SwitchProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('SwitchActivity');

export function SwitchNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as SwitchProperties;
  const cases = props?.cases ?? [];
  const allOutputs = [...cases, 'default'].map((k) => ({ id: k, label: k }));

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Switch'}
      subtitle={props?.expression || undefined}
      selected={selected}
      outputs={allOutputs}
    />
  );
}

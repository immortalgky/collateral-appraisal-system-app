import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { RoutingProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('RoutingActivity');

export function RoutingNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as RoutingProperties;
  const conditions = Object.keys(props?.routingConditions ?? {});
  const allOutputs = props?.defaultDecision
    ? [...conditions, props.defaultDecision]
    : conditions;

  const outputs =
    allOutputs.length > 0
      ? allOutputs.map((k) => ({ id: k, label: k }))
      : undefined;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Routing'}
      subtitle={
        conditions.length > 0
          ? `${conditions.length} condition${conditions.length !== 1 ? 's' : ''}`
          : undefined
      }
      selected={selected}
      outputs={outputs}
    />
  );
}

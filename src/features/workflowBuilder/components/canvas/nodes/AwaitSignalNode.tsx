import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { AwaitSignalProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('AwaitSignalActivity');

export function AwaitSignalNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as AwaitSignalProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Await Signal'}
      subtitle={props?.signalName || 'Waiting for signal'}
      selected={!!selected}
    >
      {props?.correlationKey && (
        <span className="badge badge-info badge-sm badge-outline">
          key: {props.correlationKey}
        </span>
      )}
    </BaseNode>
  );
}

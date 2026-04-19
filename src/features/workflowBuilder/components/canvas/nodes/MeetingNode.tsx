import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { MeetingProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('MeetingActivity');

export function MeetingNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as MeetingProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Meeting'}
      subtitle="Awaits meeting end"
      selected={!!selected}
    >
      {props?.meetingName && (
        <span className="badge badge-info badge-sm badge-outline truncate max-w-full">
          {props.meetingName}
        </span>
      )}
    </BaseNode>
  );
}

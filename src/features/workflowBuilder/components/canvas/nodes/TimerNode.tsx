import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { TimerProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('TimerActivity');

function formatDuration(iso: string): string {
  const matchH = iso.match(/PT(\d+)H/);
  if (matchH) {
    const hours = parseInt(matchH[1], 10);
    if (hours >= 24) return `${Math.floor(hours / 24)}d`;
    return `${hours}h`;
  }
  const matchM = iso.match(/PT(\d+)M/);
  if (matchM) return `${matchM[1]}m`;
  return iso;
}

export function TimerNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as TimerProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Timer'}
      subtitle={props?.timerName || 'Timed delay'}
      selected={!!selected}
    >
      <div className="flex flex-wrap gap-1">
        {props?.duration && (
          <span className="badge badge-warning badge-sm badge-outline">
            {formatDuration(props.duration)}
          </span>
        )}
        {props?.allowEarlyCancellation && (
          <span className="badge badge-ghost badge-sm badge-outline">
            cancellable
          </span>
        )}
      </div>
    </BaseNode>
  );
}

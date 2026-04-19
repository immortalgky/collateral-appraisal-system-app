import type { NodeProps } from '@xyflow/react';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('StartActivity');

export function StartNode({ id, selected }: NodeProps) {
  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title="Start"
      selected={selected}
      hasInput={false}
    />
  );
}

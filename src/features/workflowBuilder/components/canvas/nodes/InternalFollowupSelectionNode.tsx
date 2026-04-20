import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('InternalFollowupSelectionActivity');

const OUTPUTS = [
  { id: 'staff_selected', label: 'staff_selected' },
  { id: 'no_match', label: 'no_match' },
];

export function InternalFollowupSelectionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Internal Followup Selection'}
      subtitle="Staff routing"
      selected={!!selected}
      outputs={OUTPUTS}
    />
  );
}

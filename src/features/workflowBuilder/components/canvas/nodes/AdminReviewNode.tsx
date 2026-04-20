import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { AdminReviewActivityProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('AdminReviewActivity');

export function AdminReviewNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as AdminReviewActivityProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Admin Review'}
      subtitle="Administrative review"
      selected={!!selected}
    >
      {(props?.autoApprovalThreshold ?? 0) > 0 && (
        <span className="badge badge-primary badge-sm badge-outline">
          auto &le; {(props?.autoApprovalThreshold ?? 0).toLocaleString()}
        </span>
      )}
    </BaseNode>
  );
}

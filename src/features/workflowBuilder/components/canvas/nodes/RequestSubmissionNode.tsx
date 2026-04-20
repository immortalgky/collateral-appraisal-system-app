import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { RequestSubmissionActivityProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('RequestSubmissionActivity');

export function RequestSubmissionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as RequestSubmissionActivityProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Request Submission'}
      subtitle={props?.propertyType || 'Appraisal request'}
      selected={!!selected}
    >
      {props?.purpose && (
        <span className="badge badge-primary badge-sm badge-outline">
          {props.purpose}
        </span>
      )}
    </BaseNode>
  );
}

import type { NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { CompanySelectionProperties } from '../../../types';
import { BaseNode } from './BaseNode';
import { getActivityVisual } from '../../../utils/activityIcons';

const visual = getActivityVisual('CompanySelectionActivity');

export function CompanySelectionNode({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as CompanySelectionProperties;

  return (
    <BaseNode
      nodeId={id}
      iconName={visual.iconName} iconStyle={visual.iconStyle}
      accentColor={visual.accentColor}
      title={nodeData.name || 'Company Selection'}
      selected={selected}
    >
      <span className="badge badge-info badge-sm badge-outline">
        {props?.selectionMethod || 'roundrobin'}
      </span>
    </BaseNode>
  );
}

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { CompanySelectionProperties } from '../../../types';

export function CompanySelectionNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as CompanySelectionProperties;

  return (
    <div
      className={`min-w-[180px] rounded-lg border-l-4 border-l-info bg-base-100 shadow-md ${
        selected ? 'ring-2 ring-info ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-info !bg-white"
      />

      <div className="p-3">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-info">
          Company Selection
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'Company Selection'}
        </div>
        <div className="mt-1 flex gap-1">
          <span className="badge badge-info badge-sm badge-outline">
            {props?.selectionMethod || 'roundrobin'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-info !bg-white"
      />
    </div>
  );
}

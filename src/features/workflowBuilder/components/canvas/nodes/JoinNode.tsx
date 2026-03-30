import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { JoinProperties } from '../../../types';

export function JoinNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as JoinProperties;

  return (
    <div
      className={`min-w-[140px] rounded-lg border-2 border-success bg-success/10 shadow-md ${
        selected ? 'ring-2 ring-success ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-success !bg-white"
      />

      <div className="p-3 text-center">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-success">
          Join
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'Join'}
        </div>
        <div className="mt-1 flex justify-center gap-1">
          <span className="badge badge-success badge-sm badge-outline">
            {props?.joinType || 'all'}
          </span>
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-success !bg-white"
      />
    </div>
  );
}

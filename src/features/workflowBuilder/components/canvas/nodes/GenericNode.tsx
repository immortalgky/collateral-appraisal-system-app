import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';

export function GenericNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-l-4 border-l-neutral bg-base-100 shadow-md ${
        selected ? 'ring-2 ring-neutral ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-neutral !bg-white"
      />

      <div className="p-3">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral">
          {nodeData.type}
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || nodeData.type}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-neutral !bg-white"
      />
    </div>
  );
}

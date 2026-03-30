import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';

export function EndNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;

  return (
    <div
      className={`flex h-16 min-w-16 items-center justify-center rounded-full bg-error px-4 text-error-content shadow-md ${
        selected ? 'ring-2 ring-error ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-error !bg-white"
      />
      <span className="text-xs font-bold">{nodeData.name || 'End'}</span>
    </div>
  );
}

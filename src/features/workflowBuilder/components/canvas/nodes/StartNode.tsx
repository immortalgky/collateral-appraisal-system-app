import { Handle, Position, type NodeProps } from '@xyflow/react';

export function StartNode({ selected }: NodeProps) {
  return (
    <div
      className={`flex h-16 w-16 items-center justify-center rounded-full bg-success text-success-content shadow-md ${
        selected ? 'ring-2 ring-success ring-offset-2' : ''
      }`}
    >
      <span className="text-xs font-bold">Start</span>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-success !bg-white"
      />
    </div>
  );
}

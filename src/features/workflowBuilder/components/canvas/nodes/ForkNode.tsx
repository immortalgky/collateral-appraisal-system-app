import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { ForkProperties } from '../../../types';

export function ForkNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as ForkProperties;
  const branches = props?.branches ?? [];

  return (
    <div
      className={`min-w-[140px] rounded-lg border-2 border-secondary bg-secondary/10 shadow-md ${
        selected ? 'ring-2 ring-secondary ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-secondary !bg-white"
      />

      <div className="p-3 text-center">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-secondary">
          Fork
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'Fork'}
        </div>
        <div className="mt-1 flex justify-center gap-1">
          <span className="badge badge-secondary badge-sm badge-outline">
            {props?.forkType || 'parallel'}
          </span>
          {branches.length > 0 && (
            <span className="badge badge-ghost badge-sm">
              {branches.length} branches
            </span>
          )}
        </div>
      </div>

      {branches.length > 0 ? (
        <div className="flex justify-around border-t border-secondary/30 px-2 py-1">
          {branches.map((branch) => (
            <div key={branch} className="relative flex flex-col items-center">
              <span className="text-[10px] text-base-content/60">
                {branch}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={branch}
                className="!relative !left-auto !top-auto !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !border-2 !border-secondary !bg-white"
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-secondary !bg-white"
        />
      )}
    </div>
  );
}

import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { IfElseProperties } from '../../../types';

export function IfElseNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as IfElseProperties;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 border-warning bg-warning/10 shadow-md ${
        selected ? 'ring-2 ring-warning ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-warning !bg-white"
      />

      <div className="p-3 text-center">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-warning">
          If / Else
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'If/Else'}
        </div>
        {props?.condition && (
          <div className="mt-1 truncate text-[10px] text-base-content/60">
            {props.condition}
          </div>
        )}
      </div>

      <div className="flex justify-around border-t border-warning/30 px-2 py-1">
        {['true', 'false'].map((branch) => (
          <div key={branch} className="relative flex flex-col items-center">
            <span className="text-[10px] text-base-content/60">{branch}</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id={branch}
              className="!relative !left-auto !top-auto !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !border-2 !border-warning !bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

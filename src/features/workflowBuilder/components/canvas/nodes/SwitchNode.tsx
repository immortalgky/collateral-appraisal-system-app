import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { SwitchProperties } from '../../../types';

export function SwitchNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as SwitchProperties;
  const cases = Object.keys(props?.cases ?? {});
  const allOutputs = [...cases, 'default'];

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 border-secondary bg-secondary/10 shadow-md ${
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
          Switch
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'Switch'}
        </div>
        {props?.expression && (
          <div className="mt-1 truncate text-[10px] text-base-content/60">
            {props.expression}
          </div>
        )}
      </div>

      <div className="flex justify-around border-t border-secondary/30 px-2 py-1">
        {allOutputs.map((output) => (
          <div key={output} className="relative flex flex-col items-center">
            <span className="text-[10px] text-base-content/60">{output}</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id={output}
              className="!relative !left-auto !top-auto !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !border-2 !border-secondary !bg-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

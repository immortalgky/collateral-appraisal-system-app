import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { RoutingProperties } from '../../../types';

export function RoutingNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as RoutingProperties;
  const conditions = Object.keys(props?.routingConditions ?? {});
  const allOutputs = props?.defaultDecision
    ? [...conditions, props.defaultDecision]
    : conditions;

  return (
    <div
      className={`min-w-[160px] rounded-lg border-2 border-accent bg-accent/10 shadow-md ${
        selected ? 'ring-2 ring-accent ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-accent !bg-white"
      />

      <div className="p-3 text-center">
        <div className="mb-1 text-xs font-bold uppercase tracking-wide text-accent">
          Routing
        </div>
        <div className="text-sm font-semibold text-base-content">
          {nodeData.name || 'Routing'}
        </div>
        {conditions.length > 0 && (
          <div className="mt-1 text-[10px] text-base-content/60">
            {conditions.length} condition{conditions.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {allOutputs.length > 0 ? (
        <div className="flex justify-around border-t border-accent/30 px-2 py-1">
          {allOutputs.map((output) => (
            <div key={output} className="relative flex flex-col items-center">
              <span className="text-[10px] text-base-content/60">
                {output}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={output}
                className="!relative !left-auto !top-auto !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !border-2 !border-accent !bg-white"
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-accent !bg-white"
        />
      )}
    </div>
  );
}

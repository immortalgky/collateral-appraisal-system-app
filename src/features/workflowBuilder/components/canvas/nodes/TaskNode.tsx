import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ActivityNodeData } from '../../../adapters/toReactFlow';
import type { TaskProperties } from '../../../types';

export function TaskNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ActivityNodeData;
  const props = nodeData.properties as TaskProperties;
  const decisions = Object.keys(props?.decisionConditions ?? {});

  return (
    <div
      className={`min-w-[180px] rounded-lg border-l-4 border-l-primary bg-base-100 shadow-md ${
        selected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-primary !bg-white"
      />

      <div className="p-3">
        <div className="mb-1 text-sm font-semibold text-base-content">
          {nodeData.name || 'Task'}
        </div>

        <div className="flex flex-wrap gap-1">
          {props?.assigneeRole && (
            <span className="badge badge-primary badge-sm badge-outline">
              {props.assigneeRole}
            </span>
          )}
          {props?.timeoutDuration && (
            <span className="badge badge-secondary badge-sm badge-outline">
              {formatDuration(props.timeoutDuration)}
            </span>
          )}
        </div>
      </div>

      {decisions.length > 0 ? (
        <div className="flex justify-around border-t border-base-300 px-2 py-1">
          {decisions.map((decision) => (
            <div key={decision} className="relative flex flex-col items-center">
              <span className="text-[10px] text-base-content/60">
                {decision}
              </span>
              <Handle
                type="source"
                position={Position.Bottom}
                id={decision}
                className="!relative !left-auto !top-auto !h-2.5 !w-2.5 !translate-x-0 !translate-y-0 !border-2 !border-primary !bg-white"
              />
            </div>
          ))}
        </div>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !border-2 !border-primary !bg-white"
        />
      )}
    </div>
  );
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(\d+)H/);
  if (!match) return iso;
  const hours = parseInt(match[1], 10);
  if (hours >= 24) return `${Math.floor(hours / 24)}d`;
  return `${hours}h`;
}

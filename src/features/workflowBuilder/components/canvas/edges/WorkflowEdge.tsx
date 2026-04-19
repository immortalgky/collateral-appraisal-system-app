import { useState } from 'react';
import {
  getBezierPath,
  EdgeLabelRenderer,
  useReactFlow,
  type EdgeProps,
} from '@xyflow/react';
import type { TransitionType } from '../../../types';

interface WorkflowEdgeData {
  type?: TransitionType;
  condition?: string;
  [key: string]: unknown;
}

// n8n-style green palette for all transitions, with subtle differentiation.
const EDGE_STYLES: Record<
  string,
  { stroke: string; strokeDasharray?: string; animated?: boolean }
> = {
  Normal: { stroke: '#22c55e' },
  Conditional: { stroke: '#22c55e', strokeDasharray: '6,4', animated: true },
  Exception: { stroke: '#f59e0b' },
  Timeout: { stroke: '#ef4444' },
};

export function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  label,
  markerEnd,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { setEdges } = useReactFlow();

  const edgeData = data as WorkflowEdgeData | undefined;
  const transitionType = edgeData?.type ?? 'Normal';
  const style = EDGE_STYLES[transitionType] ?? EDGE_STYLES.Normal;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.35,
  });

  const strokeWidth = hovered || selected ? 2.5 : 1.8;
  const isActive = hovered || selected;

  const handleDelete = () => {
    setEdges((eds) => eds.filter((e) => e.id !== id));
  };

  return (
    <>
      {/* Invisible wider hit area */}
      <path
        d={edgePath}
        fill="none"
        strokeWidth={20}
        stroke="transparent"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="cursor-pointer"
      />

      {/* Soft halo when active */}
      {isActive && (
        <path
          d={edgePath}
          fill="none"
          stroke={style.stroke}
          strokeOpacity={0.2}
          strokeWidth={8}
          strokeLinecap="round"
          pointerEvents="none"
        />
      )}

      {/* Visible edge */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={style.stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={style.strokeDasharray}
        markerEnd={markerEnd as string}
        style={{
          transition: 'stroke-width 150ms ease-out',
          ...(style.animated
            ? { animation: 'dashdraw 0.6s linear infinite' }
            : {}),
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <div
              className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
              style={{ color: '#e5e7eb', background: 'rgba(30,31,36,0.7)' }}
            >
              {label as string}
            </div>
          </div>
        )}

        {hovered && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${label ? labelY + 22 : labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              onClick={handleDelete}
              className="flex h-5 w-5 items-center justify-center rounded-full bg-error text-[11px] font-bold leading-none text-white shadow-lg ring-2 ring-zinc-900/50 transition-transform hover:scale-110"
              title="Delete edge"
            >
              ×
            </button>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

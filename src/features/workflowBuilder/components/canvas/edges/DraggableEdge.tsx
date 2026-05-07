import { useCallback, useState } from 'react';
import {
  type Edge,
  type EdgeProps,
  getSmoothStepPath,
  EdgeLabelRenderer,
  useReactFlow,
} from '@xyflow/react';
import { useWorkflowStore } from '../../../hooks/useWorkflowStore';

function buildWaypointPath(
  sx: number, sy: number,
  tx: number, ty: number,
  wx: number, wy: number,
): string {
  const c1x = (sx + wx) / 2;
  const c2x = (wx + tx) / 2;
  return `M${sx},${sy} C${c1x},${sy} ${c1x},${wy} ${wx},${wy} C${c2x},${wy} ${c2x},${ty} ${tx},${ty}`;
}

export function DraggableEdge({
  id,
  sourceX, sourceY, sourcePosition,
  targetX, targetY, targetPosition,
  data, style, markerEnd, label, selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { setEdges: rfSetEdges, screenToFlowPosition } = useReactFlow();
  const storeSetEdges = useWorkflowStore((s) => s.setEdges);

  const [defaultPath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
    borderRadius: 16,
  });

  const edgeProps = data?.properties as Record<string, unknown> | undefined;
  const wx = edgeProps?._uiWaypointX as number | undefined;
  const wy = edgeProps?._uiWaypointY as number | undefined;
  const hasWaypoint = wx !== undefined && wy !== undefined;

  const edgePath = hasWaypoint
    ? buildWaypointPath(sourceX, sourceY, targetX, targetY, wx, wy)
    : defaultPath;

  const dotX = hasWaypoint ? wx : labelX;
  const dotY = hasWaypoint ? wy : labelY;

  const stroke = (style?.stroke as string) ?? '#94a3b8';
  const strokeWidth = (hovered || selected) ? 2.5 : 2;
  const isConditional = (data?.type as string) === 'Conditional';
  const strokeDash = isConditional ? '6,4' : undefined;

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent<SVGCircleElement>) => {
      e.stopPropagation();
      e.preventDefault();

      const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const offX = dotX - startFlow.x;
      const offY = dotY - startFlow.y;

      let lastX = dotX;
      let lastY = dotY;

      const onMove = (me: MouseEvent) => {
        const f = screenToFlowPosition({ x: me.clientX, y: me.clientY });
        lastX = f.x + offX;
        lastY = f.y + offY;

        rfSetEdges((edges) =>
          edges.map((edge) => {
            if (edge.id !== id) return edge;
            return {
              ...edge,
              data: {
                ...edge.data,
                properties: {
                  ...((edge.data?.properties as Record<string, unknown>) ?? {}),
                  _uiWaypointX: lastX,
                  _uiWaypointY: lastY,
                },
              },
            };
          }),
        );
      };

      const onUp = () => {
        // Persist final position to Zustand store so "Save Draft" includes it
        const current = useWorkflowStore.getState().edges;
        storeSetEdges(
          current.map((edge) => {
            if (edge.id !== id) return edge;
            return {
              ...edge,
              data: {
                ...edge.data,
                properties: {
                  ...((edge.data?.properties as Record<string, unknown>) ?? {}),
                  _uiWaypointX: lastX,
                  _uiWaypointY: lastY,
                },
              },
            };
          }),
        );
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [id, dotX, dotY, screenToFlowPosition, rfSetEdges, storeSetEdges],
  );

  const onHandleDblClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const removeWaypoint = (edges: Edge[]) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge;
          const newProps = { ...((edge.data?.properties as Record<string, unknown>) ?? {}) };
          delete newProps._uiWaypointX;
          delete newProps._uiWaypointY;
          return { ...edge, data: { ...edge.data, properties: newProps } };
        });
      rfSetEdges(removeWaypoint);
      storeSetEdges(removeWaypoint(useWorkflowStore.getState().edges));
    },
    [id, rfSetEdges, storeSetEdges],
  );

  const onDelete = useCallback(() => {
    rfSetEdges((es) => es.filter((e) => e.id !== id));
  }, [id, rfSetEdges]);

  return (
    <>
      {/* Wide invisible hit area */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Glow when hovered/selected */}
      {(hovered || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.15}
          strokeWidth={8}
          pointerEvents="none"
        />
      )}

      {/* Visible edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
        markerEnd={markerEnd as string}
        style={{ transition: 'stroke-width 150ms ease-out' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      {/* Drag handle — faint dot always, bright on hover */}
      <circle
        cx={dotX}
        cy={dotY}
        r={5}
        fill="#1e1f24"
        stroke={stroke}
        strokeWidth={2}
        className="nodrag nopan"
        style={{
          cursor: 'grab',
          pointerEvents: 'all',
          opacity: hovered ? 1 : 0.25,
          transition: 'opacity 150ms ease-out',
        }}
        onMouseDown={onHandleMouseDown}
        onDoubleClick={onHandleDblClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

      <EdgeLabelRenderer>
        {label && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
          >
            <div className="whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium leading-none text-gray-300 bg-zinc-800/80">
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
              onClick={onDelete}
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

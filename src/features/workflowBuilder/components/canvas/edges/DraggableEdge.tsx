import { useCallback, useState } from 'react';
import {
  type Edge,
  type EdgeProps,
  EdgeLabelRenderer,
  useReactFlow,
} from '@xyflow/react';
import { useWorkflowStore } from '../../../hooks/useWorkflowStore';

type Waypoint = { x: number; y: number };

// Straight polyline through all points
function buildPath(sx: number, sy: number, tx: number, ty: number, waypoints: Waypoint[]): string {
  const pts = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
}

// Find which segment index the click landed on, for insertion
function findSegmentIndex(
  sx: number, sy: number, tx: number, ty: number,
  waypoints: Waypoint[],
  cx: number, cy: number,
): number {
  const pts = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];
  let bestSeg = 0;
  let bestDist = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const { x: ax, y: ay } = pts[i];
    const { x: bx, y: by } = pts[i + 1];
    const dx = bx - ax;
    const dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    const t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((cx - ax) * dx + (cy - ay) * dy) / lenSq));
    const dist = Math.hypot(cx - (ax + t * dx), cy - (ay + t * dy));
    if (dist < bestDist) {
      bestDist = dist;
      bestSeg = i;
    }
  }
  return bestSeg;
}

// Midpoint of the middle segment, for label/delete button placement
function midLabelPos(sx: number, sy: number, tx: number, ty: number, waypoints: Waypoint[]) {
  const pts = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];
  const mid = Math.floor((pts.length - 1) / 2);
  return {
    x: (pts[mid].x + pts[mid + 1].x) / 2,
    y: (pts[mid].y + pts[mid + 1].y) / 2,
  };
}

export function DraggableEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  data, style, markerEnd, label, selected,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);
  const { setEdges: rfSetEdges, screenToFlowPosition } = useReactFlow();
  const storeSetEdges = useWorkflowStore((s) => s.setEdges);

  const edgeDataProps = data?.properties as Record<string, unknown> | undefined;
  const waypoints: Waypoint[] = (edgeDataProps?._uiWaypoints as Waypoint[]) ?? [];

  const edgePath = buildPath(sourceX, sourceY, targetX, targetY, waypoints);
  const { x: labelX, y: labelY } = midLabelPos(sourceX, sourceY, targetX, targetY, waypoints);

  const stroke = (style?.stroke as string) ?? '#94a3b8';
  const strokeWidth = (hovered || selected) ? 2.5 : 2;
  const isConditional = (data?.type as string) === 'Conditional';
  const strokeDash = isConditional ? '6,4' : undefined;

  // Persist waypoints to both ReactFlow local state and Zustand store
  const commitWaypoints = useCallback(
    (newWaypoints: Waypoint[]) => {
      const updater = (edges: Edge[]) =>
        edges.map((edge) => {
          if (edge.id !== id) return edge;
          return {
            ...edge,
            data: {
              ...edge.data,
              properties: {
                ...((edge.data?.properties as Record<string, unknown>) ?? {}),
                _uiWaypoints: newWaypoints,
              },
            },
          };
        });
      rfSetEdges(updater);
      storeSetEdges(updater(useWorkflowStore.getState().edges));
    },
    [id, rfSetEdges, storeSetEdges],
  );

  // Double-click on the path → insert waypoint (SHIFT+dblclick → clear all / make straight)
  const onPathDblClick = useCallback(
    (e: React.MouseEvent<SVGPathElement>) => {
      e.stopPropagation();
      if (e.shiftKey) {
        commitWaypoints([]);
        return;
      }
      const flow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const insertAt = findSegmentIndex(sourceX, sourceY, targetX, targetY, waypoints, flow.x, flow.y);
      const newWaypoints = [...waypoints];
      newWaypoints.splice(insertAt, 0, { x: flow.x, y: flow.y });
      commitWaypoints(newWaypoints);
    },
    [sourceX, sourceY, targetX, targetY, waypoints, screenToFlowPosition, commitWaypoints],
  );

  // Drag a waypoint dot
  const onDotMouseDown = useCallback(
    (e: React.MouseEvent<SVGCircleElement>, index: number) => {
      e.stopPropagation();
      e.preventDefault();

      const startFlow = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const wp = waypoints[index];
      const offX = wp.x - startFlow.x;
      const offY = wp.y - startFlow.y;
      let lastX = wp.x;
      let lastY = wp.y;

      const onMove = (me: MouseEvent) => {
        const f = screenToFlowPosition({ x: me.clientX, y: me.clientY });
        let nx = f.x + offX;
        let ny = f.y + offY;
        if (me.shiftKey) {
          // Constrain to horizontal or vertical from waypoint's original position
          if (Math.abs(nx - wp.x) >= Math.abs(ny - wp.y)) {
            ny = wp.y;
          } else {
            nx = wp.x;
          }
        }
        lastX = nx;
        lastY = ny;
        rfSetEdges((edges) =>
          edges.map((edge) => {
            if (edge.id !== id) return edge;
            const wps: Waypoint[] = [...(((edge.data?.properties as Record<string, unknown>)?._uiWaypoints as Waypoint[]) ?? [])];
            wps[index] = { x: lastX, y: lastY };
            return {
              ...edge,
              data: {
                ...edge.data,
                properties: { ...((edge.data?.properties as Record<string, unknown>) ?? {}), _uiWaypoints: wps },
              },
            };
          }),
        );
      };

      const onUp = () => {
        // Persist final drag position to store
        const current = useWorkflowStore.getState().edges;
        storeSetEdges(
          current.map((edge) => {
            if (edge.id !== id) return edge;
            const wps: Waypoint[] = [...(((edge.data?.properties as Record<string, unknown>)?._uiWaypoints as Waypoint[]) ?? [])];
            wps[index] = { x: lastX, y: lastY };
            return {
              ...edge,
              data: {
                ...edge.data,
                properties: { ...((edge.data?.properties as Record<string, unknown>) ?? {}), _uiWaypoints: wps },
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
    [id, waypoints, screenToFlowPosition, rfSetEdges, storeSetEdges],
  );

  // Double-click a waypoint dot → remove it
  const onDotDblClick = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.stopPropagation();
      commitWaypoints(waypoints.filter((_, i) => i !== index));
    },
    [waypoints, commitWaypoints],
  );

  const onDelete = useCallback(() => {
    rfSetEdges((es) => es.filter((e) => e.id !== id));
  }, [id, rfSetEdges]);

  const showHint = hovered && waypoints.length === 0;

  return (
    <>
      {/* Wide invisible hit area for hover + dbl-click to add waypoint */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        className="cursor-pointer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onDoubleClick={onPathDblClick}
      />

      {/* Glow on hover / selected */}
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

      {/* Visible edge */}
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
        onDoubleClick={onPathDblClick}
      />

      {/* Waypoint anchor dots */}
      {waypoints.map((wp, i) => (
        <circle
          key={i}
          cx={wp.x}
          cy={wp.y}
          r={5}
          fill="#1e1f24"
          stroke={stroke}
          strokeWidth={2}
          className="nodrag nopan"
          style={{
            cursor: 'move',
            pointerEvents: 'all',
            opacity: hovered ? 1 : 0.35,
            transition: 'opacity 150ms ease-out',
          }}
          onMouseDown={(e) => onDotMouseDown(e, i)}
          onDoubleClick={(e) => onDotDblClick(e, i)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        />
      ))}

      <EdgeLabelRenderer>
        {/* Condition label */}
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

        {/* Hint tooltip on first hover when no waypoints */}
        {showHint && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -130%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'none',
            }}
          >
            <div className="whitespace-nowrap rounded px-2 py-1 text-[10px] leading-none text-zinc-400 bg-zinc-800/90 ring-1 ring-zinc-700">
              dbl-click to add bend · shift+drag to snap · shift+dbl-click to straighten
            </div>
          </div>
        )}

        {/* Delete button */}
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

import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  type Node,
  type Edge,
  type Connection,
  type DefaultEdgeOptions,
  useReactFlow,
  ReactFlowProvider,
  ConnectionLineType,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useWorkflowStore } from '../../hooks/useWorkflowStore';
import { StartNode } from './nodes/StartNode';
import { TaskNode } from './nodes/TaskNode';
import { RoutingNode } from './nodes/RoutingNode';
import { EndNode } from './nodes/EndNode';
import { CompanySelectionNode } from './nodes/CompanySelectionNode';
import { IfElseNode } from './nodes/IfElseNode';
import { SwitchNode } from './nodes/SwitchNode';
import { ForkNode } from './nodes/ForkNode';
import { JoinNode } from './nodes/JoinNode';
import { GenericNode } from './nodes/GenericNode';
import { ApprovalNode } from './nodes/ApprovalNode';
import { MeetingNode } from './nodes/MeetingNode';
import { AwaitSignalNode } from './nodes/AwaitSignalNode';
import { InternalFollowupSelectionNode } from './nodes/InternalFollowupSelectionNode';
import { RequestSubmissionNode } from './nodes/RequestSubmissionNode';
import { AdminReviewNode } from './nodes/AdminReviewNode';
import { TimerNode } from './nodes/TimerNode';
import { WorkflowEdge } from './edges/WorkflowEdge';

const nodeTypes: NodeTypes = {
  StartActivity: StartNode,
  EndActivity: EndNode,
  TaskActivity: TaskNode,
  RoutingActivity: RoutingNode,
  CompanySelectionActivity: CompanySelectionNode,
  IfElseActivity: IfElseNode,
  SwitchActivity: SwitchNode,
  ForkActivity: ForkNode,
  JoinActivity: JoinNode,
  // Legacy type strings — keep so existing saved workflows still render
  RequestSubmission: GenericNode,
  AdminReview: GenericNode,
  // Phase 2 — new activity nodes
  ApprovalActivity: ApprovalNode,
  MeetingActivity: MeetingNode,
  AwaitSignalActivity: AwaitSignalNode,
  InternalFollowupSelectionActivity: InternalFollowupSelectionNode,
  RequestSubmissionActivity: RequestSubmissionNode,
  AdminReviewActivity: AdminReviewNode,
  TimerActivity: TimerNode,
};

const edgeTypes: EdgeTypes = {
  workflow: WorkflowEdge,
};

const defaultEdgeOptions: DefaultEdgeOptions = {
  type: 'workflow',
  markerEnd: { type: MarkerType.ArrowClosed },
};

function WorkflowCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);
  const setNodes = useWorkflowStore((s) => s.setNodes);
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const selectEdge = useWorkflowStore((s) => s.selectEdge);
  const clearSelection = useWorkflowStore((s) => s.clearSelection);
  const addActivity = useWorkflowStore((s) => s.addActivity);
  const addTransition = useWorkflowStore((s) => s.addTransition);

  const [localNodes, setLocalNodes, onNodesChange] = useNodesState(nodes);
  const [localEdges, setLocalEdges, onEdgesChange] = useEdgesState(edges);

  // Sync store → local when store changes (e.g. loadFromSchema)
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  if (nodes !== prevNodesRef.current) {
    prevNodesRef.current = nodes;
    setLocalNodes(nodes);
  }
  if (edges !== prevEdgesRef.current) {
    prevEdgesRef.current = edges;
    setLocalEdges(edges);
  }

  const handleNodesChange: typeof onNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      // Sync positions back to store after drag
      const hasDrag = changes.some((c) => c.type === 'position' && !c.dragging);
      if (hasDrag) {
        setNodes(
          localNodes.map((n) => {
            const change = changes.find(
              (c) => c.type === 'position' && c.id === n.id,
            );
            if (change && change.type === 'position' && change.position) {
              return { ...n, position: change.position };
            }
            return n;
          }),
        );
      }
    },
    [onNodesChange, localNodes, setNodes],
  );

  const handleEdgesChange: typeof onEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
    },
    [onEdgesChange],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      // The visual "+" affordance is a separate Handle with a `__plus` suffix.
      // Rewrite to the real handle id so saved edges point at the tile-edge dot.
      const normalized: Connection = {
        ...connection,
        sourceHandle: connection.sourceHandle?.endsWith('__plus')
          ? connection.sourceHandle.slice(0, -'__plus'.length)
          : connection.sourceHandle,
      };
      addTransition(normalized);
    },
    [addTransition],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode],
  );

  const onEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const onPaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData(
        'application/workflow-activity-type',
      );
      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addActivity(type, position);
    },
    [screenToFlowPosition, addActivity],
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="workflow-canvas h-full w-full"
      style={{ background: '#1e1f24' }}
    >
      <ReactFlow
        nodes={localNodes}
        edges={localEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionLineType={ConnectionLineType.Bezier}
        connectionLineStyle={{
          stroke: '#22c55e',
          strokeWidth: 2,
          strokeDasharray: 'none',
        }}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 600 }}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#1e1f24' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1.2}
          color="rgba(255,255,255,0.08)"
        />
        <Controls
          className="!rounded-lg !border !border-zinc-700 !bg-zinc-800/90 !shadow-xl !backdrop-blur-sm overflow-hidden [&>button]:!bg-zinc-800 [&>button]:!border-zinc-700 [&>button]:!text-zinc-200 [&>button:hover]:!bg-zinc-700"
          showInteractive={false}
        />
        <MiniMap
          className="!rounded-lg !border !border-zinc-700 !bg-zinc-800/90 !shadow-xl !backdrop-blur-sm overflow-hidden"
          nodeStrokeWidth={2}
          nodeColor="#3a3e45"
          nodeStrokeColor="#4a4e57"
          maskColor="rgba(30,31,36,0.75)"
          pannable
          zoomable
        />
      </ReactFlow>
    </div>
  );
}

export function WorkflowCanvas() {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
}

import { useCallback, useRef, type DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type Edge,
  type Connection,
  useReactFlow,
  ReactFlowProvider,
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
  RequestSubmission: GenericNode,
  AdminReview: GenericNode,
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
      addTransition(connection);
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
    <div ref={reactFlowWrapper} className="h-full w-full">
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
        fitView
        deleteKeyCode={['Backspace', 'Delete']}
        className="bg-base-200"
      >
        <Background gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          className="!bg-base-100"
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

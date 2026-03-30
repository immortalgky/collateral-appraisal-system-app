import { create } from 'zustand';
import type { Node, Edge, Connection } from '@xyflow/react';
import { v4 as uuid } from 'uuid';
import type {
  ActivityType,
  WorkflowMetadata,
  WorkflowSchema,
  ActivityProperties,
} from '../types';
import {
  ActivityType as ActivityTypeEnum,
  createDefaultPropertiesForType,
} from '../types';
import { toReactFlow, type ActivityNodeData } from '../adapters/toReactFlow';
import { toWorkflowSchema } from '../adapters/toWorkflowSchema';
import { getLayoutedNodes } from '../utils/autoLayout';

interface WorkflowMeta {
  id: string;
  name: string;
  description: string;
  category: string;
  variables: Record<string, string>;
  metadata: WorkflowMetadata;
}

interface WorkflowBuilderState {
  nodes: Node<ActivityNodeData>[];
  edges: Edge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  workflowMeta: WorkflowMeta;
  isDirty: boolean;

  setNodes: (nodes: Node<ActivityNodeData>[]) => void;
  setEdges: (edges: Edge[]) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;

  addActivity: (type: ActivityType | string, position: { x: number; y: number }) => void;
  updateActivityData: (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      properties: ActivityProperties;
      requiredRoles: string[];
    }>,
  ) => void;
  removeActivity: (id: string) => void;

  addTransition: (connection: Connection) => void;
  updateTransition: (
    id: string,
    data: { condition: string | null; type: 'Normal' | 'Conditional' },
  ) => void;
  removeTransition: (id: string) => void;

  updateMeta: (meta: Partial<Omit<WorkflowMeta, 'metadata'>>) => void;
  updateMetadata: (metadata: Partial<WorkflowMetadata>) => void;

  autoLayout: () => void;
  loadFromSchema: (schema: WorkflowSchema) => void;
  toSchema: () => WorkflowSchema;
  markClean: () => void;
  reset: () => void;
}

const defaultMeta: WorkflowMeta = {
  id: '',
  name: '',
  description: '',
  category: '',
  variables: {},
  metadata: {
    author: '',
    createdDate: new Date().toISOString(),
    version: '1.0',
    tags: [],
    customProperties: {},
  },
};

function createDefaultActivityName(type: ActivityType | string): string {
  switch (type) {
    case ActivityTypeEnum.START:
      return 'Workflow Start';
    case ActivityTypeEnum.TASK:
      return 'New Task';
    case ActivityTypeEnum.ROUTING:
      return 'Routing';
    case ActivityTypeEnum.COMPANY_SELECTION:
      return 'Company Selection';
    case ActivityTypeEnum.IF_ELSE:
      return 'If/Else';
    case ActivityTypeEnum.SWITCH:
      return 'Switch';
    case ActivityTypeEnum.FORK:
      return 'Fork';
    case ActivityTypeEnum.JOIN:
      return 'Join';
    case ActivityTypeEnum.REQUEST_SUBMISSION:
      return 'Request Submission';
    case ActivityTypeEnum.ADMIN_REVIEW:
      return 'Admin Review';
    case ActivityTypeEnum.END:
      return 'Workflow End';
    default:
      return type;
  }
}

export const useWorkflowStore = create<WorkflowBuilderState>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  workflowMeta: { ...defaultMeta },
  isDirty: false,

  setNodes: (nodes) => set({ nodes, isDirty: true }),
  setEdges: (edges) => set({ edges, isDirty: true }),

  selectNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
  selectEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
  clearSelection: () => set({ selectedNodeId: null, selectedEdgeId: null }),

  addActivity: (type, position) => {
    const id = uuid();
    const name = createDefaultActivityName(type);
    const properties = createDefaultPropertiesForType(type);

    const newNode: Node<ActivityNodeData> = {
      id,
      type,
      position,
      data: {
        id,
        name,
        type,
        description: '',
        properties,
        position,
        requiredRoles: [],
        isStartActivity: type === ActivityTypeEnum.START,
        isEndActivity: type === ActivityTypeEnum.END,
      },
    };

    set((state) => ({
      nodes: [...state.nodes, newNode],
      isDirty: true,
      selectedNodeId: id,
      selectedEdgeId: null,
    }));
  },

  updateActivityData: (id, data) => {
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== id) return node;
        return {
          ...node,
          data: { ...node.data, ...data },
        };
      }),
      isDirty: true,
    }));
  },

  removeActivity: (id) => {
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
      selectedNodeId:
        state.selectedNodeId === id ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },

  addTransition: (connection) => {
    if (!connection.source || !connection.target) return;

    const id = uuid();
    const newEdge: Edge = {
      id,
      source: connection.source,
      target: connection.target,
      sourceHandle: connection.sourceHandle,
      targetHandle: connection.targetHandle,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as const },
      data: {
        id,
        from: connection.source,
        to: connection.target,
        condition: null,
        properties: {},
        type: 'Normal',
      },
    };

    set((state) => ({
      edges: [...state.edges, newEdge],
      isDirty: true,
      selectedEdgeId: id,
      selectedNodeId: null,
    }));
  },

  updateTransition: (id, data) => {
    set((state) => ({
      edges: state.edges.map((edge) => {
        if (edge.id !== id) return edge;
        const isConditional = data.type === 'Conditional';
        return {
          ...edge,
          label: data.condition
            ? data.condition.length > 30
              ? `${data.condition.slice(0, 30)}…`
              : data.condition
            : undefined,
          animated: !isConditional,
          style: {
            stroke: isConditional ? '#6366f1' : '#94a3b8',
            strokeWidth: 2,
          },
          data: {
            ...edge.data,
            condition: data.condition,
            type: data.type,
          },
        };
      }),
      isDirty: true,
    }));
  },

  removeTransition: (id) => {
    set((state) => ({
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId:
        state.selectedEdgeId === id ? null : state.selectedEdgeId,
      isDirty: true,
    }));
  },

  updateMeta: (meta) => {
    set((state) => ({
      workflowMeta: { ...state.workflowMeta, ...meta },
      isDirty: true,
    }));
  },

  updateMetadata: (metadata) => {
    set((state) => ({
      workflowMeta: {
        ...state.workflowMeta,
        metadata: { ...state.workflowMeta.metadata, ...metadata },
      },
      isDirty: true,
    }));
  },

  autoLayout: () => {
    const { nodes, edges } = get();
    const layouted = getLayoutedNodes(nodes, edges);
    set({ nodes: layouted, isDirty: true });
  },

  loadFromSchema: (schema) => {
    const { nodes, edges } = toReactFlow(schema);
    set({
      nodes,
      edges,
      workflowMeta: {
        id: schema.id,
        name: schema.name,
        description: schema.description,
        category: schema.category,
        variables: schema.variables,
        metadata: schema.metadata,
      },
      isDirty: false,
      selectedNodeId: null,
      selectedEdgeId: null,
    });
  },

  toSchema: () => {
    const { nodes, edges, workflowMeta } = get();
    return toWorkflowSchema(
      nodes,
      edges,
      {
        id: workflowMeta.id,
        name: workflowMeta.name,
        description: workflowMeta.description,
        category: workflowMeta.category,
      },
      workflowMeta.variables,
      workflowMeta.metadata,
    );
  },

  markClean: () => set({ isDirty: false }),

  reset: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      workflowMeta: { ...defaultMeta },
      isDirty: false,
    });
  },
}));

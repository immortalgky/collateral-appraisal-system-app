import type { Node, Edge } from '@xyflow/react';
import type {
  Activity,
  Transition,
  TransitionType,
  WorkflowMetadata,
  WorkflowSchema,
} from '../types';
import type { ActivityNodeData } from './toReactFlow';

export function nodeToActivity(node: Node<ActivityNodeData>): Activity {
  return {
    id: node.id,
    name: node.data.name,
    type: node.data.type,
    description: node.data.description,
    properties: node.data.properties,
    position: node.position,
    requiredRoles: node.data.requiredRoles,
    isStartActivity: node.data.isStartActivity,
    isEndActivity: node.data.isEndActivity,
  };
}

export function edgeToTransition(edge: Edge): Transition {
  return {
    id: edge.id,
    from: edge.source,
    to: edge.target,
    condition: (edge.data?.condition as string) ?? null,
    properties: (edge.data?.properties as Record<string, unknown>) ?? {},
    type: (edge.data?.type as TransitionType) ?? 'Normal',
  };
}

export function toWorkflowSchema(
  nodes: Node<ActivityNodeData>[],
  edges: Edge[],
  meta: {
    id: string;
    name: string;
    description: string;
    category: string;
  },
  variables: Record<string, string>,
  metadata: WorkflowMetadata,
): WorkflowSchema {
  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    category: meta.category,
    activities: nodes.map(nodeToActivity),
    transitions: edges.map(edgeToTransition),
    variables,
    metadata,
  };
}

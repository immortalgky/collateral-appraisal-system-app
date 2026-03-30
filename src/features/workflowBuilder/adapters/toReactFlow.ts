import type { Node, Edge, MarkerType } from '@xyflow/react';
import type {
  Activity,
  Transition,
  WorkflowSchema,
  TaskProperties,
  RoutingProperties,
  SwitchProperties,
  ForkProperties,
} from '../types';

export type ActivityNodeData = Activity & { [key: string]: unknown };

export function activityToNode(activity: Activity): Node<ActivityNodeData> {
  return {
    id: activity.id,
    type: activity.type,
    position: activity.position,
    data: { ...activity },
  };
}

export function transitionToEdge(transition: Transition): Edge {
  const isConditional = transition.type === 'Conditional';

  return {
    id: transition.id,
    source: transition.from,
    target: transition.to,
    type: 'smoothstep',
    label: transition.condition
      ? truncateLabel(transition.condition, 30)
      : undefined,
    animated: !isConditional,
    style: {
      stroke: isConditional ? '#6366f1' : '#94a3b8',
      strokeWidth: 2,
    },
    markerEnd: { type: 'arrowclosed' as MarkerType },
    data: { ...transition },
    sourceHandle: getSourceHandle(transition),
  };
}

function getSourceHandle(transition: Transition): string | undefined {
  if (!transition.condition) return undefined;
  const match = transition.condition.match(/decision\s*==\s*'(\w+)'/);
  return match?.[1] ?? undefined;
}

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength)}…`;
}

export function toReactFlow(schema: WorkflowSchema): {
  nodes: Node<ActivityNodeData>[];
  edges: Edge[];
} {
  const nodes = schema.activities.map(activityToNode);
  const edges = schema.transitions.map(transitionToEdge);
  return { nodes, edges };
}

export function getHandleIds(activity: Activity): string[] {
  switch (activity.type) {
    case 'TaskActivity': {
      const props = activity.properties as TaskProperties;
      return Object.keys(props.decisionConditions ?? {});
    }
    case 'RoutingActivity': {
      const props = activity.properties as RoutingProperties;
      const keys = Object.keys(props.routingConditions ?? {});
      if (props.defaultDecision) keys.push(props.defaultDecision);
      return keys;
    }
    case 'IfElseActivity':
      return ['true', 'false'];
    case 'SwitchActivity': {
      const props = activity.properties as SwitchProperties;
      return [...Object.keys(props.cases ?? {}), 'default'];
    }
    case 'ForkActivity': {
      const props = activity.properties as ForkProperties;
      return props.branches ?? [];
    }
    default:
      return [];
  }
}

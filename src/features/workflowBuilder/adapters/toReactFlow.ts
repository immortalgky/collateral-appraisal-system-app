import type { Node, Edge, MarkerType } from '@xyflow/react';
import type {
  Activity,
  Transition,
  WorkflowSchema,
  TaskProperties,
  RoutingProperties,
  SwitchProperties,
  ForkProperties,
  ApprovalProperties,
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

export function transitionToEdge(
  transition: Transition,
  sourceActivity?: Activity,
): Edge {
  const isConditional = transition.type === 'Conditional';

  return {
    id: transition.id,
    source: transition.from,
    target: transition.to,
    type: 'workflow',
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
    sourceHandle: resolveSourceHandle(transition, sourceActivity),
  };
}

/**
 * Resolves the ReactFlow sourceHandle for a transition.
 *
 * Priority:
 * 1. transition.properties.sourceHandle (authoritative — set on save)
 * 2. Infer from source activity type + condition string
 * 3. Generic regex fallback verified against real handle ids
 * 4. undefined → ReactFlow uses default handle
 */
function resolveSourceHandle(
  transition: Transition,
  sourceActivity?: Activity,
): string | undefined {
  // 1. Authoritative stored value (prefer namespaced UI-only key; fall back to legacy)
  const storedUi = transition.properties?._uiSourceHandle;
  if (typeof storedUi === 'string' && storedUi.length > 0) return storedUi;
  const stored = transition.properties?.sourceHandle;
  if (typeof stored === 'string' && stored.length > 0) return stored;

  if (!transition.condition || !sourceActivity) return undefined;

  const condition = transition.condition;
  const activityType = sourceActivity.type;

  // 2. Type-specific inference
  switch (activityType) {
    case 'SwitchActivity': {
      const m = condition.match(/case\s*==\s*'([^']+)'/);
      if (m) return m[1];
      // condition present but no case match → default branch
      return 'default';
    }

    case 'IfElseActivity': {
      const m = condition.match(/result\s*==\s*(true|false)/i);
      if (m) return m[1].toLowerCase();
      return undefined;
    }

    case 'TaskActivity':
    case 'RoutingActivity':
    case 'CompanySelectionActivity':
    case 'InternalFollowupSelectionActivity':
    case 'ApprovalActivity': {
      // Strip compound suffix: "decision == 'X' && assignmentType == 'Y'" → "decision == 'X'"
      const stripped = condition.replace(/\s*&&.+$/, '');
      const m = stripped.match(/decision\s*==\s*'([^']+)'/);
      if (m) return m[1];
      return undefined;
    }

    case 'ForkActivity': {
      // Prefer explicit branchId property
      const branchId = transition.properties?.branchId;
      if (typeof branchId === 'string' && branchId.length > 0) return branchId;
      // Fall through to generic regex
      break;
    }
  }

  // 3. Generic fallback: any `word == 'value'` — only return if the value is a real handle
  const handles = getHandleIds(sourceActivity);
  if (handles.length > 0) {
    const m = condition.match(/(\w+)\s*==\s*'([^']+)'/);
    if (m) {
      const candidate = m[2];
      if (handles.includes(candidate)) return candidate;
    }
  }

  return undefined;
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
  const byId = new Map(schema.activities.map((a) => [a.id, a]));
  const edges = schema.transitions.map((t) =>
    transitionToEdge(t, byId.get(t.from)),
  );
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
      return [...(props.cases ?? []), 'default'];
    }
    case 'ForkActivity': {
      const props = activity.properties as ForkProperties;
      return props.branches ?? [];
    }
    case 'ApprovalActivity': {
      const props = activity.properties as ApprovalProperties;
      return Object.keys(props.decisionConditions ?? {});
    }
    case 'InternalFollowupSelectionActivity':
      return ['staff_selected', 'no_match'];
    default:
      return [];
  }
}

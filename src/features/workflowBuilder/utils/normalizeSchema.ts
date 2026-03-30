import type { WorkflowSchema, Activity, Transition } from '../types';

/**
 * Normalizes a workflow schema from PascalCase (backend C# default) to camelCase (frontend).
 * Handles both casings gracefully — if already camelCase, returns as-is.
 */
export function normalizeSchema(raw: Record<string, unknown>): WorkflowSchema {
  return {
    id: str(raw, 'id'),
    name: str(raw, 'name'),
    description: str(raw, 'description'),
    category: str(raw, 'category'),
    activities: arr(raw, 'activities').map(normalizeActivity),
    transitions: arr(raw, 'transitions').map(normalizeTransition),
    variables: (obj(raw, 'variables') ?? {}) as Record<string, string>,
    metadata: normalizeMetadata(obj(raw, 'metadata') ?? {}),
  };
}

function normalizeActivity(raw: unknown): Activity {
  const r = raw as Record<string, unknown>;
  return {
    id: str(r, 'id'),
    name: str(r, 'name'),
    type: str(r, 'type'),
    description: str(r, 'description'),
    properties: (obj(r, 'properties') ?? {}) as Activity['properties'],
    position: normalizePosition(obj(r, 'position') ?? {}),
    requiredRoles: arr(r, 'requiredRoles') as string[],
    isStartActivity: bool(r, 'isStartActivity'),
    isEndActivity: bool(r, 'isEndActivity'),
  };
}

// C# TransitionType enum: Normal=0, Conditional=1, Exception=2, Timeout=3
const TRANSITION_TYPE_MAP: Record<number, string> = {
  0: 'Normal',
  1: 'Conditional',
  2: 'Exception',
  3: 'Timeout',
};

function normalizeTransitionType(raw: unknown): 'Normal' | 'Conditional' {
  if (typeof raw === 'number') {
    return (TRANSITION_TYPE_MAP[raw] ?? 'Normal') as 'Normal' | 'Conditional';
  }
  if (typeof raw === 'string' && raw === 'Conditional') return 'Conditional';
  return 'Normal';
}

function normalizeTransition(raw: unknown): Transition {
  const r = raw as Record<string, unknown>;
  const rawType = r['type'] ?? r['Type'];
  return {
    id: str(r, 'id'),
    from: str(r, 'from'),
    to: str(r, 'to'),
    condition: strOrNull(r, 'condition'),
    properties: (obj(r, 'properties') ?? {}) as Record<string, unknown>,
    type: normalizeTransitionType(rawType),
  };
}

function normalizePosition(raw: Record<string, unknown>) {
  return {
    x: num(raw, 'x'),
    y: num(raw, 'y'),
  };
}

function normalizeMetadata(raw: Record<string, unknown>) {
  return {
    author: str(raw, 'author'),
    createdDate: str(raw, 'createdDate'),
    version: str(raw, 'version') || '1.0',
    tags: arr(raw, 'tags') as string[],
    customProperties: (obj(raw, 'customProperties') ?? {}) as Record<string, unknown>,
  };
}

// Helpers that check both camelCase and PascalCase keys

function str(obj: Record<string, unknown>, key: string): string {
  return ((obj[key] ?? obj[pascal(key)]) as string) ?? '';
}

function strOrNull(obj: Record<string, unknown>, key: string): string | null {
  return ((obj[key] ?? obj[pascal(key)]) as string) ?? null;
}

function num(obj: Record<string, unknown>, key: string): number {
  return ((obj[key] ?? obj[pascal(key)]) as number) ?? 0;
}

function bool(obj: Record<string, unknown>, key: string): boolean {
  return ((obj[key] ?? obj[pascal(key)]) as boolean) ?? false;
}

function arr(obj: Record<string, unknown>, key: string): unknown[] {
  return ((obj[key] ?? obj[pascal(key)]) as unknown[]) ?? [];
}

function obj(obj: Record<string, unknown>, key: string): Record<string, unknown> | null {
  return ((obj[key] ?? obj[pascal(key)]) as Record<string, unknown>) ?? null;
}

function pascal(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1);
}

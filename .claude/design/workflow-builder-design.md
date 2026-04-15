# Workflow Builder — Design Document

## Understanding Summary

1. **What:** A visual workflow builder using react-flow where system admins and developers can create, edit, and manage appraisal workflow definitions via drag-and-drop
2. **Why:** To provide a low-code visual tool for defining and modifying approval/task workflows without hand-editing JSON
3. **Who:** System admins configuring workflows + developers managing workflow definitions
4. **Activity types:** 4 types (Start, Routing, Task, End), each with a type-specific property editing form in a side panel
5. **Adding nodes:** Side palette with draggable activity types
6. **Connections:** Visual edge drawing + condition editing via dropdown builder with raw expression toggle
7. **Persistence:** Draft + Publish model — drafts saved to backend API, explicit publish action
8. **Backend:** GET exists today; POST/PUT/DELETE and draft endpoints are planned
9. **Scale:** Small workflows (5-15 nodes), no need for virtualization
10. **Non-goal:** This is not a workflow runtime/execution engine — it's a definition builder only

## Assumptions

- The workflow JSON schema (activity types, transition shape, variables, metadata) is **stable** — we build forms around this structure
- Draft API will follow a similar shape to the workflow definition (e.g. `POST /workflows/drafts`, `PUT /workflows/drafts/:id`)
- Until POST/PUT/DELETE APIs exist, we can build the UI with mock/stubbed mutations and wire up real endpoints later
- The builder will be a new feature under `src/features/workflowBuilder/`
- No real-time collaboration (single user editing at a time)
- Workflow variables and metadata are editable but secondary to the visual canvas

---

## Architecture

### Feature Structure

```
src/features/workflowBuilder/
├── api/
│   ├── queryKeys.ts          # Query key factory
│   └── index.ts              # React Query hooks (fetch, saveDraft, publish)
├── adapters/
│   ├── toReactFlow.ts        # JSON definition → react-flow nodes/edges
│   └── toWorkflowSchema.ts   # react-flow nodes/edges → JSON definition
├── components/
│   ├── canvas/
│   │   ├── WorkflowCanvas.tsx       # ReactFlow wrapper
│   │   └── nodes/
│   │       ├── StartNode.tsx
│   │       ├── TaskNode.tsx
│   │       ├── RoutingNode.tsx
│   │       └── EndNode.tsx
│   ├── palette/
│   │   └── ActivityPalette.tsx      # Left sidebar with draggable items
│   ├── panels/
│   │   ├── PropertyPanel.tsx        # Right panel router (renders correct form)
│   │   ├── StartForm.tsx
│   │   ├── TaskForm.tsx
│   │   ├── RoutingForm.tsx
│   │   ├── EndForm.tsx
│   │   └── TransitionForm.tsx       # Edge condition editor
│   └── toolbar/
│       └── WorkflowToolbar.tsx      # Save draft, publish, undo, metadata
├── hooks/
│   └── useWorkflowStore.ts         # Zustand store (canvas state, selection, draft)
├── types/
│   └── index.ts                     # WorkflowDefinition, Activity, Transition types
├── schemas/
│   └── index.ts                     # Zod schemas for form validation
└── pages/
    └── WorkflowBuilderPage.tsx      # Main page, composes everything
```

---

## Data Model

### Core Types

```typescript
type ActivityType = 'StartActivity' | 'TaskActivity' | 'RoutingActivity' | 'EndActivity'
type TransitionType = 'Normal' | 'Conditional'

interface Activity {
  id: string
  name: string
  type: ActivityType
  description: string
  properties: StartProperties | TaskProperties | RoutingProperties | EndProperties
  position: { x: number; y: number }
  requiredRoles: string[]
  isStartActivity: boolean
  isEndActivity: boolean
}

interface Transition {
  id: string
  from: string
  to: string
  condition: string | null
  properties: Record<string, unknown>
  type: TransitionType
}

interface WorkflowSchema {
  id: string
  name: string
  description: string
  category: string
  activities: Activity[]
  transitions: Transition[]
  variables: Record<string, string>
  metadata: WorkflowMetadata
}
```

### Type-Specific Properties

- **StartProperties:** `{}` (empty)
- **TaskProperties:** `activityName`, `assigneeRole`, `assigneeGroup`, `assignmentStrategies`, `initialAssignmentStrategies`, `revisitAssignmentStrategies`, `timeoutDuration`, `decisionConditions`
- **RoutingProperties:** `routingConditions`, `defaultDecision`
- **EndProperties:** `completionMessage`

---

## Adapter Layer

### toReactFlow.ts

```typescript
function activityToNode(activity: Activity): Node {
  return {
    id: activity.id,
    type: activity.type,
    position: activity.position,
    data: activity,
  }
}

function transitionToEdge(transition: Transition): Edge {
  return {
    id: transition.id,
    source: transition.from,
    target: transition.to,
    type: transition.type === 'Conditional' ? 'conditional' : 'default',
    label: transition.condition ?? '',
    data: transition,
  }
}

function toReactFlow(schema: WorkflowSchema): { nodes: Node[]; edges: Edge[] }
```

### toWorkflowSchema.ts

```typescript
function toWorkflowSchema(
  nodes: Node[],
  edges: Edge[],
  metadata: WorkflowMetadata,
  variables: Record<string, string>
): WorkflowSchema
```

- Full Activity object stored as `node.data` — no separate lookup needed
- Position sync: react-flow drag updates → adapter reads back on save
- Pure functions, easy to unit test

---

## State Management

### Zustand Store

```typescript
interface WorkflowBuilderState {
  // Canvas state
  nodes: Node[]
  edges: Edge[]

  // Selection
  selectedNodeId: string | null
  selectedEdgeId: string | null

  // Draft metadata
  workflowMeta: {
    id: string
    name: string
    description: string
    category: string
    variables: Record<string, string>
    metadata: WorkflowMetadata
  }

  // Draft status
  isDirty: boolean

  // Actions
  setNodes: (nodes: Node[]) => void
  setEdges: (edges: Edge[]) => void
  selectNode: (id: string | null) => void
  selectEdge: (id: string | null) => void

  addActivity: (type: ActivityType, position: { x: number; y: number }) => void
  updateActivityProperties: (id: string, properties: Activity['properties']) => void
  removeActivity: (id: string) => void

  addTransition: (from: string, to: string) => void
  updateTransitionCondition: (id: string, condition: string | null, type: TransitionType) => void
  removeTransition: (id: string) => void

  updateMeta: (meta: Partial<WorkflowBuilderState['workflowMeta']>) => void

  loadFromSchema: (schema: WorkflowSchema) => void
  toSchema: () => WorkflowSchema
}
```

### Data Flow

```
Server (GET) → React Query → loadFromSchema() → Zustand (nodes/edges)
                                                       ↓
                                              react-flow renders
                                                       ↓
                                              user edits (drag, connect, edit props)
                                                       ↓
                                              Zustand updates (isDirty = true)
                                                       ↓
                                   Save Draft → toSchema() → React Query mutation → API
```

---

## Canvas & Custom Nodes

### Node types registered with react-flow

| Type | Visual | Content | Handles |
|------|--------|---------|---------|
| **StartNode** | Green circle/pill, small | "Start" label | 1 source (bottom) |
| **EndNode** | Red circle/pill, small | Name label | 1 target (top) |
| **TaskNode** | Card with colored left border | Name, role badge, timeout badge | 1 target (top), N source (bottom) per decision |
| **RoutingNode** | Diamond/hexagon shape | Name, condition count | 1 target (top), N source per condition + default |

### ActivityPalette

Left sidebar with 4 draggable items. Uses HTML drag API with `dataTransfer.setData('activityType', type)`. Canvas `onDrop` reads this and calls `store.addActivity(type, dropPosition)`.

---

## Property Panel

### Panel routing

```
selectedNodeId → look up node → switch on node.data.type → render form
selectedEdgeId → look up edge → render TransitionForm
nothing selected → panel hidden
```

### Type-specific forms (React Hook Form + Zod)

- **StartForm:** Name, description
- **TaskForm:** Activity name, assignee role, assignee group, initial/revisit assignment strategies (multi-select), timeout duration (ISO 8601 picker), decision conditions (key-value list)
- **RoutingForm:** Name, description, routing conditions (key-value list), default decision (dropdown)
- **EndForm:** Name, completion message
- **TransitionForm:** Type toggle (Normal/Conditional), dropdown condition builder + raw expression toggle

Forms call `store.updateActivityProperties(nodeId, formValues)` on change (debounced).

---

## API Layer

### Query Keys

```typescript
const workflowKeys = {
  all: ['workflows'] as const,
  detail: (id: string) => ['workflows', id] as const,
  draft: (id: string) => ['workflows', id, 'draft'] as const,
}
```

### Hooks

- `useGetWorkflow(id)` — exists today
- `useGetDraft(workflowId)` — planned
- `useSaveDraft()` — planned (POST/PUT)
- `useDeleteDraft()` — planned
- `usePublishWorkflow()` — planned (PUT)
- `useCreateWorkflow()` — planned (POST)

Mutations stubbed until backend is ready — only URL change needed.

### Draft + Publish Flow

```
User opens builder
       ↓
  Has draft? ──yes──→ Load draft into store
       │
      no
       ↓
  Load live workflow → auto-create draft → load into store
       ↓
  User edits on canvas
       ↓
  "Save Draft" → store.toSchema() → useSaveDraft mutation
       ↓
  "Publish" → confirmation dialog → usePublishWorkflow mutation
                                          ↓
                                Invalidate workflow query
                                Delete draft
                                Show success toast
```

### Unsaved Changes Guard

- `isDirty` flag tracks changes since last draft save
- `beforeunload` event warns on browser close/refresh
- React Router `useBlocker` warns on in-app navigation

---

## Page Layout & Routing

### Routes

- `/workflow-builder/:workflowId` — edit existing
- `/workflow-builder/new` — create new (empty schema with StartNode)

Under main `Layout` (not `AppraisalLayout`) — admin-level feature.

### Layout

```
┌──────────────────────────────────────────────────────┐
│  WorkflowToolbar                                     │
│  [Save Draft] [Publish] [Workflow Name] [Settings ⚙] │
├────────┬─────────────────────────┬───────────────────┤
│        │                         │                   │
│Activity│                         │  Property Panel   │
│Palette │    WorkflowCanvas       │  (slides open     │
│        │    (react-flow)         │   on selection)   │
│ Start  │                         │                   │
│ Task   │                         │  [TaskForm]       │
│ Route  │                         │  or               │
│ End    │                         │  [TransitionForm] │
│        │                         │  etc.             │
│        │                         │                   │
├────────┴─────────────────────────┴───────────────────┤
│  MiniMap (react-flow built-in)    Zoom controls      │
└──────────────────────────────────────────────────────┘
```

- **Left palette:** fixed ~200px, collapsible
- **Canvas:** flex, takes remaining space
- **Right panel:** ~320px, rendered only when selected
- **Keyboard shortcuts:** Ctrl+S = save draft, Delete = remove selected

---

## Decision Log

| # | Decision | Alternatives Considered | Why Chosen |
|---|----------|------------------------|------------|
| 1 | Users: System admins + developers | Business analysts, view-only | Target users need full control |
| 2 | Full CRUD on workflows | Edit-only, view-only | Admins need to create from scratch |
| 3 | Type-specific property forms | Generic form, curated subset | Distinct properties per type; tailored forms reduce complexity |
| 4 | Draft + Publish persistence | Real-time save, explicit save, JSON export | Prevents accidental live changes |
| 5 | Side palette for adding nodes | Context menu, toolbar buttons | Standard builder pattern, most discoverable |
| 6 | Dropdown builder + raw expression toggle | Text-only, dropdown-only | Accessible for admins, flexible for devs |
| 7 | Canvas + Sliding Panel layout | Tab-based, modal-based | No context switching, uses existing react-resizable-panels |
| 8 | Full Activity as node data | Lookup map, normalized store | Simple; small scale makes this fine |
| 9 | Multiple source handles per decision | Single output handle | Visual clarity on decision paths |
| 10 | Zustand (canvas) + React Query (server) | All Zustand, all RQ | Matches project conventions |
| 11 | Route under main Layout | Nested under appraisal | Admin-level, not appraisal-specific |
| 12 | Stub mutations until APIs exist | Wait for backend, mock server | Unblocks frontend work |

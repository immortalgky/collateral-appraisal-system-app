# Construction Inspection - Frontend Implementation Guide

This guide covers everything needed to integrate the Construction Inspection feature into the existing Building and LandAndBuilding property forms.

---

## Table of Contents

1. [Overview](#overview)
2. [API Endpoints](#api-endpoints)
3. [Request Payload](#request-payload)
4. [Response Payload](#response-payload)
5. [Null Handling Rules](#null-handling-rules)
6. [Server-Side Calculations](#server-side-calculations)
7. [Seed Data Reference](#seed-data-reference)
8. [TypeScript Types](#typescript-types)
9. [UI Flow](#ui-flow)

---

## Overview

Construction Inspection is **embedded** in the existing Building and LandAndBuilding property endpoints. It is **not** a separate API.

- The feature is only relevant when `isUnderConstruction = true`
- Two modes: **Full Detail** (grouped work items table) and **Summary** (simple overview with document upload)
- Construction data is sent as an optional `constructionInspection` field in create/update requests
- Construction data is returned in GET responses when it exists

---

## API Endpoints

No new endpoints. Construction data is added to these existing endpoints:

### Building Property

| Method | Endpoint | Action |
|--------|----------|--------|
| `POST` | `/appraisals/{appraisalId}/building-properties` | Create with construction |
| `PUT` | `/appraisals/{appraisalId}/properties/{propertyId}/building-detail` | Update with construction |
| `GET` | `/appraisals/{appraisalId}/properties/{propertyId}/building-detail` | Get (includes construction) |

### LandAndBuilding Property

| Method | Endpoint | Action |
|--------|----------|--------|
| `POST` | `/appraisals/{appraisalId}/land-and-building-properties` | Create with construction |
| `PUT` | `/appraisals/{appraisalId}/properties/{propertyId}/land-and-building-detail` | Update with construction |
| `GET` | `/appraisals/{appraisalId}/properties/{propertyId}/land-and-building-detail` | Get (includes construction) |

---

## Request Payload

Add `constructionInspection` as an optional field in the existing request body.

### Full Detail Mode Example

```json
{
  "isUnderConstruction": true,
  "constructionCompletionPercent": 93.05,
  "...other building fields...": "...",

  "constructionInspection": {
    "isFullDetail": true,
    "totalValue": 19856000.00,
    "workDetails": [
      {
        "id": null,
        "constructionWorkGroupId": "guid-of-building-structure-group",
        "constructionWorkItemId": "guid-of-pillar-item",
        "workItemName": "Pillar",
        "displayOrder": 1,
        "proportionPct": 12.50,
        "previousProgressPct": 50.00,
        "currentProgressPct": 100.00
      },
      {
        "id": null,
        "constructionWorkGroupId": "guid-of-building-structure-group",
        "constructionWorkItemId": "guid-of-floor-item",
        "workItemName": "Floor",
        "displayOrder": 2,
        "proportionPct": 15.00,
        "previousProgressPct": 50.00,
        "currentProgressPct": 100.00
      },
      {
        "id": null,
        "constructionWorkGroupId": "guid-of-architecture-group",
        "constructionWorkItemId": "guid-of-wall-item",
        "workItemName": "Wall",
        "displayOrder": 1,
        "proportionPct": 20.00,
        "previousProgressPct": 0.00,
        "currentProgressPct": 100.00
      }
    ]
  }
}
```

### Summary Mode Example

```json
{
  "isUnderConstruction": true,
  "...other building fields...": "...",

  "constructionInspection": {
    "isFullDetail": false,
    "totalValue": 19856000.00,
    "summaryDetail": "Construction detail description here",
    "summaryPreviousProgressPct": 0.00,
    "summaryPreviousValue": 0.00,
    "summaryCurrentProgressPct": 0.00,
    "summaryCurrentValue": 0.00,
    "remark": "Additional remarks",
    "documentId": "guid-of-uploaded-document",
    "documentFileName": "construction-detail.pdf",
    "documentFilePath": "/uploads/documents/construction-detail.pdf"
  }
}
```

### Clear Construction Data

Send `null` to clear existing construction data:

```json
{
  "isUnderConstruction": false,
  "constructionInspection": null
}
```

---

## Response Payload

GET endpoints return `constructionInspection` nested in the response. Returns `null` if no construction data exists.

### Full Detail Response Example

```json
{
  "propertyId": "...",
  "isUnderConstruction": true,
  "...other building fields...": "...",

  "constructionInspection": {
    "id": "guid-of-inspection",
    "appraisalPropertyId": "guid-of-property",
    "isFullDetail": true,
    "totalValue": 19856000.00,
    "summaryDetail": null,
    "summaryPreviousProgressPct": null,
    "summaryPreviousValue": null,
    "summaryCurrentProgressPct": null,
    "summaryCurrentValue": null,
    "remark": null,
    "documentId": null,
    "documentFileName": null,
    "documentFilePath": null,
    "workDetails": [
      {
        "id": "guid-of-work-detail",
        "constructionWorkGroupId": "guid-of-building-structure-group",
        "constructionWorkItemId": "guid-of-pillar-item",
        "workItemName": "Pillar",
        "displayOrder": 1,
        "constructionValue": 2482000.00,
        "previousProgressPct": 50.0000,
        "currentProgressPct": 100.0000,
        "proportionPct": 12.5000,
        "currentProportionPct": 12.5000,
        "previousPropertyValue": 1241000.00,
        "currentPropertyValue": 2482000.00
      }
    ]
  }
}
```

### No Construction Data

```json
{
  "constructionInspection": null
}
```

---

## Null Handling Rules

| Scenario | Behavior |
|----------|----------|
| `constructionInspection: null` | **Clears** existing construction data |
| `isUnderConstruction: false` | **Clears** existing construction data (even if `constructionInspection` is provided) |
| `constructionInspection: {...}` with `isUnderConstruction: true` | **Creates or updates** construction data |
| Work detail with `id: null` | Creates a new work detail |
| Work detail with `id: "existing-guid"` | Updates existing work detail |

**Important**: On update, the server does a full sync — work details not included in the request are **deleted**.

---

## Server-Side Calculations

The following fields are **computed by the server** — do NOT send them in requests. They are only present in GET responses.

**User enters:** `proportionPct`, `previousProgressPct`, `currentProgressPct`

**Server computes:**
```
For each work detail:
  constructionValue     = totalValue * (proportionPct / 100)
  currentProportionPct  = proportionPct * (currentProgressPct / 100)
  previousPropertyValue = constructionValue * (previousProgressPct / 100)
  currentPropertyValue  = constructionValue * (currentProgressPct / 100)
```

### Group Subtotals (frontend calculation for display)

```
Group Subtotal ConstructionValue = SUM(workDetails.constructionValue) where groupId matches
Group Subtotal ProportionPct     = SUM(workDetails.proportionPct) where groupId matches
Group Subtotal CurrentProgressPct = weighted average based on values
...etc for all columns
```

### Total Building Value (frontend calculation for display)

```
Total = SUM of all group subtotals
```

---

## Seed Data Reference

Work groups and items are predefined. Frontend should **hardcode** these for the dropdown.

### Work Groups

| Code | Thai | English | Display Order |
|------|------|---------|---------------|
| `BuildingStructure` | งานโครงสร้าง | Building Structure | 1 |
| `Architecture` | งานสถาปัตยกรรม | Architecture | 2 |
| `BuildingManagement` | งานระบบ | Building Management System | 3 |

### Work Items per Group

#### Building Structure (งานโครงสร้าง)

| Code | Thai | English | Order |
|------|------|---------|-------|
| `Pillar` | เสา | Pillar | 1 |
| `Floor` | พื้น | Floor | 2 |
| `Stair` | บันได | Stair | 3 |
| `RooftopFloor` | พื้นดาดฟ้า | Rooftop Floor | 4 |

#### Architecture (งานสถาปัตยกรรม)

| Code | Thai | English | Order |
|------|------|---------|-------|
| `FloorSurface` | ผิวพื้น | Floor Surface | 1 |
| `Wall` | ผนัง | Wall | 2 |
| `Ceiling` | ฝ้าเพดาน | Ceiling | 3 |
| `DoorsAndWindows` | ประตู-หน้าต่าง | Doors & Windows | 4 |
| `SanitaryWare` | สุขภัณฑ์ | Sanitary Ware | 5 |
| `Painting` | สี | Painting | 6 |
| `ArchStair` | บันได | Stair | 7 |
| `Miscellaneous` | เบ็ดเตล็ด | Miscellaneous | 8 |

#### Building Management System (งานระบบ)

| Code | Thai | English | Order |
|------|------|---------|-------|
| `ElectricalSystem` | ระบบไฟฟ้า | Electrical System | 1 |
| `SanitarySystem` | ระบบสุขาภิบาล | Sanitary System | 2 |
| `ProtectionSystem` | ระบบป้องกัน | Protection System | 3 |

---

## TypeScript Types

```typescript
// ============================================
// Request types (for POST/PUT)
// ============================================

interface ConstructionInspectionRequest {
  isFullDetail: boolean;
  totalValue: number;

  // Summary mode fields (used when isFullDetail = false)
  summaryDetail?: string | null;
  summaryPreviousProgressPct?: number | null;
  summaryPreviousValue?: number | null;
  summaryCurrentProgressPct?: number | null;
  summaryCurrentValue?: number | null;
  remark?: string | null;

  // Document reference (summary mode)
  documentId?: string | null;
  documentFileName?: string | null;
  documentFilePath?: string | null;

  // Full detail work items (used when isFullDetail = true)
  workDetails?: ConstructionWorkDetailRequest[] | null;
}

interface ConstructionWorkDetailRequest {
  id?: string | null;              // null = new, guid = update existing
  constructionWorkGroupId: string; // guid of the work group
  constructionWorkItemId?: string | null; // guid of predefined item (nullable)
  workItemName: string;            // display name
  displayOrder: number;

  // User-entered values
  proportionPct: number;           // e.g. 12.50 (% of total value)
  previousProgressPct: number;     // e.g. 50.00
  currentProgressPct: number;      // e.g. 100.00
}

// ============================================
// Response types (from GET)
// ============================================

interface ConstructionInspectionResponse {
  id: string;
  appraisalPropertyId: string;
  isFullDetail: boolean;
  totalValue: number;

  // Summary mode
  summaryDetail: string | null;
  summaryPreviousProgressPct: number | null;
  summaryPreviousValue: number | null;
  summaryCurrentProgressPct: number | null;
  summaryCurrentValue: number | null;
  remark: string | null;

  // Document reference
  documentId: string | null;
  documentFileName: string | null;
  documentFilePath: string | null;

  // Full detail work items
  workDetails: ConstructionWorkDetailResponse[] | null;
}

interface ConstructionWorkDetailResponse {
  id: string;
  constructionWorkGroupId: string;
  constructionWorkItemId: string | null;
  workItemName: string;
  displayOrder: number;

  // User-entered
  constructionValue: number;
  previousProgressPct: number;
  currentProgressPct: number;

  // Server-computed (read-only)
  proportionPct: number;
  currentProportionPct: number;
  previousPropertyValue: number;
  currentPropertyValue: number;
}

// ============================================
// Hardcoded lookup data
// ============================================

interface ConstructionWorkGroup {
  code: string;
  nameTh: string;
  nameEn: string;
  displayOrder: number;
  items: ConstructionWorkItem[];
}

interface ConstructionWorkItem {
  code: string;
  nameTh: string;
  nameEn: string;
  displayOrder: number;
}
```

---

## UI Flow

### When to Show Construction Inspection Tab

Show the "CONSTRUCTION INSPECTION" tab only when `isUnderConstruction = true` on the Building Detail.

### Mode Toggle (Enter Construction Detail: Yes/No)

- **Yes** (`isFullDetail: true`): Show the construction work table with groups
- **No** (`isFullDetail: false`): Show summary form with document upload

### Full Detail Mode

1. Display work groups as collapsible sections (Building Structure, Architecture, Building Management System)
2. Each group has a "+" button to add work items from the dropdown
3. User selects a work item from the predefined list and enters:
   - Proportion (%) — percentage of total value
   - Previous Progress (%) — may be read-only from prior inspection
   - Current Progress (%) — editable
4. Frontend calculates display values in real-time:
   - Construction Value (Baht) = totalValue * proportionPct / 100
   - Current Proportion (%) = proportionPct * currentProgressPct / 100
   - Previous Property Value = constructionValue * previousProgressPct / 100
   - Current Property Value = constructionValue * currentProgressPct / 100
5. Group subtotals: sum of all items in the group
6. Total Building Value: sum of all group subtotals
7. On save, send all work details to the server — server recomputes and persists

### Summary Mode

1. Show text input for "Detail"
2. Show Previous Progress (% and Value) and Current Progress (% and Value)
3. Show document upload area
4. Show Remark textarea
5. On save, send summary fields

### When User Toggles IsUnderConstruction to "No"

- Clear the construction inspection data
- Send `constructionInspection: null` with `isUnderConstruction: false`
- Server will delete existing construction data

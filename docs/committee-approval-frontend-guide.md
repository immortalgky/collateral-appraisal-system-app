# Committee Approval Voting - Frontend Implementation Guide

This guide covers everything the frontend team needs to integrate the committee approval voting feature. It includes API contracts, UI component breakdown, user flows, and edge case handling.

---

## Table of Contents

1. [API Endpoint Reference](#api-endpoint-reference)
2. [Vote Status Mapping](#vote-status-mapping)
3. [UI Component Breakdown](#ui-component-breakdown)
4. [User Flow](#user-flow)
5. [Polling Strategy](#polling-strategy)
6. [Decision Summary Integration](#decision-summary-integration)
7. [Edge Cases & Error Handling](#edge-cases--error-handling)

---

## API Endpoint Reference

Base URL: `https://localhost:7111` (dev)

All endpoints require an authenticated user (Bearer token).

### 1. Assign Committee

Automatically routes an appraisal to the correct committee based on total appraised value.

```
POST /appraisals/{appraisalId}/reviews/assign-committee
```

**Path Parameters:**

| Name         | Type   | Description      |
|--------------|--------|------------------|
| appraisalId  | `guid` | The appraisal ID |

**Request Body:** None

**Response `200 OK`:**

```json
{
  "reviewId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "committeeName": "Sub Committee"
}
```

**Error Responses:**

| Status | When |
|--------|------|
| `400`  | A pending committee review already exists |
| `404`  | Appraisal not found |

---

### 2. Get Approval List

Returns all committee members and their current vote status for this appraisal.

```
GET /appraisals/{appraisalId}/approval-list
```

**Path Parameters:**

| Name         | Type   | Description      |
|--------------|--------|------------------|
| appraisalId  | `guid` | The appraisal ID |

**Response `200 OK`:**

```json
{
  "committeeName": "Sub Committee",
  "reviewStatus": "Pending",
  "reviewId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "items": [
    {
      "committeeMemberId": "a1b2c3d4-...",
      "memberName": "John Smith",
      "role": "Chairman",
      "vote": null,
      "voteLabel": "Pending",
      "remark": null,
      "votedAt": null
    },
    {
      "committeeMemberId": "e5f6a7b8-...",
      "memberName": "Jane Doe",
      "role": "UW",
      "vote": "Approve",
      "voteLabel": "Agree",
      "remark": "Looks good.",
      "votedAt": "2026-03-08T10:30:00Z"
    }
  ]
}
```

**When no committee is assigned**, all fields are `null` and `items` is empty:

```json
{
  "committeeName": null,
  "reviewStatus": null,
  "reviewId": null,
  "items": []
}
```

---

### 3. Submit Vote

Submit a vote on a committee-level review. The current user must be an active committee member.

```
POST /appraisals/{appraisalId}/reviews/{reviewId}/votes
```

**Path Parameters:**

| Name         | Type   | Description      |
|--------------|--------|------------------|
| appraisalId  | `guid` | The appraisal ID |
| reviewId     | `guid` | The review ID (from Assign Committee or Approval List) |

**Request Body:**

```json
{
  "vote": "Approve",
  "remark": "Optional comment"
}
```

| Field    | Type      | Required | Values |
|----------|-----------|----------|--------|
| `vote`   | `string`  | Yes      | `"Approve"`, `"Reject"`, `"Abstain"`, `"RouteBack"` |
| `remark` | `string?` | No       | Free text comment |

**Response `200 OK`:**

```json
{
  "voteId": "d4e5f6a7-...",
  "reviewStatus": "Pending",
  "isAutoApproved": false
}
```

When the vote triggers automatic approval (majority reached):

```json
{
  "voteId": "d4e5f6a7-...",
  "reviewStatus": "Approved",
  "isAutoApproved": true
}
```

**Error Responses:**

| Status | When |
|--------|------|
| `400`  | Invalid vote value, review not pending, not a committee review, user already voted |
| `401`  | User is not authenticated |
| `404`  | Review or appraisal not found |

---

### 4. Get Decision Summary

Returns the full decision summary page data, including the approval list embedded.

```
GET /appraisals/{appraisalId}/decision-summary
```

**Response `200 OK`:**

```json
{
  "approachMatrix": [
    {
      "propertyGroupId": "...",
      "groupNumber": 1,
      "approachType": "MarketComparison",
      "finalValue": 15000000.00,
      "finalValueRounded": 15000000.00,
      "groupSummaryValue": 15000000.00
    }
  ],
  "totalAppraisalPrice": 15000000.00,
  "forceSellingPrice": 10500000.00,
  "buildingInsurance": 2000000.00,
  "governmentPrices": [
    {
      "titleNumber": "1234",
      "areaSquareWa": 100.0,
      "isMissingFromSurvey": false,
      "governmentPricePerSqWa": 50000.0,
      "governmentPrice": 5000000.0
    }
  ],
  "governmentPriceTotalArea": 100.0,
  "governmentPriceAvgPerSqWa": 50000.0,
  "totalAppraisalPriceReview": 14500000.00,
  "forceSellingPriceReview": 10150000.00,
  "buildingInsuranceReview": 2000000.00,
  "committeeName": "Sub Committee",
  "reviewStatus": "Pending",
  "reviewId": "3fa85f64-...",
  "approvalList": [
    {
      "committeeMemberId": "a1b2c3d4-...",
      "memberName": "John Smith",
      "role": "Chairman",
      "vote": "Approve",
      "voteLabel": "Agree",
      "remark": null,
      "votedAt": "2026-03-08T10:30:00Z"
    }
  ],
  "decisionId": "f1e2d3c4-...",
  "isPriceVerified": true,
  "conditionType": "Normal",
  "condition": "No special conditions",
  "remarkType": "General",
  "remark": "Approved as assessed",
  "appraiserOpinionType": "Agree",
  "appraiserOpinion": "Value is consistent with market",
  "committeeOpinionType": "Agree",
  "committeeOpinion": "Approved",
  "additionalAssumptions": null
}
```

---

### 5. Save Decision Summary

Creates or updates the decision fields (opinion, condition, remark, etc.).

```
POST /appraisals/{appraisalId}/decision-summary
```

**Request Body:**

```json
{
  "isPriceVerified": true,
  "conditionType": "Normal",
  "condition": "No special conditions",
  "remarkType": "General",
  "remark": "Approved as assessed",
  "appraiserOpinionType": "Agree",
  "appraiserOpinion": "Value is consistent with market",
  "committeeOpinionType": "Agree",
  "committeeOpinion": "Approved",
  "totalAppraisalPriceReview": 14500000.00,
  "additionalAssumptions": null
}
```

All fields are optional (nullable). Send only the fields you want to update.

**Response `200 OK`:**

```json
{
  "id": "f1e2d3c4-...",
  "appraisalId": "...",
  "isPriceVerified": true,
  "conditionType": "Normal",
  "condition": "No special conditions",
  "remarkType": "General",
  "remark": "Approved as assessed",
  "appraiserOpinionType": "Agree",
  "appraiserOpinion": "Value is consistent with market",
  "committeeOpinionType": "Agree",
  "committeeOpinion": "Approved",
  "totalAppraisalPriceReview": 14500000.00,
  "additionalAssumptions": null
}
```

---

## Vote Status Mapping

The backend stores raw vote values and returns a human-readable `voteLabel`:

| Raw `vote` (stored) | `voteLabel` (display) | Suggested Badge Color |
|----------------------|-----------------------|-----------------------|
| `null` (not voted)   | `"Pending"`           | Gray                  |
| `"Approve"`          | `"Agree"`             | Green                 |
| `"Reject"`           | `"Disagree"`          | Red                   |
| `"Abstain"`          | `"Abstain"`           | Yellow / Orange        |
| `"RouteBack"`        | `"Route Back"`        | Blue / Purple         |

**Important:** Always display `voteLabel` to users, never the raw `vote` value. The raw `vote` is available if you need conditional logic (e.g., showing a Route Back icon).

### Review Status Values

| `reviewStatus` | Meaning | UI State |
|----------------|---------|----------|
| `"Pending"`    | Awaiting votes | Voting is active |
| `"Approved"`   | Committee approved | Read-only, show success |
| `"Returned"`   | Route Back triggered | Show returned state |

---

## UI Component Breakdown

### Component 1: Assign Committee Button

**Where:** Appraisal detail page, visible after all pricing analyses are finalized.

**Behavior:**
- Show button only when `GET /approval-list` returns `committeeName: null` (no committee assigned yet)
- On click: `POST /assign-committee`
- On success: Refetch the approval list and show the voting table
- On error (400): Show toast "A committee review already exists for this appraisal"

```
+---------------------------------------------+
|  [ Assign to Committee ]                    |
|                                              |
|  (Button disabled while loading)            |
+---------------------------------------------+
```

### Component 2: Approval List Table

**Where:** Decision Summary page and/or a dedicated Approval tab.

**Data source:** `GET /appraisals/{appraisalId}/approval-list`

```
+----------------------------------------------------------+
|  Committee: Sub Committee    Status: Pending              |
+----------------------------------------------------------+
|  Member Name    | Role      | Vote     | Remark | Date   |
|-----------------|-----------|----------|--------|--------|
|  John Smith     | Chairman  | Agree    |        | 08 Mar |
|  Jane Doe       | UW        | Pending  |        |        |
|  Bob Wilson     | Risk      | Disagree | Too... | 08 Mar |
+----------------------------------------------------------+
```

**Implementation notes:**
- Use `voteLabel` for the Vote column
- Apply badge colors per the mapping table above
- Show remark in a tooltip or expandable row if text is long
- Format `votedAt` as a relative or short date
- When `reviewStatus` is `"Approved"`, show a success banner above the table

### Component 3: Vote Dialog / Modal

**Who sees it:** Only active committee members (the backend validates this, but hide the button in the UI for non-members too if your auth context includes committee membership info).

**Trigger:** "Submit Vote" button on the approval list (only when `reviewStatus === "Pending"`).

```
+------------------------------------------+
|         Submit Your Vote                  |
+------------------------------------------+
|                                           |
|  Vote:  ( ) Approve                      |
|         ( ) Reject                        |
|         ( ) Abstain                       |
|         ( ) Route Back                    |
|                                           |
|  Remark: [________________________]      |
|          (optional, textarea)             |
|                                           |
|  [Cancel]              [Submit Vote]      |
+------------------------------------------+
```

**After submission:**
- If `isAutoApproved === true`: Show success toast "Committee has approved this appraisal"
- If `isAutoApproved === false`: Show info toast "Vote recorded"
- Refetch the approval list to update the table

**Disable the vote button if:**
- Current user has already voted (their row in the list has `vote !== null`)
- `reviewStatus !== "Pending"`

---

## User Flow

### Happy Path: Committee Approval

```
1. User opens Decision Summary page
   |
   v
2. System checks: GET /approval-list
   |
   +---> items is empty? Show "Assign to Committee" button
   |
   +---> items has data? Show Approval List table
         |
         v
3. User clicks "Assign to Committee"
   POST /assign-committee
   |
   v
4. System returns { reviewId, committeeName }
   Refetch approval list -> table now shows all members as "Pending"
   |
   v
5. Committee member opens the page
   Sees their row as "Pending" with "Submit Vote" button
   |
   v
6. Member clicks "Submit Vote", selects "Approve", optionally adds remark
   POST /reviews/{reviewId}/votes
   |
   v
7a. isAutoApproved = false -> Toast "Vote recorded", refresh table
   |
7b. isAutoApproved = true  -> Toast "Approved!", reviewStatus changes to "Approved"
    Table becomes read-only, success banner shown
```

### Route Back Flow

```
1. Committee member selects "Route Back" in Vote Dialog
   |
   v
2. POST /reviews/{reviewId}/votes { vote: "RouteBack", remark: "Needs re-appraisal" }
   |
   v
3. Backend immediately returns the review to the previous level
   reviewStatus becomes "Returned"
   |
   v
4. UI shows the review as "Returned" — no more voting allowed
   The appraisal goes back to the previous reviewer
```

---

## Polling Strategy

The approval list should stay fresh when multiple committee members are voting simultaneously.

### Recommended: Polling with React Query

```typescript
// useApprovalList.ts
const useApprovalList = (appraisalId: string) => {
  return useQuery({
    queryKey: ['approval-list', appraisalId],
    queryFn: () => getApprovalList(appraisalId),
    refetchInterval: (query) => {
      // Poll every 10s while status is Pending
      const data = query.state.data;
      if (data?.reviewStatus === 'Pending') return 10_000;
      return false; // Stop polling when Approved or Returned
    },
  });
};
```

### When to Invalidate

After a successful `POST /votes`, immediately invalidate the approval list query:

```typescript
const submitVote = useMutation({
  mutationFn: (payload) => postVote(appraisalId, reviewId, payload),
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ['approval-list', appraisalId] });
    queryClient.invalidateQueries({ queryKey: ['decision-summary', appraisalId] });

    if (data.isAutoApproved) {
      toast.success('Committee has approved this appraisal');
    } else {
      toast.info('Vote recorded');
    }
  },
});
```

---

## Decision Summary Integration

The Decision Summary page (`GET /decision-summary`) already includes the approval list data. You can use either:

1. **The embedded `approvalList` from Decision Summary** — simpler, one API call
2. **The dedicated `GET /approval-list`** — use for a standalone Approval tab or when you need to poll independently

### Key Fields for the Decision Summary Form

| Field | Type | UI Control |
|-------|------|------------|
| `isPriceVerified` | `bool?` | Checkbox |
| `conditionType` | `string?` | Dropdown |
| `condition` | `string?` | Textarea |
| `remarkType` | `string?` | Dropdown |
| `remark` | `string?` | Textarea |
| `appraiserOpinionType` | `string?` | Dropdown |
| `appraiserOpinion` | `string?` | Textarea |
| `committeeOpinionType` | `string?` | Dropdown |
| `committeeOpinion` | `string?` | Textarea |
| `totalAppraisalPriceReview` | `decimal?` | Number input |
| `additionalAssumptions` | `string?` | Textarea |

### Calculated Read-Only Fields

These come from the backend and should **not** be editable:

| Field | Description |
|-------|-------------|
| `totalAppraisalPrice` | Sum of all property group final values |
| `forceSellingPrice` | 70% of `totalAppraisalPrice` |
| `buildingInsurance` | From survey data |
| `forceSellingPriceReview` | 70% of `totalAppraisalPriceReview` |
| `buildingInsuranceReview` | Same as `buildingInsurance` |
| `approachMatrix` | Pricing method breakdown per property group |
| `governmentPrices` | Government land prices per title |

### Approach Matrix Display

```
+---------------------------------------------------------------+
| Group | Approach          | Final Value  | Group Summary       |
|-------|-------------------|--------------|---------------------|
| 1     | MarketComparison  | 15,000,000   | 15,000,000          |
| 1     | CostApproach      | 14,800,000   |                     |
| 2     | IncomeApproach    | 8,000,000    | 8,000,000           |
+---------------------------------------------------------------+
| Total Appraisal Price:              23,000,000                |
| Force Selling Price (70%):          16,100,000                |
+---------------------------------------------------------------+
```

---

## Edge Cases & Error Handling

### 1. Duplicate Vote

**Backend behavior:** Returns `400 Bad Request` with message "You have already voted on this review."

**Frontend:** Disable the vote button if the current user's row in the approval list already has `vote !== null`. Show error toast if the 400 somehow happens.

### 2. Review Already Approved

**Backend behavior:** Returns `400` with "Review is no longer pending."

**Frontend:** When `reviewStatus !== "Pending"`, hide the vote button entirely. Show a read-only approval summary instead.

### 3. Route Back Side Effects

When any member votes "Route Back":
- The review immediately gets status `"Returned"`
- All other pending members can no longer vote
- The appraisal returns to the previous review level

**Frontend:** After a Route Back vote, the table should refresh and show the returned status. Hide all vote buttons.

### 4. User is Not a Committee Member

**Backend behavior:** Returns `400` with "Current user is not an active member of this committee."

**Frontend:** Ideally, don't show the vote button to non-members. If you can't determine membership client-side, handle the 400 gracefully with a toast.

### 5. No Committee Assigned Yet

**Backend behavior:** `GET /approval-list` returns empty items with null fields.

**Frontend:** Show the "Assign to Committee" button. Don't show an empty table.

### 6. Committee Already Assigned

**Backend behavior:** `POST /assign-committee` returns `400` if a pending review already exists.

**Frontend:** After assigning, hide the assign button. If it fails with 400, refetch the approval list (it likely already has data).

### 7. Concurrent Voting

Multiple members may vote simultaneously. The backend handles concurrency correctly:
- Each vote is validated independently
- Auto-approval triggers as soon as the majority threshold is met
- Use polling (see Polling Strategy above) to keep the UI in sync

---

## TypeScript Types

```typescript
// Approval List
interface ApprovalListResponse {
  committeeName: string | null;
  reviewStatus: string | null; // "Pending" | "Approved" | "Returned"
  reviewId: string | null;
  items: ApprovalListItem[];
}

interface ApprovalListItem {
  committeeMemberId: string;
  memberName: string;
  role: string;
  vote: string | null;       // "Approve" | "Reject" | "Abstain" | "RouteBack" | null
  voteLabel: string;          // "Agree" | "Disagree" | "Abstain" | "Route Back" | "Pending"
  remark: string | null;
  votedAt: string | null;     // ISO 8601
}

// Submit Vote
interface SubmitVoteRequest {
  vote: 'Approve' | 'Reject' | 'Abstain' | 'RouteBack';
  remark?: string;
}

interface SubmitVoteResponse {
  voteId: string;
  reviewStatus: string;
  isAutoApproved: boolean;
}

// Assign Committee
interface AssignCommitteeResponse {
  reviewId: string;
  committeeName: string;
}

// Decision Summary
interface DecisionSummaryResponse {
  approachMatrix: ApproachMatrixRow[];
  totalAppraisalPrice: number;
  forceSellingPrice: number;
  buildingInsurance: number;
  governmentPrices: GovernmentPriceRow[];
  governmentPriceTotalArea: number;
  governmentPriceAvgPerSqWa: number;
  totalAppraisalPriceReview: number | null;
  forceSellingPriceReview: number | null;
  buildingInsuranceReview: number;
  committeeName: string | null;
  reviewStatus: string | null;
  reviewId: string | null;
  approvalList: DecisionApprovalListItem[] | null;
  decisionId: string | null;
  isPriceVerified: boolean | null;
  conditionType: string | null;
  condition: string | null;
  remarkType: string | null;
  remark: string | null;
  appraiserOpinionType: string | null;
  appraiserOpinion: string | null;
  committeeOpinionType: string | null;
  committeeOpinion: string | null;
  additionalAssumptions: string | null;
}

interface ApproachMatrixRow {
  propertyGroupId: string;
  groupNumber: number;
  approachType: string;
  finalValue: number | null;
  finalValueRounded: number | null;
  groupSummaryValue: number | null;
}

interface GovernmentPriceRow {
  titleNumber: string | null;
  areaSquareWa: number | null;
  isMissingFromSurvey: boolean;
  governmentPricePerSqWa: number | null;
  governmentPrice: number | null;
}

interface DecisionApprovalListItem {
  committeeMemberId: string;
  memberName: string;
  role: string;
  vote: string | null;
  voteLabel: string;
  remark: string | null;
  votedAt: string | null;
}

interface SaveDecisionSummaryRequest {
  isPriceVerified?: boolean;
  conditionType?: string;
  condition?: string;
  remarkType?: string;
  remark?: string;
  appraiserOpinionType?: string;
  appraiserOpinion?: string;
  committeeOpinionType?: string;
  committeeOpinion?: string;
  totalAppraisalPriceReview?: number;
  additionalAssumptions?: string;
}

interface SaveDecisionSummaryResponse {
  id: string;
  appraisalId: string;
  isPriceVerified: boolean | null;
  conditionType: string | null;
  condition: string | null;
  remarkType: string | null;
  remark: string | null;
  appraiserOpinionType: string | null;
  appraiserOpinion: string | null;
  committeeOpinionType: string | null;
  committeeOpinion: string | null;
  totalAppraisalPriceReview: number | null;
  additionalAssumptions: string | null;
}
```

---

## Committee Threshold Reference

The backend routes appraisals to committees based on total appraised value:

| Committee        | Min Value | Max Value | Members | Quorum | Majority      |
|------------------|-----------|-----------|---------|--------|---------------|
| Sub Committee    | 0         | 50M       | 3       | 2      | Simple (>50%) |
| Committee Group 2| 50M+      | No limit  | 5       | 3      | Simple (>50%) |

This routing happens automatically in `POST /assign-committee`. The frontend does not need to implement threshold logic.

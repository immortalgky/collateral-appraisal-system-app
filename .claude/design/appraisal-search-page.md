# Appraisal Search Page — Design Document

## Summary

A full search page at `/appraisals/search` that provides complete search results with pagination and filters. Complements the existing quick search bar (which is limited to 5 results per category).

## Who it's for

All users — no role restriction.

## Key Details

- **3 tabs**: Requests / Customers / Properties — each tab has its own table and filters
- **Reuses existing `GET /search` endpoint** with extended params (pagination + filters)
- **Inline filter bar** above each table, tab-specific fields
- **Pagination**: Shared `<Pagination>` component, 0-based pages, default 25 items
- **Always starts fresh** — no query carry-over from quick search
- **Empty state until user searches** — no fetch on mount
- **Tab state in URL**: `?tab=requests` (default)

## Non-goals

- Not replacing the quick search bar
- No advanced search (boolean operators, saved searches)
- No export/download

## File Structure

```
src/features/appraisal/
  ├─ pages/AppraisalSearchPage.tsx         # Main page with tabs
  ├─ components/search/
  │   ├─ SearchFilterBar.tsx               # Inline filter bar (per-tab filters)
  │   ├─ SearchResultsTable.tsx            # Table component for results
  │   └─ tabConfigs.ts                     # Filter + column definitions per tab
  └─ api/search.ts                         # API hook for full search
```

Route added in `router.tsx` under main layout.

## Page Layout

```
┌─────────────────────────────────────────────────┐
│  Page Header: "Appraisal Search"                │
├─────────────────────────────────────────────────┤
│  Search Input (text, full width, debounced)     │
├─────────────────────────────────────────────────┤
│  Tabs:  [Requests] [Customers] [Properties]     │
├─────────────────────────────────────────────────┤
│  Filter Bar (inline, tab-specific fields)       │
├─────────────────────────────────────────────────┤
│  Results Table                                  │
├─────────────────────────────────────────────────┤
│  Pagination                                     │
└─────────────────────────────────────────────────┘
```

Filter bar, table, and pagination only appear after user initiates a search.

## State Management

- `tab` — URL search param (`useSearchParams`), default `requests`
- `searchQuery` — local `useState`, debounced 300ms
- `pageNumber`, `pageSize` — local `useState`, reset on tab/filter/search change
- `filters` — local `useState<Record<string, string>>`, reset on tab change
- API call via React Query — only fires for active tab, only when query exists

## Tab-Specific Filters

### Requests Tab
- Status (dropdown)
- Date Range — from/to (date pickers)
- Assigned To (text input)

### Customers Tab
- Status (dropdown)
- Date Range — from/to (date pickers)
- Region (dropdown)

### Properties Tab
- Property Type (dropdown)
- Status (dropdown)
- Date Range — from/to (date pickers)
- Region (dropdown)

## Table Columns

Each tab displays: `#`, `Title`, `Subtitle`, `Status`, + relevant metadata fields.
Column config defined in `tabConfigs.ts`. Data pulled from `SearchResultItem.title`, `.subtitle`, `.status`, `.metadata`.

Row click navigates to `item.navigateTo`.

## API

### Hook: `useFullSearchQuery`

```typescript
interface FullSearchParams {
  q?: string
  filter: 'requests' | 'customers' | 'properties'
  pageNumber: number
  pageSize: number
  status?: string
  dateFrom?: string
  dateTo?: string
  assignedTo?: string
  propertyType?: string
  region?: string
}

interface FullSearchResponse {
  items: SearchResultItem[]
  count: number
}
```

- `GET /search` with all params
- `keepPreviousData: true`
- `staleTime: 30s`
- `enabled` only when query exists

### Assumption

Backend `GET /search` will be extended to accept `pageNumber`, `pageSize`, and filter params. Returns `{ items, count }` when pagination params are present.

## Edge Cases

- **Empty state**: "No results found" when items is empty after search
- **Loading**: `TableRowSkeleton`
- **Error**: Error message with retry
- **Tab switch during loading**: React Query handles cancellation
- **URL bookmark**: `?tab=customers` opens directly on that tab

## Decision Log

| # | Decision | Alternatives | Why |
|---|----------|-------------|-----|
| 1 | Same 3 categories as quick search | Appraisal-only, new endpoint | Reuse existing API, consistent UX |
| 2 | Tabbed view per category | Unified table, grouped sections | Clean separation, per-tab filters |
| 3 | Shared Pagination component | Load more, infinite scroll | Consistency with task/request pages |
| 4 | Each tab has own relevant filters | Same filters across tabs | Filters should match the data |
| 5 | Reuse GET /search endpoint (extended) | Separate endpoints, new endpoints | Less backend work, familiar pattern |
| 6 | Inline filter bar | Collapsible, side panel | Simple, visible |
| 7 | Single page + tab in URL param | Separate routes, no URL state | Fewest files, shareable URL |
| 8 | Always start fresh | Carry over from quick search | Simpler, dedicated experience |
| 9 | Empty state until user searches | Fetch all on mount | Avoids unnecessary API calls |

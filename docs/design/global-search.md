# Global Search Feature — Design Document

## Understanding Summary

- **What**: Global search in the Navbar that searches across Requests, Customers, Properties, and Documents via a unified backend API
- **Why**: Enable users to quickly find any entity from anywhere in the app
- **Who**: All authenticated users
- **Key behaviors**: Live debounced search (300ms, min 2 chars), category filters, full keyboard navigation (arrows/Enter/Escape/Cmd+K), recent searches in localStorage, preview modal on result click
- **Results display**: Medium detail (icon + title + subtitle + category badge + status), max 5 per category with "View all", loading skeletons, empty state

## Non-Goals

- Server-persisted search history
- Full-text document content search
- Client-side-only search
- Dedicated search results page

## Assumptions

- Backend will provide `GET /search?q=...&filter=...&limit=...` returning categorized results
- API response includes enough metadata per result for preview (via `metadata` field)
- `Cmd/Ctrl+K` does not conflict with existing app shortcuts
- Recent searches capped at 10 items in localStorage

---

## API Contract

### Endpoint

```
GET /search?q={query}&filter={category}&limit={number}
```

- `q` — search string (min 2 chars)
- `filter` — `all` | `requests` | `customers` | `properties` | `documents`
- `limit` — max results per category (default 5)

### Response

```ts
interface SearchResponse {
  results: {
    requests: SearchResultItem[];
    customers: SearchResultItem[];
    properties: SearchResultItem[];
    documents: SearchResultItem[];
  };
  totalCount: number;
}

interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  status?: string;
  category: 'requests' | 'customers' | 'properties' | 'documents';
  navigateTo: string;
  icon?: string;
  metadata?: Record<string, string>;
}
```

### Preview Metadata by Category

**Requests**: requestNumber, status, customerName, collateralType, appraisalPurpose, createdDate, assignedStaff

**Customers**: customerName, customerId, companyName, phone, email, linkedRequestCount

**Properties**: propertyType, address, titleDeedNumber, area, linkedAppraisalId

**Documents**: documentName, documentType, relatedEntity, uploadDate, verificationStatus

---

## Component Architecture

### File Structure

```
src/shared/
  api/search.ts                         # useSearchQuery hook
  hooks/useGlobalSearch.ts              # search state, debounce, keyboard nav
  utils/recentSearches.ts              # localStorage recent searches
  components/search/
    SearchResults.tsx                    # grouped/flat result list
    SearchResultItem.tsx                # single result row
    SearchPreviewModal.tsx             # preview modal per category
```

### Component Responsibilities

**Navbar.tsx (modified)**
- Extracts search logic to `useGlobalSearch` hook
- Renders `SearchResults` in the existing dropdown area

**useGlobalSearch hook**
- Owns: `searchQuery`, `selectedFilter`, `isFocused`, `highlightedIndex`
- Debounces query (300ms) before passing to `useSearchQuery`
- Manages keyboard navigation (highlighted index, arrow keys, Enter, Escape)
- Registers `Cmd/Ctrl+K` global shortcut
- Calls `addRecentSearch()` on result selection

**useSearchQuery hook**
- React Query hook, enabled when `query.length >= 2`
- Query key: `['search', query, filter]`
- `keepPreviousData: true`, `staleTime: 30_000`

**SearchResults**
- Grouped by category (filter=all) or flat list (specific filter)
- States: loading skeleton, empty, error with retry
- "View all {category}" link when results exceed limit

**SearchResultItem**
- Row: category icon + title + subtitle + status badge
- Highlighted state for keyboard navigation
- Click/Enter → opens SearchPreviewModal

**SearchPreviewModal**
- Header: category icon + title + status badge
- Body: renders `metadata` fields based on category
- Footer: "Open full page" button → navigates to `result.navigateTo`

---

## Keyboard Navigation

| Key | Action |
|---|---|
| `Cmd/Ctrl+K` | Focus search input from anywhere |
| `Arrow Down/Up` | Move highlight through results |
| `Enter` | Open preview modal for highlighted result |
| `Escape` | Close dropdown → blur input (cascading) |
| Typing | Resets highlight to index 0 |

### Highlight Index Logic
- Flat list of all visible results (across categories when filter=all)
- Wraps around at boundaries
- Scrolls highlighted item into view

---

## Interaction Flow

1. **Idle** — Filter badge + placeholder
2. **Focus** (click or Cmd+K) — Dropdown opens with recent searches
3. **Typing < 2 chars** — Still shows recent searches
4. **Typing >= 2 chars** — 300ms debounce → API call → skeleton → results
5. **Results displayed** — Grouped/flat, arrow keys highlight
6. **Select result** — Preview modal opens, term saved to recent, dropdown closes
7. **Preview modal** — Entity summary, "Open" navigates to full page
8. **Escape cascade** — Modal → dropdown → blur

---

## Accessibility

- Search input: `role="combobox"`, `aria-expanded`, `aria-controls`
- Results list: `role="listbox"`
- Result items: `role="option"`, `aria-selected`
- Preview modal: focus trap, `aria-modal="true"`
- Filter buttons: `aria-pressed`

---

## Edge Cases

- **Rapid typing**: debounce + `keepPreviousData`
- **Filter change with results**: new API call, same query
- **Network error**: inline error with "Retry" button
- **Slow response**: skeleton; discarded if query changes
- **Empty query after results**: return to recent searches
- **No recent searches**: "Your recent searches will appear here"
- **Cmd+K while modal open**: close modal, focus input
- **Route change**: dropdown and modal close

---

## Decision Log

| # | Decision | Alternatives | Rationale |
|---|---|---|---|
| 1 | All 4 categories in v1 | Single category first | User requirement |
| 2 | Unified backend API | Parallel list endpoints; client-side | Single request, cleaner contract |
| 3 | Preview modal on click | Direct navigation; side panel | Context before committing |
| 4 | Full keyboard + Cmd/K | Basic/none | Power-user friendly, modern standard |
| 5 | localStorage recent searches | Server-persisted; none | Simple, no API needed |
| 6 | Medium detail results | Minimal; rich | Balance of scan and info |
| 7 | Live debounced (300ms) | Explicit Enter; hybrid | Responsive UX |
| 8 | Enhanced Navbar dropdown | Full-screen overlay; search page | Reuses existing UI, least code |
| 9 | Metadata field for preview | Separate preview API | No extra API call |
| 10 | keepPreviousData + 30s stale | No cache; aggressive | Smooth UX, no stale risk |

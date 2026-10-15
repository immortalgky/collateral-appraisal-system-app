/**
 * Round-7 regression: the drawer's correlationId "filter" link must REPLACE the search with
 * `corr:<id>` and zoom to the ±60min window around the row (same as the trace tab's "view all"),
 * not append onto whatever query/range was already active. Verified by asserting which callback
 * prop fires — onViewFullTrace, never onFilter — with the expected args.
 */
import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { render } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import LogDetailDrawer from './LogDetailDrawer';
import { aroundRange, toApiDateTime } from '../utils/range';
import type { LogListItem } from '../types';

// Returns the raw key so assertions can target stable strings instead of locale text.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
  initReactI18next: { type: '3rdParty', init: vi.fn() },
}));

const item: LogListItem = {
  id: 42,
  timeStamp: '2026-09-28T10:00:00',
  level: 'Information',
  message: 'Something happened',
  exception: null,
  correlationId: 'corr-abc-123',
  entityId: null,
  appraisalId: null,
  requestId: null,
  workflowInstanceId: null,
  collateralId: null,
  documentId: null,
  machineName: 'CAS-APP01',
  userName: null,
  sourceContext: 'Some.Other.Class',
  requestPath: null,
};

describe('LogDetailDrawer correlationId filter link', () => {
  it('calls onViewFullTrace with the id and a ±60min window, never onFilter', async () => {
    // The drawer fetches the full row via GET /admin/logs/:id on mount — `row` falls back to the
    // `item` prop until that resolves, so the assertion below doesn't need to wait for it, but a
    // handler still avoids MSW's unhandled-request warning noise.
    server.use(http.get('*/api/admin/logs/:id', () => HttpResponse.json(item)));

    const onFilter = vi.fn();
    const onViewFullTrace = vi.fn();
    const user = userEvent.setup();

    render(
      <LogDetailDrawer
        item={item}
        onClose={vi.fn()}
        onFilter={onFilter}
        onFilterId={vi.fn()}
        onAroundLog={vi.fn()}
        onViewFullTrace={onViewFullTrace}
      />,
    );

    // Scope to the correlationId field specifically — appraisalId/userName have their own
    // identically-labelled "drawer.filterLink" buttons elsewhere in the same tab.
    const correlationLabel = screen.getByText('columns.correlationId');
    const field = correlationLabel.closest('div') as HTMLElement;
    await user.click(within(field).getByText('drawer.filterLink'));

    const expected = aroundRange(new Date(item.timeStamp), 60);
    expect(onViewFullTrace).toHaveBeenCalledTimes(1);
    expect(onViewFullTrace).toHaveBeenCalledWith(
      item.correlationId,
      toApiDateTime(expected.from),
      toApiDateTime(expected.to),
    );
    expect(onFilter).not.toHaveBeenCalled();
  });
});

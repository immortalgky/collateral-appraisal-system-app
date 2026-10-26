import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { normalizeLegacyDates, toLegacyRange, useTaskListUrlState } from './useTaskListUrlState';

const setup = (initial: string) =>
  renderHook(
    () => {
      const loc = useLocation();
      const pageActivityId = new URLSearchParams(loc.search).get('activityId') ?? undefined;
      return { s: useTaskListUrlState(pageActivityId), nav: useNavigate(), loc };
    },
    {
      wrapper: ({ children }: { children: ReactNode }) => (
        <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
      ),
    },
  );

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('useTaskListUrlState', () => {
  it('re-seeds from an external navigation to bare /tasks instead of writing the old state back', async () => {
    const { result } = setup('/tasks?tab=pool&search=abc');
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=pool&search=abc'));
    expect(result.current.s.poolSearch).toBe('abc');

    act(() => result.current.nav('/tasks'));
    await waitFor(() => expect(result.current.s.activeTab).toBe('personal'));
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=personal'));
    expect(result.current.s.poolSearch).toBe('');
  });

  it('does not carry activity A state onto activity B', async () => {
    const { result } = setup('/tasks?activityId=a');
    act(() => result.current.s.setSearchTerm('foo'));
    await waitFor(() =>
      expect(result.current.loc.search).toBe('?tab=personal&search=foo&activityId=a'),
    );

    act(() => result.current.nav('/tasks?activityId=b'));
    await waitFor(() => expect(result.current.s.searchTerm).toBe(''));
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=personal&activityId=b'));
  });

  it('own URL writes do not trigger a re-seed', async () => {
    const { result } = setup('/tasks');
    act(() => result.current.s.setActiveTab('pool'));
    act(() => result.current.s.setPoolSearch('x'));
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=pool&search=x'));
    expect(result.current.s.activeTab).toBe('pool');
    expect(result.current.s.poolSearch).toBe('x');
  });

  it('keeps a Task Type filter out of the URL on the activity page', async () => {
    const { result } = setup('/tasks?activityId=a');
    act(() => result.current.s.setFilters({ activityId: 'zzz' }));
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.loc.search).toBe('?tab=personal&activityId=a');
  });

  it('carries the My Task Type, several ids at once, under myActivityId: never a bare activityId the router would follow', async () => {
    const { result } = setup('/tasks');
    act(() => result.current.s.setFilters({ activityId: 'a,b', purpose: 'p' }));
    await waitFor(() =>
      expect(result.current.loc.search).toBe('?tab=personal&myActivityId=a%2Cb&purpose=p'),
    );

    act(() => result.current.nav('/tasks?tab=personal&myActivityId=c'));
    await waitFor(() => expect(result.current.s.filters).toEqual({ activityId: 'c' }));
  });

  it('carries the Pool Task Type under poolActivityId and reads it back', async () => {
    const { result } = setup('/tasks');
    act(() => result.current.s.setActiveTab('pool'));
    act(() => result.current.s.setPoolFilters({ activityId: 'zzz', purpose: 'p' }));
    await waitFor(() =>
      expect(result.current.loc.search).toBe('?tab=pool&poolActivityId=zzz&purpose=p'),
    );

    act(() => result.current.nav('/tasks?tab=pool&poolActivityId=q&purpose=p'));
    await waitFor(() =>
      expect(result.current.s.poolFilters).toEqual({ activityId: 'q', purpose: 'p' }),
    );
  });

  it('opens the tab a bare Task Type link belongs to, and keeps its filter', async () => {
    localStorage.clear();
    const pool = setup('/tasks?poolActivityId=zzz');
    expect(pool.result.current.s.activeTab).toBe('pool');
    expect(pool.result.current.s.poolFilters).toEqual({ activityId: 'zzz' });
    await waitFor(() =>
      expect(pool.result.current.loc.search).toBe('?tab=pool&poolActivityId=zzz'),
    );
    pool.unmount();

    const mine = setup('/tasks?myActivityId=a%2Cb');
    expect(mine.result.current.s.activeTab).toBe('personal');
    expect(mine.result.current.s.filters).toEqual({ activityId: 'a,b' });
  });

  it('re-seeds from the older URL on Back and does not rewrite it', async () => {
    const { result } = setup('/tasks?tab=pool&search=abc');
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=pool&search=abc'));

    act(() => result.current.nav('/tasks?tab=personal&purpose=p'));
    await waitFor(() => expect(result.current.s.activeTab).toBe('personal'));
    await waitFor(() => expect(result.current.loc.search).toBe('?tab=personal&purpose=p'));

    act(() => result.current.nav(-1));
    await waitFor(() => expect(result.current.s.activeTab).toBe('pool'));
    await waitFor(() => expect(result.current.s.poolSearch).toBe('abc'));
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.loc.search).toBe('?tab=pool&search=abc');
  });

  it('carries several values of a facet as one comma-joined param and reads them back', async () => {
    const { result } = setup('/tasks');
    act(() => result.current.s.setFilters({ status: 'Pending,InProgress', channel: 'LOS,Manual' }));
    await waitFor(() =>
      expect(result.current.loc.search).toBe(
        '?tab=personal&status=Pending%2CInProgress&channel=LOS%2CManual',
      ),
    );

    act(() => result.current.nav('/tasks?tab=personal&slaStatus=Breached%2CNoSla&purpose=a%2Cb'));
    await waitFor(() =>
      expect(result.current.s.filters).toEqual({ slaStatus: 'Breached,NoSla', purpose: 'a,b' }),
    );
  });

  it('keeps the three date ranges apart and combinable, in the URL and back', async () => {
    const { result } = setup('/tasks');
    const ranges = {
      assignedFrom: '2026-10-01',
      assignedTo: '2026-10-07',
      appointmentFrom: '2026-10-10',
      requestedTo: '2026-10-31',
    };
    act(() => result.current.s.setFilters(ranges));
    await waitFor(() =>
      expect(result.current.loc.search).toBe(
        '?tab=personal&assignedFrom=2026-10-01&assignedTo=2026-10-07&appointmentFrom=2026-10-10&requestedTo=2026-10-31',
      ),
    );

    act(() => result.current.nav('/tasks?tab=personal&requestedFrom=2026-09-01'));
    await waitFor(() => expect(result.current.s.filters).toEqual({ requestedFrom: '2026-09-01' }));
  });

  it('lands a link with only a date range on My, and keeps each tab its own values', async () => {
    const { result } = setup('/tasks?appointmentTo=2026-10-31');
    await waitFor(() => expect(result.current.s.filters).toEqual({ appointmentTo: '2026-10-31' }));
    expect(result.current.s.activeTab).toBe('personal');

    act(() => result.current.s.setActiveTab('pool'));
    act(() =>
      result.current.s.setPoolFilters({ channel: 'LOS,Manual', assignedFrom: '2026-10-01' }),
    );
    await waitFor(() =>
      expect(result.current.loc.search).toBe(
        '?tab=pool&channel=LOS%2CManual&assignedFrom=2026-10-01',
      ),
    );
    // My still holds its own
    expect(result.current.s.filters).toEqual({ appointmentTo: '2026-10-31' });
  });

  it('reads an old dateType/dateFrom/dateTo link as the matching one of the three ranges', async () => {
    const { result } = setup(
      '/tasks?dateType=appointment&dateFrom=2026-10-01&dateTo=2026-10-07&purpose=p',
    );
    await waitFor(() =>
      expect(result.current.s.filters).toEqual({
        appointmentFrom: '2026-10-01',
        appointmentTo: '2026-10-07',
        purpose: 'p',
      }),
    );
    // and the address is rewritten to the new keys, so the legacy ones are gone from then on
    await waitFor(() =>
      expect(result.current.loc.search).toBe(
        '?tab=personal&purpose=p&appointmentFrom=2026-10-01&appointmentTo=2026-10-07',
      ),
    );
  });

  it('treats a legacy range with no type as assigned, and lets an explicit range win', async () => {
    const { result } = setup('/tasks?dateFrom=2026-10-01&assignedFrom=2026-09-01');
    await waitFor(() => expect(result.current.s.filters).toEqual({ assignedFrom: '2026-09-01' }));
    act(() => result.current.nav('/tasks?tab=pool&dateType=requested&dateTo=2026-10-31'));
    await waitFor(() =>
      expect(result.current.s.poolFilters).toEqual({ requestedTo: '2026-10-31' }),
    );
  });

  it('turns a legacy range set from code (the activity page dialog) into the new keys', async () => {
    const { result } = setup('/tasks');
    act(() =>
      result.current.s.setFilters({ dateType: 'requested', dateFrom: '2026-10-01', status: 'x' }),
    );
    await waitFor(() =>
      expect(result.current.s.filters).toEqual({ requestedFrom: '2026-10-01', status: 'x' }),
    );
    // removing a key later never re-targets a date
    act(() => result.current.s.setFilters(prev => ({ ...prev, status: undefined })));
    expect(result.current.s.filters.requestedFrom).toBe('2026-10-01');
  });

  it('lets a later legacy write replace the range it names, both ends, and clear it when it has none', async () => {
    const { result } = setup('/tasks?assignedFrom=2026-09-01&assignedTo=2026-09-30');
    await waitFor(() => expect(result.current.s.filters.assignedFrom).toBe('2026-09-01'));

    // the dialog applies a new assigned range: it replaces the old one (no old end left over)
    act(() =>
      result.current.s.setFilters({ dateType: 'assigned', dateFrom: '2026-10-05', status: 's' }),
    );
    expect(result.current.s.filters).toEqual({ assignedFrom: '2026-10-05', status: 's' });

    // and one with no dates at all (Clear dates) leaves the range cleared
    act(() => result.current.s.setFilters({ status: 's' }));
    expect(result.current.s.filters).toEqual({ status: 's' });
  });

  it('seeds the dialog from the active range, and what it applies round-trips', () => {
    const seeded = toLegacyRange({
      appointmentFrom: '2026-10-01',
      appointmentTo: '2026-10-07',
      status: 's',
    });
    expect(seeded).toEqual({
      status: 's',
      dateType: 'appointment',
      dateFrom: '2026-10-01',
      dateTo: '2026-10-07',
    });
    expect(normalizeLegacyDates(seeded, true)).toEqual({
      status: 's',
      appointmentFrom: '2026-10-01',
      appointmentTo: '2026-10-07',
    });
    expect(toLegacyRange({ status: 's' })).toEqual({ status: 's' });
  });

  it('keeps the ranges the dialog does not show, through seeding and applying', () => {
    const seeded = toLegacyRange({
      assignedFrom: '2026-09-01',
      requestedFrom: '2026-08-01',
      requestedTo: '2026-08-31',
    });
    expect(seeded).toEqual({
      dateType: 'assigned',
      dateFrom: '2026-09-01',
      dateTo: undefined,
      requestedFrom: '2026-08-01',
      requestedTo: '2026-08-31',
    });
    // applied unedited, then with the shown range moved: the other range is still there
    expect(normalizeLegacyDates(seeded, true)).toMatchObject({
      assignedFrom: '2026-09-01',
      requestedFrom: '2026-08-01',
      requestedTo: '2026-08-31',
    });
    expect(normalizeLegacyDates({ ...seeded, dateFrom: '2026-10-05' }, true)).toMatchObject({
      assignedFrom: '2026-10-05',
      requestedFrom: '2026-08-01',
    });
  });
});

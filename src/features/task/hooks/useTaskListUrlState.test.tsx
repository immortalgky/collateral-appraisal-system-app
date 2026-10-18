import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { useTaskListUrlState } from './useTaskListUrlState';

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
});

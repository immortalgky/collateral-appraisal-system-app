import { beforeEach, describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAuthStore } from '@features/auth/store';
import { usePoolGroups } from './usePoolGroups';

const as = (user: object | null) => useAuthStore.setState({ user: user as never });

describe('usePoolGroups', () => {
  beforeEach(() => as(null));

  it('is every group, and every group with every team, never a role', () => {
    as({ roles: ['Admin'], groups: ['IntAdmin', 'IntAppraisal'], teams: ['a', 'b'] });
    const { result } = renderHook(() => usePoolGroups());
    expect(result.current).toEqual([
      'IntAdmin',
      'IntAdmin:Team_a',
      'IntAdmin:Team_b',
      'IntAppraisal',
      'IntAppraisal:Team_a',
      'IntAppraisal:Team_b',
    ]);
  });

  it('stands the company id in for the team of a user with no team row, as the backend does', () => {
    as({ groups: ['ExtAdmin'], teams: [], companyId: 'c-1' });
    const { result, rerender } = renderHook(() => usePoolGroups());
    expect(result.current).toEqual(['ExtAdmin', 'ExtAdmin:Team_c-1']);
    // a real team row wins over the company
    as({ groups: ['ExtAdmin'], teams: ['t-1'], companyId: 'c-1' });
    rerender();
    expect(result.current).toEqual(['ExtAdmin', 'ExtAdmin:Team_t-1']);
  });

  it('is just the groups for a user with no team, and empty when nobody is signed in', () => {
    as({ groups: ['IntAdmin'], teams: [] });
    const { result, rerender } = renderHook(() => usePoolGroups());
    expect(result.current).toEqual(['IntAdmin']);
    as(null);
    rerender();
    expect(result.current).toEqual([]);
  });
});

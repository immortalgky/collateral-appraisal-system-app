import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createRef, useEffect, type RefObject } from 'react';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor, within } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import type { CurrentAssignment } from '../types/administration';
import ValuationEngagementChips from './ValuationEngagementChips';

/**
 * The off-system engagement at key-in: once the assignment holds a company (the admin picked it on
 * the assignment page, #535) the keyer sees it read-only and only enters the book date; a case with
 * no company yet still picks it here. The test i18n returns keys.
 */

const state = vi.hoisted(() => ({ saved: [] as unknown[] }));

// The picker and the date field are leaf controls. The picker picks "New Co" as soon as it opens
// (a button outside the open dialog would be inert); a button stands in for the date field.
vi.mock('./SearchCompanyModal', () => {
  const PickOnOpen = ({
    isOpen,
    onSelect,
  }: {
    isOpen: boolean;
    onSelect: (c: unknown) => void;
  }) => {
    useEffect(() => {
      if (isOpen) onSelect({ id: 'c-new', companyName: 'New Co', companyNameLocal: null });
      // eslint-disable-next-line react-hooks/exhaustive-deps -- once per open
    }, [isOpen]);
    return null;
  };
  return { default: PickOnOpen };
});
vi.mock('@/shared/components/inputs/DatePickerInput', () => ({
  default: ({ onChange }: { onChange: (v: string) => void }) => (
    <button type="button" onClick={() => onChange('2026-10-01')}>
      set-book-date
    </button>
  ),
}));

const assignment = (over: Partial<CurrentAssignment> = {}) =>
  ({
    id: 'as-1',
    appraisalId: 'A1',
    assignmentType: 'External',
    assignmentStatus: 'Assigned',
    assignmentMethod: 'Offline',
    assigneeUserId: 'K-1',
    assigneeCompanyId: null,
    offlineBookDate: null,
    ...over,
  }) as CurrentAssignment;

beforeEach(() => {
  state.saved = [];
  server.use(
    http.get('*/companies/eligible', () => HttpResponse.json({ companies: [] })),
    http.get('*/companies/:id', ({ params }) =>
      HttpResponse.json({
        id: params.id,
        name: params.id === 'c-b' ? 'B Co' : 'Admin Co',
        nameLocal: null,
      }),
    ),
    http.put('*/appraisals/:id/assignments/offline-external-engagement', async ({ request }) => {
      state.saved.push(await request.json());
      return HttpResponse.json({ assignmentId: 'as-1' });
    }),
  );
});

const renderChips = (a: CurrentAssignment) => {
  const saveRef = createRef<() => Promise<boolean>>() as RefObject<(() => Promise<boolean>) | null>;
  const utils = render(
    <ValuationEngagementChips appraisalId="A1" assignment={a} canEdit saveHandleRef={saveRef} />,
  );
  return { ...utils, saveRef };
};

describe('ValuationEngagementChips at key-in', () => {
  it('shows the assignment company read-only and saves only the book date', async () => {
    const { user, saveRef } = renderChips(assignment({ assigneeCompanyId: 'c-admin' }));

    await user.click(
      await screen.findByRole('button', { name: 'offlineEngagement.outstandingDate' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Admin Co')).toBeInTheDocument();
    expect(within(dialog).getByText('offlineEngagement.companyLockedHint')).toBeInTheDocument();
    // No way to change or clear it here.
    expect(within(dialog).queryByText('offlineEngagement.selectCompany')).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'administration.clearSelection' }),
    ).not.toBeInTheDocument();
    // The banner asks for the book date only, and the company is not marked as an input.
    expect(within(dialog).getByText('offlineEngagement.hintLocked')).toBeInTheDocument();
    expect(within(dialog).queryByText('offlineEngagement.hint')).not.toBeInTheDocument();

    await user.click(within(dialog).getByText('set-book-date'));
    await expect(saveRef.current!()).resolves.toBe(true);

    await waitFor(() => expect(state.saved).toHaveLength(1));
    expect(state.saved[0]).toMatchObject({ bookDate: '2026-10-01' });
    expect(state.saved[0]).not.toHaveProperty('companyId');
  });

  it('shows the stored company id, not a blank, when the company lookup fails', async () => {
    server.use(http.get('*/companies/:id', () => new HttpResponse(null, { status: 404 })));
    const { user } = renderChips(
      assignment({ assigneeCompanyId: 'c-admin', offlineBookDate: '2026-09-30' }),
    );

    // The chip names the company by its id ...
    expect(await screen.findByText('c-admin')).toBeInTheDocument();
    // ... and so does the dialog.
    await user.click(screen.getByTitle('offlineEngagement.title'));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('c-admin')).toBeInTheDocument();
  });

  it('keeps the keyer on the book date while the locked company is loading: the dialog stays open', async () => {
    server.use(http.get('*/companies/:id', () => new Promise<never>(() => {})));
    const { user } = renderChips(assignment({ assigneeCompanyId: 'c-admin' }));

    await user.click(
      await screen.findByRole('button', { name: 'offlineEngagement.outstandingDate' }),
    );
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByText('set-book-date'));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // A placeholder, never a blank name.
    expect(within(dialog).getByText('…')).toBeInTheDocument();
  });

  it('follows the assignment when its company changes (routed back and re-picked)', async () => {
    const { rerender } = render(
      <ValuationEngagementChips
        appraisalId="A1"
        assignment={assignment({ assigneeCompanyId: 'c-admin', offlineBookDate: '2026-09-30' })}
        canEdit
      />,
    );
    expect(await screen.findByText('Admin Co')).toBeInTheDocument();

    rerender(
      <ValuationEngagementChips
        appraisalId="A1"
        assignment={assignment({ assigneeCompanyId: 'c-b', offlineBookDate: '2026-09-30' })}
        canEdit
      />,
    );
    expect(await screen.findByText('B Co')).toBeInTheDocument();
  });

  it('shows nothing, not the id, for a company it cannot look up on a case the user cannot edit', async () => {
    server.use(http.get('*/companies/:id', () => new HttpResponse(null, { status: 404 })));
    const { container } = render(
      <ValuationEngagementChips
        appraisalId="A1"
        assignment={assignment({ assigneeCompanyId: 'c-x' })}
      />,
    );

    await new Promise(r => setTimeout(r, 50));
    expect(screen.queryByText('c-x')).not.toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('still asks for the company when the assignment has none', async () => {
    const { user, saveRef } = renderChips(assignment());

    await user.click(
      await screen.findByRole('button', { name: 'offlineEngagement.outstandingBoth' }),
    );
    const dialog = await screen.findByRole('dialog');
    expect(
      within(dialog).queryByText('offlineEngagement.companyLockedHint'),
    ).not.toBeInTheDocument();

    await user.click(within(dialog).getByText('offlineEngagement.selectCompany'));
    expect(await within(dialog).findByText('New Co')).toBeInTheDocument();
    await user.click(within(dialog).getByText('set-book-date'));
    await expect(saveRef.current!()).resolves.toBe(true);

    await waitFor(() => expect(state.saved).toHaveLength(1));
    expect(state.saved[0]).toMatchObject({ companyId: 'c-new', bookDate: '2026-10-01' });
  });
});

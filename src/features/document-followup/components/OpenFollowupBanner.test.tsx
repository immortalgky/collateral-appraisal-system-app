import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import { useAuthStore } from '@/features/auth/store';
import { OpenFollowupBanner } from './OpenFollowupBanner';

const data = vi.hoisted(() => ({
  open: [] as unknown[],
  detail: undefined as unknown,
}));
vi.mock('../hooks/useOpenFollowupsForTask', () => ({
  useOpenFollowupsForTask: () => ({ data: data.open, isLoading: false }),
}));
vi.mock('../hooks/useGetFollowupById', () => ({
  useGetFollowupById: () => ({ data: data.detail, isLoading: false }),
}));
vi.mock('../hooks/useCancelFollowup', () => ({ useCancelFollowup: () => ({ mutate: vi.fn() }) }));
vi.mock('../hooks/useCancelLineItem', () => ({ useCancelLineItem: () => ({ mutate: vi.fn() }) }));
vi.mock('@/features/request/api/documentTypes', () => ({
  useGetDocumentTypes: () => ({ data: [] }),
  getDocumentTypeName: (_types: unknown, code: string) => `name ${code}`,
}));

const raisedBy = { userId: 'maker1', displayName: 'Maker One' };
const summary = {
  id: 'f1',
  status: 'Open',
  pendingCount: 2,
  raisedAt: '2026-10-09T09:30:00',
  raisedBy,
};
const item = (id: string, status: string) => ({
  id,
  documentType: id.toUpperCase(),
  notes: `note ${id}`,
  status,
  reason: null,
});

beforeEach(() => {
  data.open = [summary];
  data.detail = {
    ...summary,
    lineItems: [item('d1', 'Pending'), item('d2', 'Uploaded'), item('d3', 'Pending')],
  };
  useAuthStore.setState({ user: { username: 'maker1' } as never });
});

describe('OpenFollowupBanner', () => {
  it('is one slim line to begin with: the count, who asked and when, and a way to open the list', () => {
    render(<OpenFollowupBanner raisingTaskId="t1" />);
    const line = screen.getByRole('status');
    expect(line).toHaveTextContent('2 more document(s) requested');
    expect(line).toHaveTextContent('requested by Maker One on 09/10/2026 09:30');
    expect(screen.getByRole('button', { name: 'Show list' })).toBeInTheDocument();
    expect(screen.queryByText('name D1')).not.toBeInTheDocument();
  });

  it('opens one row per document, with the cancel links only for the requester and only while pending', async () => {
    const { user } = render(<OpenFollowupBanner raisingTaskId="t1" />);
    await user.click(screen.getByRole('button', { name: 'Show list' }));
    expect(screen.getByText('name D1')).toBeInTheDocument();
    expect(screen.getByText('name D2')).toBeInTheDocument();
    // two pending rows get a cancel link, the uploaded one does not
    expect(screen.getAllByRole('button', { name: /^Cancel$/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Cancel all' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Hide' }));
    expect(screen.queryByText('name D1')).not.toBeInTheDocument();
  });

  it('shows the rows but no cancel link to anyone else', async () => {
    useAuthStore.setState({ user: { username: 'someone-else' } as never });
    const { user } = render(<OpenFollowupBanner raisingTaskId="t1" />);
    await user.click(screen.getByRole('button', { name: 'Show list' }));
    expect(screen.getByText('name D1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel all' })).not.toBeInTheDocument();
  });

  it('compact (Decision page): the same slim line and rows, but no cancel link even for the requester', async () => {
    const { user } = render(<OpenFollowupBanner raisingTaskId="t1" compact />);
    expect(screen.getByRole('status')).toHaveTextContent('2 more document(s) requested');
    await user.click(screen.getByRole('button', { name: 'Show list' }));
    expect(screen.getByText('name D1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Cancel$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel all' })).not.toBeInTheDocument();
  });

  it('is not there when nothing is open', () => {
    data.open = [];
    render(<OpenFollowupBanner raisingTaskId="t1" />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

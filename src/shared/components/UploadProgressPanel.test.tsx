import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UploadProgressPanel from './UploadProgressPanel';
import { useUploadProgressStore } from '@shared/api/uploadProgress';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { count?: number }) =>
      options?.count === undefined ? key : `${key}:${options.count}`,
  }),
}));

const visibleEntry = (overrides: Partial<ReturnType<typeof baseEntry>> = {}) => ({
  ...baseEntry(),
  ...overrides,
});

const baseEntry = () => ({
  id: 1,
  label: 'deed-scan.pdf',
  direction: 'upload' as const,
  loaded: 0,
  total: null as number | null,
  processing: false,
  visible: true,
  startedAt: Date.now(),
  baseLoaded: 0,
  cancel: undefined as (() => void) | undefined,
  resume: undefined as (() => void) | undefined,
  dismiss: undefined as (() => void) | undefined,
});

beforeEach(() => useUploadProgressStore.setState({ uploads: [] }));
afterEach(cleanup);

describe('UploadProgressPanel', () => {
  it('renders outside the app root, where a modal cannot make it inert', () => {
    useUploadProgressStore.setState({ uploads: [visibleEntry()] });

    const root = document.createElement('div');
    root.id = 'root';
    document.body.append(root);

    render(<UploadProgressPanel />, { container: root });

    // The panel's own node has to be a child of body, not of the tree Headless UI inerts. jsdom
    // cannot show the inert behaviour itself, so what is pinned here is the mechanism that avoids
    // it — anyone removing the portal breaks this test rather than the buttons in production.
    const entry = screen.getByText('deed-scan.pdf');
    expect(root.contains(entry)).toBe(false);
    expect(document.body.contains(entry)).toBe(true);
  });

  it('offers to stop a transfer that is still running', async () => {
    const cancel = vi.fn();
    useUploadProgressStore.setState({ uploads: [visibleEntry({ cancel })] });

    render(<UploadProgressPanel />);
    await userEvent.click(screen.getByRole('button', { name: 'transfer.cancel' }));

    expect(cancel).toHaveBeenCalledOnce();
  });

  it('stops offering to cancel once the server has the file', () => {
    // Aborting here would not stop the work — it would only lose the answer, leaving the file
    // stored and the screen that asked for it none the wiser.
    useUploadProgressStore.setState({
      uploads: [visibleEntry({ cancel: vi.fn(), processing: true, loaded: 100, total: 100 })],
    });

    render(<UploadProgressPanel />);

    expect(screen.queryByRole('button', { name: 'transfer.cancel' })).not.toBeInTheDocument();
  });

  it('offers to carry on after a failure, and to give up on it', async () => {
    const resume = vi.fn();
    const dismiss = vi.fn();
    useUploadProgressStore.setState({ uploads: [visibleEntry({ resume, dismiss, loaded: 900 })] });

    render(<UploadProgressPanel />);
    await userEvent.click(screen.getByRole('button', { name: 'transfer.resume' }));
    expect(resume).toHaveBeenCalledOnce();

    // Giving up tells the upload, rather than just clearing the card: the call that made this
    // entry is waiting on the answer, and removing the entry alone would leave it pending.
    await userEvent.click(screen.getByRole('button', { name: 'transfer.dismiss' }));
    expect(dismiss).toHaveBeenCalledOnce();
  });

  it('shows the time left in seconds when the end is close', () => {
    // Ten seconds in, halfway: ten seconds to go.
    useUploadProgressStore.setState({
      uploads: [
        visibleEntry({ loaded: 50_000_000, total: 100_000_000, startedAt: Date.now() - 10_000 }),
      ],
    });

    render(<UploadProgressPanel />);

    expect(screen.getByText('transfer.secondsLeft:10')).toBeInTheDocument();
  });

  it('rounds to minutes once seconds stop being useful', () => {
    // Ten seconds in, a tenth of the way: ninety seconds to go, which nobody wants read out as 90.
    useUploadProgressStore.setState({
      uploads: [
        visibleEntry({ loaded: 10_000_000, total: 100_000_000, startedAt: Date.now() - 10_000 }),
      ],
    });

    render(<UploadProgressPanel />);

    expect(screen.getByText('transfer.minutesLeft:2')).toBeInTheDocument();
  });

  it('says nothing about the time left on a transfer that has stopped and is waiting', () => {
    useUploadProgressStore.setState({
      uploads: [
        visibleEntry({
          resume: vi.fn(),
          dismiss: vi.fn(),
          loaded: 50_000_000,
          total: 100_000_000,
          startedAt: Date.now() - 10_000,
        }),
      ],
    });

    render(<UploadProgressPanel />);

    expect(screen.queryByText(/transfer\.(seconds|minutes)Left/)).not.toBeInTheDocument();
  });

  it('measures the rate from the resumed run, not from before it stopped', () => {
    // Half the file arrived before it stopped; two seconds' worth has moved since it resumed ten
    // seconds ago. Counting the park as transfer time would report far longer than it will take.
    useUploadProgressStore.setState({
      uploads: [
        visibleEntry({
          loaded: 60_000_000,
          baseLoaded: 50_000_000,
          total: 100_000_000,
          startedAt: Date.now() - 10_000,
        }),
      ],
    });

    render(<UploadProgressPanel />);

    // 10 MB in 10 s, 40 MB to go: 40 seconds.
    expect(screen.getByText('transfer.secondsLeft:40')).toBeInTheDocument();
  });

  it('says nothing about the time left in the first seconds, when it would be a guess', () => {
    useUploadProgressStore.setState({
      uploads: [visibleEntry({ loaded: 1_000, total: 100_000_000, startedAt: Date.now() - 500 })],
    });

    render(<UploadProgressPanel />);

    expect(screen.queryByText(/transfer\.(seconds|minutes)Left/)).not.toBeInTheDocument();
  });
});

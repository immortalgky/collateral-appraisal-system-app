import { beforeEach, describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import { http, HttpResponse } from 'msw';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { useGetAppraisalById } from '../api/appraisal';
import EditInspectionNumberDialog from './EditInspectionNumberDialog';

/** The test i18n returns keys, so texts are asserted by key. */

/** Mounts the header query the page keeps alive, and prints the round it holds. */
function Host({ onClose }: { onClose: () => void }) {
  const { data } = useGetAppraisalById('a1');
  return (
    <>
      <output data-testid="cached">{String(data?.inspectionNumber ?? '')}</output>
      <EditInspectionNumberDialog isOpen onClose={onClose} appraisalId="a1" current={3} />
    </>
  );
}

const renderDialog = (onClose = vi.fn()) => ({ onClose, ...render(<Host onClose={onClose} />) });

const save = () => screen.getByRole('button', { name: 'common:actions.save', hidden: true });
const cancel = () => screen.getByRole('button', { name: 'common:actions.cancel', hidden: true });
const input = () => screen.getByRole('textbox', { hidden: true });
const cached = () => screen.getByTestId('cached').textContent;

const putPath = '*/api/appraisals/a1/inspection-number';
const noContent = () => new HttpResponse(null, { status: 204 });

let headerGets = 0;
beforeEach(() => {
  headerGets = 0;
  // The page's header query is always mounted; answer it so no test reaches the network.
  server.use(
    http.get('*/api/appraisals/a1', () => {
      headerGets++;
      return HttpResponse.json({ id: 'a1', inspectionNumber: 3 });
    }),
  );
});

const typeRound = async (user: ReturnType<typeof renderDialog>['user'], n: string) => {
  await user.clear(input());
  await user.type(input(), n);
};

describe('EditInspectionNumberDialog', () => {
  it('starts from the current round with Save off, since nothing has changed', () => {
    renderDialog();
    expect(input()).toHaveValue('3');
    expect(save()).toBeDisabled();
  });

  it('keeps Save off for 0 and for an emptied field', async () => {
    const { user } = renderDialog();
    await user.clear(input());
    expect(save()).toBeDisabled();
    await user.type(input(), '0');
    expect(save()).toBeDisabled();
  });

  it('PUTs the new round, closes, and puts it in the cached header without another GET', async () => {
    let body: unknown;
    server.use(
      http.put(putPath, async ({ request }) => {
        body = await request.json();
        return noContent();
      }),
    );
    const { user, onClose } = renderDialog();
    await waitFor(() => expect(cached()).toBe('3'));
    await typeRound(user, '5');
    expect(save()).toBeEnabled();
    await user.click(save());
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(body).toEqual({ inspectionNumber: 5 });
    expect(cached()).toBe('5');
    // Give an unawaited refetch time to start: the header must not be asked for again.
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(headerGets).toBe(1);
    expect(cached()).toBe('5');
  });

  it('cannot be cancelled or closed while the save is in flight', async () => {
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.put(putPath, async () => {
        await gate;
        return noContent();
      }),
    );
    const { user, onClose } = renderDialog();
    try {
      await typeRound(user, '5');
      await user.click(save());

      await waitFor(() => expect(cancel()).toBeDisabled());
      expect(
        screen.queryByRole('button', { name: 'Close modal', hidden: true }),
      ).not.toBeInTheDocument();
      await user.keyboard('{Escape}');
      await user.click(document.body);
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      release();
    }
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });

  it('stays open and toasts the server detail when the server refuses', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
    server.use(
      http.put(putPath, () =>
        HttpResponse.json(
          { title: 'AppraisalClosed', detail: 'Appraisal is Completed', status: 409 },
          { status: 409 },
        ),
      ),
    );
    const { user, onClose } = renderDialog();
    await waitFor(() => expect(cached()).toBe('3'));
    await typeRound(user, '5');
    await user.click(save());
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Appraisal is Completed'));
    expect(onClose).not.toHaveBeenCalled();
    expect(cached()).toBe('3');
    toastError.mockRestore();
  });

  it('toasts the translated fallback when the failure carries no detail', async () => {
    const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
    server.use(http.put(putPath, () => new HttpResponse(null, { status: 500 })));
    const { user, onClose } = renderDialog();
    await typeRound(user, '5');
    await user.click(save());
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('constructionInspection.editRound.saveFailed'),
    );
    expect(onClose).not.toHaveBeenCalled();
    toastError.mockRestore();
  });
});

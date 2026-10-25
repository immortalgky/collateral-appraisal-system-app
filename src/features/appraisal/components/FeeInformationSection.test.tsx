import { describe, expect, it, vi } from 'vitest';
import toast from 'react-hot-toast';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@/test/test-utils';
import FeeInformationSection from './FeeInformationSection';
import type { AppraisalFeeItem } from '../api/fee';

/**
 * Delete and edit act on the item the user picked, even when the list changes while the dialog is
 * open. It does when an earlier add/edit/delete's refetch lands late: the list shrinks or reorders
 * (items are ordered by fee code only), so a list position would then name another item.
 */

const item = (id: string, feeCode: string, description: string, amount: number) =>
  ({
    id,
    appraisalFeeId: 'fee-1',
    feeCode,
    feeDescription: description,
    feeAmount: amount,
    requiresApproval: false,
    approvalStatus: null,
  }) as unknown as AppraisalFeeItem;

// The test i18n returns keys, and every editable row renders its buttons twice in a row (table and
// mobile card), so the nth editable row's buttons are at 2n and 2n + 1.
const deleteButton = (row: number) =>
  screen.getAllByRole('button', { name: 'fee.aria.deleteFee' })[row * 2];
const editButton = (row: number) =>
  screen.getAllByRole('button', { name: 'fee.aria.editFee' })[row * 2];
// The dialogs render as a <dialog> without the open attribute, which jsdom treats as hidden.
const confirmDelete = () =>
  screen.queryByRole('button', { name: 'fee.deleteFeeDialog.confirm', hidden: true });

const base = item('i-base', '01', 'Appraisal fee', 10_000);
const a = item('i-a', '99', 'Other A', 100);
const b = item('i-b', '99', 'Other B', 200);
const c = item('i-c', '99', 'Other C', 300);

describe('FeeInformationSection', () => {
  it('deletes the item that was picked when the list shifts under the dialog', async () => {
    const onRemoveFeeItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { rerender } = render(
      <FeeInformationSection items={[base, a, b, c]} onRemoveFeeItem={onRemoveFeeItem} />,
    );

    await user.click(deleteButton(1)); // A, B, C are deletable; B is the second
    // A's removal refetches late: B moves up one place, C takes B's old place.
    rerender(<FeeInformationSection items={[base, b, c]} onRemoveFeeItem={onRemoveFeeItem} />);
    await user.click(confirmDelete()!);

    await waitFor(() => expect(onRemoveFeeItem).toHaveBeenCalledTimes(1));
    expect(onRemoveFeeItem).toHaveBeenCalledWith('fee-1', 'i-b');
  });

  it('deletes nothing when the picked item is gone', async () => {
    const onRemoveFeeItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { rerender } = render(
      <FeeInformationSection items={[base, a, b]} onRemoveFeeItem={onRemoveFeeItem} />,
    );

    await user.click(deleteButton(1)); // B
    rerender(<FeeInformationSection items={[base, a]} onRemoveFeeItem={onRemoveFeeItem} />);
    await user.click(confirmDelete()!);

    await waitFor(() => expect(confirmDelete()).toBeNull());
    expect(onRemoveFeeItem).not.toHaveBeenCalled();
  });

  it('saves an edit to the item that was opened when the list shifts under the modal', async () => {
    const onUpdateFeeItem = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { rerender } = render(
      <FeeInformationSection items={[base, a, b, c]} onUpdateFeeItem={onUpdateFeeItem} />,
    );

    await user.click(editButton(1));
    rerender(<FeeInformationSection items={[base, b, c]} onUpdateFeeItem={onUpdateFeeItem} />);
    await user.click(screen.getByRole('button', { name: 'common:actions.save', hidden: true }));

    await waitFor(() => expect(onUpdateFeeItem).toHaveBeenCalledTimes(1));
    expect(onUpdateFeeItem.mock.calls[0][1]).toBe('i-b');
  });

  describe('saving through the add / edit modal', () => {
    const save = () => screen.queryByRole('button', { name: 'common:actions.save', hidden: true });

    it('saves an edit to an item with a legacy fee code, keeping that code', async () => {
      const legacy = item('i-old', '03', 'Old fee', 500);
      const onUpdateFeeItem = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base, legacy]} onUpdateFeeItem={onUpdateFeeItem} />);

      await user.click(editButton(0));
      await user.click(save()!);

      await waitFor(() => expect(onUpdateFeeItem).toHaveBeenCalledTimes(1));
      expect(onUpdateFeeItem.mock.calls[0][2]).toMatchObject({ feeCode: '03', feeAmount: 500 });
    });

    it('keeps the modal open, with its input, when the save fails', async () => {
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      const onUpdateFeeItem = vi.fn().mockRejectedValue({ apiError: { detail: 'boom' } });
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base, a]} onUpdateFeeItem={onUpdateFeeItem} />);

      await user.click(editButton(0));
      await user.click(save()!);

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('boom'));
      // Still there for another try, and nothing was reported as saved.
      expect(save()).toBeInTheDocument();
      expect(screen.getByDisplayValue('Other A')).toBeInTheDocument();
      expect(save()).toBeEnabled();
    });

    it('closes the modal once the retry succeeds', async () => {
      vi.spyOn(toast, 'error').mockImplementation(() => '');
      const onUpdateFeeItem = vi
        .fn()
        .mockRejectedValueOnce({ apiError: { detail: 'boom' } })
        .mockResolvedValueOnce(undefined);
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base, a]} onUpdateFeeItem={onUpdateFeeItem} />);

      await user.click(editButton(0));
      await user.click(save()!);
      await waitFor(() => expect(onUpdateFeeItem).toHaveBeenCalledTimes(1));
      await user.click(save()!);

      await waitFor(() => expect(save()).toBeNull());
      expect(onUpdateFeeItem).toHaveBeenCalledTimes(2);
    });

    it('keeps the modal open when adding fails', async () => {
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      const onAddFeeItem = vi.fn().mockRejectedValue({ apiError: { detail: 'boom' } });
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base]} onAddFeeItem={onAddFeeItem} />);

      await user.click(screen.getByRole('button', { name: 'fee.addFee' }));
      await user.type(
        await screen.findByPlaceholderText('fee.addFeeModal.descriptionLabel'),
        'Travel',
      );
      await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
      await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('boom'));
      expect(screen.getByDisplayValue('Travel')).toBeInTheDocument();
    });

    it('does not send a fee of 0: the amount error shows after Add, not when the modal opens', async () => {
      const onAddFeeItem = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base]} onAddFeeItem={onAddFeeItem} />);

      await user.click(screen.getByRole('button', { name: 'fee.addFee' }));
      await user.type(
        await screen.findByPlaceholderText('fee.addFeeModal.descriptionLabel'),
        'Travel',
      );
      expect(screen.queryByText('validation.amountPositive')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

      expect(await screen.findByText('validation.amountPositive')).toBeInTheDocument();
      expect(onAddFeeItem).not.toHaveBeenCalled();
    });

    it('keeps the modal open and does not say "added" when the page had nothing to send to', async () => {
      const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '');
      const onAddFeeItem = vi.fn().mockResolvedValue(false);
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base]} onAddFeeItem={onAddFeeItem} />);

      await user.click(screen.getByRole('button', { name: 'fee.addFee' }));
      await user.type(
        await screen.findByPlaceholderText('fee.addFeeModal.descriptionLabel'),
        'Travel',
      );
      await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
      await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

      await waitFor(() => expect(onAddFeeItem).toHaveBeenCalledTimes(1));
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(screen.getByDisplayValue('Travel')).toBeInTheDocument();
    });

    it('keeps the modal open and says nothing was added when the page gave it no way to add', async () => {
      const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '');
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base]} />);

      await user.click(screen.getByRole('button', { name: 'fee.addFee' }));
      await user.type(
        await screen.findByPlaceholderText('fee.addFeeModal.descriptionLabel'),
        'Travel',
      );
      await user.type(screen.getByLabelText(/fee\.addFeeModal\.amountLabel/), '100');
      await user.click(screen.getByRole('button', { name: 'common:actions.add', hidden: true }));

      // Give a (wrong) handler time to run: it would toast "added", or fail on the missing callback.
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(toastError).not.toHaveBeenCalled();
      expect(screen.getByDisplayValue('Travel')).toBeInTheDocument();
    });

    it('keeps the edit modal open and says nothing was saved when the page gave it no way to update', async () => {
      const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '');
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base, a]} />);

      await user.click(editButton(0));
      await user.click(save()!);

      await new Promise(resolve => setTimeout(resolve, 50));
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(toastError).not.toHaveBeenCalled();
      expect(save()).toBeInTheDocument();
      expect(screen.getByDisplayValue('Other A')).toBeInTheDocument();
    });

    it('sends nothing, reports a failure and keeps the modal open when the item being edited is gone', async () => {
      const toastSuccess = vi.spyOn(toast, 'success').mockImplementation(() => '');
      const toastError = vi.spyOn(toast, 'error').mockImplementation(() => '');
      const onUpdateFeeItem = vi.fn().mockResolvedValue(undefined);
      const user = userEvent.setup();
      const { rerender } = render(
        <FeeInformationSection items={[base, a, b]} onUpdateFeeItem={onUpdateFeeItem} />,
      );

      await user.click(editButton(1)); // B
      rerender(<FeeInformationSection items={[base, a]} onUpdateFeeItem={onUpdateFeeItem} />);
      await user.click(save()!);

      await waitFor(() => expect(toastError).toHaveBeenCalledWith('fee.toasts.feeUpdateFailed'));
      expect(onUpdateFeeItem).not.toHaveBeenCalled();
      expect(toastSuccess).not.toHaveBeenCalled();
      expect(save()).toBeInTheDocument();
    });

    it('disables Save and Cancel while the save is in flight', async () => {
      let finish!: () => void;
      const onUpdateFeeItem = vi.fn(() => new Promise<void>(resolve => (finish = resolve)));
      const user = userEvent.setup();
      render(<FeeInformationSection items={[base, a]} onUpdateFeeItem={onUpdateFeeItem} />);

      await user.click(editButton(0));
      await user.click(save()!);

      await waitFor(() => expect(onUpdateFeeItem).toHaveBeenCalledTimes(1));
      expect(save()).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'common:actions.cancel', hidden: true }),
      ).toBeDisabled();

      finish();
      await waitFor(() => expect(save()).toBeNull());
    });
  });

  describe('items an admin set before assignment', () => {
    const adminBase = { ...base, source: 'Admin', feeAmount: 3500 } as unknown as AppraisalFeeItem;
    const adminExtra = { ...a, source: 'Admin' } as unknown as AppraisalFeeItem;

    it('shows the chip and a lock instead of edit and delete, and still lets the assignee own items be changed', () => {
      render(<FeeInformationSection items={[adminBase, adminExtra, b]} />);

      // Every row renders twice (table and mobile card): the admin's two rows are four lock icons,
      // and only the assignee's own item B has actions.
      expect(screen.getAllByRole('img', { name: 'fee.lockedAria' })).toHaveLength(4);
      // The same chip on the base and the extra item (as on the admin's fee card): 2 rows x 2 renders.
      expect(screen.getAllByText('fee.adminChip')).toHaveLength(4);
      expect(screen.getAllByRole('button', { name: 'fee.aria.deleteFee' })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: 'fee.aria.editFee' })).toHaveLength(2);
    });

    it('shows the chip without any "system calculated" figure beside an admin-changed base', () => {
      render(<FeeInformationSection items={[adminBase]} />);

      expect(screen.getAllByText('fee.adminChip').length).toBeGreaterThan(0);
      expect(screen.queryByText('fee.systemAmount')).not.toBeInTheDocument();
    });
  });
});

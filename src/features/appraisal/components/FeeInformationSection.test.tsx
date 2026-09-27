import { describe, expect, it, vi } from 'vitest';
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
});

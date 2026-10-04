import { describe, it, expect, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import ConfirmDeleteButton from './ConfirmDeleteButton';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const setup = (props = {}) => {
  const onConfirm = vi.fn();
  render(
    <div>
      <ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" {...props} />
      <button type="button">elsewhere</button>
    </div>,
  );
  return {
    onConfirm,
    button: () => screen.getByRole('button', { name: /Delete row 1|confirmDeleteLabel/ }),
  };
};

describe('ConfirmDeleteButton', () => {
  it('arms on the first click and deletes on the second', () => {
    const { onConfirm, button } = setup();
    fireEvent.click(button());
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute('data-armed', 'true');
    expect(button()).toHaveAccessibleName('actions.confirmDeleteLabel');
    expect(button()).toHaveTextContent('actions.confirmDelete');
    fireEvent.click(button());
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(button()).not.toHaveAttribute('data-armed');
  });

  it('announces the prompt politely when it arms and points the button at it', () => {
    const { button } = setup();
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('');
    expect(button()).not.toHaveAttribute('aria-describedby');
    fireEvent.click(button());
    expect(region).toHaveAttribute('aria-live', 'polite');
    expect(region).toHaveTextContent('actions.confirmDeletePrompt');
    expect(button()).toHaveAttribute('aria-describedby', region.id);
  });

  it('disarms on a press elsewhere, on focus moving away and on Escape', () => {
    const { onConfirm, button } = setup();
    fireEvent.click(button());
    fireEvent.pointerDown(screen.getByText('elsewhere'));
    expect(button()).not.toHaveAttribute('data-armed');

    fireEvent.click(button());
    act(() => screen.getByText('elsewhere').focus());
    expect(button()).not.toHaveAttribute('data-armed');

    fireEvent.click(button());
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button()).not.toHaveAttribute('data-armed');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stays armed when its own button is pressed again, and renders nothing read-only', () => {
    const { button } = setup();
    fireEvent.click(button());
    fireEvent.pointerDown(button());
    expect(button()).toHaveAttribute('data-armed', 'true');
  });

  it('disarms when it becomes disabled or read-only while armed', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" />);
    const button = () => screen.getByRole('button', { name: /Delete row 1|confirmDeleteLabel/ });
    fireEvent.click(button());
    expect(button()).toHaveAttribute('data-armed', 'true');

    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" disabled />);
    expect(button()).not.toHaveAttribute('data-armed');
    expect(button()).toBeDisabled();

    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" />);
    fireEvent.click(button());
    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" readOnly />);
    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" />);
    expect(button()).not.toHaveAttribute('data-armed');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does not come back armed when it is usable again', () => {
    const onConfirm = vi.fn();
    const { rerender } = render(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" />);
    const button = () => screen.getByRole('button', { name: /Delete row 1|confirmDeleteLabel/ });
    fireEvent.click(button());
    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" disabled />);
    rerender(<ConfirmDeleteButton onConfirm={onConfirm} label="Delete row 1" />);
    fireEvent.click(button());
    // The first click after re-enabling arms; it must not delete.
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button()).toHaveAttribute('data-armed', 'true');
  });

  it('names itself after the row number when no label is given', () => {
    render(<ConfirmDeleteButton onConfirm={vi.fn()} rowNumber={3} />);
    // The mocked t echoes the key; the interpolation value is what the real string carries.
    expect(screen.getByRole('button')).toHaveAccessibleName('actions.deleteRowN');
  });

  it('needs a label or a row number to type-check', () => {
    // @ts-expect-error neither `label` nor `rowNumber`: the name would read "Delete row undefined"
    const nameless = <ConfirmDeleteButton onConfirm={vi.fn()} />;
    expect(nameless).toBeTruthy();
  });

  it('does not render when read-only', () => {
    setup({ readOnly: true });
    expect(screen.queryByRole('button', { name: /Delete row 1/ })).toBeNull();
  });
});

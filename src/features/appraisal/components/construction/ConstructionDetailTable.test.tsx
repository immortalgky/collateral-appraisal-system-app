import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { act, fireEvent, render, screen } from '@/test/test-utils';
import { QuickAddRow } from './ConstructionDetailTable';

const setup = () => {
  const onPick = vi.fn();
  const onPickCustom = vi.fn();
  render(
    <table>
      <tbody>
        <QuickAddRow
          items={[]}
          itemLabel={i => i.nameEn}
          colSpan={3}
          onPick={onPick}
          onPickCustom={onPickCustom}
        />
      </tbody>
    </table>,
  );
  fireEvent.click(screen.getByRole('button', { name: /Other/ }));
  return { onPickCustom, input: screen.getByRole('textbox') };
};

// Only Enter adds and Escape cancels; leaving the field never adds.
describe('QuickAddRow: a name typed by hand', () => {
  it('adds exactly one row on Enter, even though the unmount blurs the input', () => {
    const { onPickCustom, input } = setup();
    fireEvent.change(input, { target: { value: 'Pool' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Enter' });
      fireEvent.blur(input);
    });
    expect(onPickCustom).toHaveBeenCalledTimes(1);
    expect(onPickCustom).toHaveBeenCalledWith('Pool');
  });

  it('adds nothing on Escape', () => {
    const { onPickCustom, input } = setup();
    fireEvent.change(input, { target: { value: 'Pool' } });
    act(() => {
      fireEvent.keyDown(input, { key: 'Escape' });
      fireEvent.blur(input);
    });
    expect(onPickCustom).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps a half-typed name open on blur, and closes an empty field', () => {
    const { onPickCustom, input } = setup();
    fireEvent.change(input, { target: { value: 'Po' } });
    fireEvent.blur(input);
    expect(onPickCustom).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toHaveValue('Po');
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '' } });
    fireEvent.blur(screen.getByRole('textbox'));
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('ignores an Enter that confirms an IME composition', () => {
    const { onPickCustom, input } = setup();
    fireEvent.change(input, { target: { value: 'Pool' } });
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true });
    expect(onPickCustom).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentValueCell } from './constructionGridCells';

const base = { calculated: 726_900, ariaLabel: 'value' };

describe('CurrentValueCell', () => {
  it('shows the calculated value with no badge or reset until overridden', () => {
    render(
      <CurrentValueCell {...base} override={{ value: null, max: 1_000_000, onChange: vi.fn() }} />,
    );
    expect(screen.getByLabelText('value')).toHaveValue('726,900');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('shows the override with a badge and a reset that hands back null', () => {
    const onChange = vi.fn();
    render(<CurrentValueCell {...base} override={{ value: 726_899, max: 1_000_000, onChange }} />);
    expect(screen.getByLabelText(/^value/)).toHaveValue('726,899');
    fireEvent.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('keeps an emptied field empty while focused and follows the rows on blur; 0 is an override', () => {
    const onChange = vi.fn();
    render(<CurrentValueCell {...base} override={{ value: 726_899, max: 1_000_000, onChange }} />);
    const input = screen.getByLabelText(/^value/);
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).not.toHaveBeenCalled();
    expect(input).toHaveValue('');
    fireEvent.blur(input);
    expect(onChange).toHaveBeenLastCalledWith(null);
    fireEvent.change(screen.getByLabelText(/^value/), { target: { value: '0' } });
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it('stores null when the typed figure equals the calculated one', () => {
    const onChange = vi.fn();
    render(<CurrentValueCell {...base} override={{ value: 726_899, max: 1_000_000, onChange }} />);
    fireEvent.change(screen.getByLabelText(/^value/), { target: { value: '726,900' } });
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('refuses a figure above the value at 100%', () => {
    const onChange = vi.fn();
    render(<CurrentValueCell {...base} override={{ value: null, max: 1_000_000, onChange }} />);
    fireEvent.change(screen.getByLabelText('value'), { target: { value: '1,000,001' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('value'), { target: { value: '726,899' } });
    expect(onChange).toHaveBeenCalledWith(726_899);
  });

  it('is plain text when read-only, still marking an override', () => {
    render(
      <CurrentValueCell
        {...base}
        readOnly
        override={{ value: 726_899, max: 1_000_000, onChange: vi.fn() }}
      />,
    );
    expect(screen.queryByLabelText('value')).toBeNull();
    expect(screen.getByText('726,899')).toBeInTheDocument();
  });
});

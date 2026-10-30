import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import SegmentedChoice, { type SegmentedOption } from './SegmentedChoice';

type V = 'internal' | 'external' | 'quotation';

const OPTIONS: SegmentedOption<V>[] = [
  { value: 'internal', label: 'Internal', description: 'Own staff' },
  { value: 'external', label: 'External', description: 'A company' },
  { value: 'quotation', label: 'Quotation', description: 'By quotation', disabled: true },
];

function Harness({
  initial = '',
  onChange = vi.fn(),
  options = OPTIONS,
  disabled,
  variant,
}: {
  initial?: V | '';
  onChange?: (v: V) => void;
  options?: SegmentedOption<V>[];
  disabled?: boolean;
  variant?: 'segmented' | 'cards';
}) {
  const [value, setValue] = useState<V | ''>(initial);
  return (
    <SegmentedChoice
      options={options}
      value={value}
      disabled={disabled}
      variant={variant}
      ariaLabel="Assignment type"
      onChange={v => {
        setValue(v);
        onChange(v);
      }}
    />
  );
}

describe('SegmentedChoice', () => {
  it('renders a radiogroup with one radio per option and marks the selected one', () => {
    render(<Harness initial="external" />);
    expect(screen.getByRole('radiogroup', { name: 'Assignment type' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByRole('radio', { name: 'External' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Internal' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('shows the description of the selected option only, and none when nothing is selected', () => {
    const { unmount } = render(<Harness initial="" />);
    expect(screen.queryByText('Own staff')).not.toBeInTheDocument();
    unmount();
    render(<Harness initial="internal" />);
    expect(screen.getByText('Own staff')).toBeInTheDocument();
    expect(screen.queryByText('A company')).not.toBeInTheDocument();
  });

  it('clicking an option selects it and swaps the description', async () => {
    const onChange = vi.fn();
    const { user } = render(<Harness initial="internal" onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'External' }));
    expect(onChange).toHaveBeenCalledWith('external');
    expect(screen.getByText('A company')).toBeInTheDocument();
    expect(screen.queryByText('Own staff')).not.toBeInTheDocument();
  });

  it('arrow keys move the selection', async () => {
    const onChange = vi.fn();
    const { user } = render(<Harness initial="internal" onChange={onChange} />);
    screen.getByRole('radio', { name: 'Internal' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('external');
    expect(screen.getByRole('radio', { name: 'External' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(onChange).toHaveBeenLastCalledWith('internal');
  });

  it('a disabled option cannot be clicked or reached by arrow keys', async () => {
    const onChange = vi.fn();
    const { user } = render(<Harness initial="external" onChange={onChange} />);
    const quotation = screen.getByRole('radio', { name: 'Quotation' });
    expect(quotation).toHaveAttribute('aria-disabled', 'true');
    await user.click(quotation);
    expect(onChange).not.toHaveBeenCalled();
    screen.getByRole('radio', { name: 'External' }).focus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).not.toHaveBeenCalledWith('quotation');
    expect(screen.getByRole('radio', { name: 'Quotation' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('a disabled group selects nothing', async () => {
    const onChange = vi.fn();
    const { user } = render(<Harness initial="internal" onChange={onChange} disabled />);
    await user.click(screen.getByRole('radio', { name: 'External' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  describe('cards', () => {
    it('shows every option with its own description, named by its label', () => {
      render(<Harness initial="internal" variant="cards" />);
      const external = screen.getByRole('radio', { name: 'External' });
      expect(external).toHaveAccessibleDescription('A company');
      expect(screen.getByRole('radio', { name: 'Internal' })).toHaveAccessibleDescription(
        'Own staff',
      );
    });

    it('a disabled card shows its reason instead of the description and cannot be picked', async () => {
      const onChange = vi.fn();
      const options: SegmentedOption<V>[] = [
        OPTIONS[0],
        { ...OPTIONS[1], disabled: true, disabledReason: 'Paused for now' },
      ];
      const { user } = render(
        <Harness initial="internal" variant="cards" options={options} onChange={onChange} />,
      );
      const external = screen.getByRole('radio', { name: 'External' });
      expect(external).toHaveAccessibleDescription('Paused for now');
      expect(screen.queryByText('A company')).not.toBeInTheDocument();
      await user.click(external);
      expect(onChange).not.toHaveBeenCalled();
    });

    it('a selected card that is now disabled keeps its description', () => {
      const options: SegmentedOption<V>[] = [
        OPTIONS[0],
        { ...OPTIONS[1], disabled: true, disabledReason: 'Paused for now' },
      ];
      render(<Harness initial="external" variant="cards" options={options} />);
      expect(screen.getByRole('radio', { name: 'External' })).toHaveAccessibleDescription(
        'A company',
      );
    });

    it('arrow keys move the selection between cards', async () => {
      const onChange = vi.fn();
      const { user } = render(<Harness initial="internal" variant="cards" onChange={onChange} />);
      screen.getByRole('radio', { name: 'Internal' }).focus();
      await user.keyboard('{ArrowRight}');
      expect(onChange).toHaveBeenLastCalledWith('external');
    });
  });
});

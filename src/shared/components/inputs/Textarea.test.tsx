import { describe, expect, it } from 'vitest';
import { useState } from 'react';
import { render, screen } from '@/test/test-utils';
import Textarea from './Textarea';

function Controlled(props: React.ComponentProps<typeof Textarea>) {
  const [value, setValue] = useState('');
  return <Textarea {...props} value={value} onChange={e => setValue(e.target.value)} />;
}

describe('Textarea', () => {
  // The counter is always on (DESIGN.md 17.3); `showCharCount={false}` opts a field out.
  it('shows the counter by default, with thousands separators', async () => {
    const { user } = render(<Controlled label="Remark" />);

    expect(screen.getByText('0/4,000')).toBeInTheDocument();
    await user.type(screen.getByLabelText('Remark'), 'Hello');
    expect(screen.getByText('5/4,000')).toBeInTheDocument();
  });

  it('counts what is typed in a box that has no value prop (register())', async () => {
    const { user } = render(<Textarea label="Remark" maxLength={100} />);

    await user.type(screen.getByLabelText('Remark'), 'Hello');
    expect(screen.getByText('5/100')).toBeInTheDocument();
  });

  it('hides the counter when a field opts out', () => {
    render(<Textarea label="Remark" showCharCount={false} />);

    expect(screen.queryByText(/\/4,000/)).not.toBeInTheDocument();
  });

  it('keeps the error on the left of the counter row and links it to the box', () => {
    render(<Textarea label="Remark" error="Required" />);

    const box = screen.getByLabelText('Remark');
    expect(box).toHaveAttribute('aria-invalid', 'true');
    expect(box).toHaveAccessibleDescription('Required');
    expect(box).toHaveClass('border-danger');
  });

  it('is the same box as a text control, taller: padding, not a fixed height', () => {
    render(<Textarea label="Remark" />);

    const box = screen.getByLabelText('Remark');
    expect(box).toHaveClass('rounded-ctl', 'py-[0.5714rem]', 'min-h-[5.1429rem]', 'resize-y');
    expect(box.className).not.toMatch(/(^|\s)h-/);
  });

  it('gives a short free-text box (max 100) the shorter minimum height', () => {
    render(<Textarea label="Other" maxLength={100} />);

    expect(screen.getByLabelText('Other')).toHaveClass('min-h-[4rem]');
  });
});

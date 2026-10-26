import { describe, expect, it } from 'vitest';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen } from '@/test/test-utils';
import userEvent from '@testing-library/user-event';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { CollapsibleNotes } from './CollapsibleNotes';

const field = {
  type: 'textarea' as const,
  label: 'Title detail',
  name: 'notes',
  maxLength: 4000,
};

function Harness({ notes = '', readOnly = false }: { notes?: string; readOnly?: boolean }) {
  const methods = useForm({ defaultValues: { titles: [{ notes }] } });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...methods}>
        <CollapsibleNotes index={0} field={field} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

const toggle = () => screen.getByRole('button', { name: 'Title detail' });
const box = () => screen.getByRole('textbox', { name: 'Title detail' });

describe('CollapsibleNotes', () => {
  it.each(['', '   \n '])('starts closed when there is no text (%j)', notes => {
    render(<Harness notes={notes} />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('starts open when there is text, with the character count under the box', () => {
    render(<Harness notes="hello" />);
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveValue('hello');
    expect(screen.getByText('5/4,000')).toBeInTheDocument();
    // the label is shown once: the box is named by it, not labelled again
    expect(screen.getAllByText('Title detail')).toHaveLength(1);
    expect(document.getElementById(toggle().getAttribute('aria-controls')!)).toContainElement(
      box(),
    );
  });

  it('opens and closes from the label', async () => {
    render(<Harness />);
    await userEvent.click(toggle());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toBeInTheDocument();
    await userEvent.click(toggle());
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('stays open when the text is cleared while typing', async () => {
    render(<Harness notes="a" />);
    await userEvent.clear(box());
    expect(toggle()).toHaveAttribute('aria-expanded', 'true');
    expect(box()).toHaveValue('');
  });

  it('follows the same rule in read-only mode', async () => {
    const { unmount } = render(<Harness notes="read me" readOnly />);
    // A read page shows the text, not a disabled box.
    expect(screen.getByText('read me')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    unmount();
    render(<Harness readOnly />);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    await userEvent.click(toggle());
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});

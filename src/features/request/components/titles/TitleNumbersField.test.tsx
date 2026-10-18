import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { TitleNumbersField, TitleNumbersSummary } from './TitleNumbersField';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}${JSON.stringify(options)}` : key,
  }),
}));

const schema = z.object({
  titles: z.array(z.object({ titleNumber: z.string().max(500, 'Title number is too long') })),
});

let form: UseFormReturn<FieldValues>;
function Harness({ value, readOnly = false }: { value: string; readOnly?: boolean }) {
  form = useForm<FieldValues>({
    defaultValues: { titles: [{ titleNumber: value }] },
    resolver: zodResolver(schema) as never,
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...form}>
        <span data-testid="dirty">{String(form.formState.isDirty)}</span>
        <TitleNumbersSummary index={0} />
        <TitleNumbersField index={0} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}
const box = () => screen.getByRole('textbox') as HTMLTextAreaElement;

describe('TitleNumbersField', () => {
  it('shows the list as loaded, and the count of parcels with the length', () => {
    render(<Harness value="1234, 1236-1250" />);
    expect(box().value).toBe('1234, 1236-1250');
    expect(
      screen.getByText(/titleSection\.numbers\.counter\{"length":15,"max":500,"count":16\}/),
    ).toBeInTheDocument();
    expect(screen.getByText(/titleSection\.numbers\.heading\{"count":16\}/)).toBeInTheDocument();
  });

  it('never rewrites a loaded value, and does not dirty the form', async () => {
    render(<Harness value="1234,1235;  1236" />);
    expect(form.getValues('titles.0.titleNumber')).toBe('1234,1235;  1236');
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
    await userEvent.click(box());
    expect(form.getValues('titles.0.titleNumber')).toBe('1234,1235;  1236');
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  it('does not rewrite or dirty a loaded value just because the box was entered and left', async () => {
    render(<Harness value="1234,1235;  1236" />);
    await userEvent.click(box());
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe('1234,1235;  1236');
    expect(screen.getByTestId('dirty')).toHaveTextContent('false');
  });

  it('tidies a loaded value once the user has changed it', async () => {
    render(<Harness value="1234;  1235" />);
    await userEvent.click(box());
    await userEvent.type(box(), ' 1236');
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe('1234,1235,1236');
  });

  it('tidies Thai numerals to Arabic digits on blur', async () => {
    render(<Harness value="" />);
    await userEvent.click(box());
    await userEvent.paste('๑๒๓๔๕, ๑๒๓๔๖');
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe('12345,12346');
  });

  it('never erases text that has no number in it', async () => {
    render(<Harness value="" />);
    await userEvent.click(box());
    await userEvent.paste('ยังไม่ทราบเลขโฉนด');
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe('ยังไม่ทราบเลขโฉนด');
    expect(box().value).toBe('ยังไม่ทราบเลขโฉนด');
  });

  it('shows a space after each comma while the stored list has none, and counts the stored length', () => {
    render(<Harness value="1234,1235,1236-1250" />);
    expect(box().value).toBe('1234, 1235, 1236-1250');
    expect(form.getValues('titles.0.titleNumber')).toBe('1234,1235,1236-1250');
    expect(
      screen.getByText(/titleSection\.numbers\.counter\{"length":19,"max":500,"count":17\}/),
    ).toBeInTheDocument();
    expect(box()).not.toHaveAttribute('maxlength');
  });

  it('counts what will be stored while editing, not the spaces typed', async () => {
    render(<Harness value="" />);
    await userEvent.click(box());
    await userEvent.paste('5,  3 ,\n4');
    expect(screen.getByText(/titleSection\.numbers\.counter\{"length":5,/)).toBeInTheDocument();
  });

  it('keeps what is typed and pasted as it is until the box is left', async () => {
    render(<Harness value="" />);
    await userEvent.click(box());
    await userEvent.paste('5, 3;  5\n4-9 ,3');
    expect(box().value).toBe('5, 3;  5\n4-9 ,3');
    expect(form.getValues('titles.0.titleNumber')).toBe('5, 3;  5\n4-9 ,3');
  });

  it('tidies on blur: split, trimmed, ranges kept, repeats dropped, joined with ","', async () => {
    render(<Harness value="" />);
    await userEvent.click(box());
    await userEvent.paste('5, 3;  5\n4-9 ,3');
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe('5,3,4-9');
    expect(box().value).toBe('5, 3, 4-9');
    await waitFor(() => expect(screen.getByTestId('dirty')).toHaveTextContent('true'));
  });

  it('leaves the text and shows the max-length error when the tidy text would not fit either', async () => {
    const entries = Array.from({ length: 120 }, (_, i) => String(100000 + i)); // 6 + 2 each > 500
    const raw = entries.join(',');
    render(<Harness value="" />);
    await userEvent.click(box());
    await act(async () => form.setValue('titles.0.titleNumber', raw));
    await userEvent.tab();
    expect(form.getValues('titles.0.titleNumber')).toBe(raw);
    expect(await screen.findByText('Title number is too long')).toBeInTheDocument();
  });

  it('tidies a too-long text that fits once tidied, and clears the error', async () => {
    const padded = Array.from({ length: 70 }, (_, i) => String(1000 + i)).join(',       ');
    expect(padded.length).toBeGreaterThan(500);
    render(<Harness value="" />);
    await userEvent.click(box());
    await act(async () => form.setValue('titles.0.titleNumber', padded));
    await userEvent.tab();
    await waitFor(() =>
      expect(form.getValues('titles.0.titleNumber').length).toBeLessThanOrEqual(500),
    );
    expect(screen.queryByText('Title number is too long')).toBeNull();
  });

  it('is read-only in read-only mode', () => {
    render(<Harness value="1, 2" readOnly />);
    expect(box()).toHaveAttribute('readonly');
  });
});

describe('TitleNumbersSummary', () => {
  it('shows the first three entries and how many parcels are left, with the whole list on hover', () => {
    render(<Harness value="1, 2, 3, 4, 10-14" />);
    const summary = screen.getByRole('button', { name: 'titleSection.numbers.goTo' });
    expect(summary.textContent).toBe('1,2,3 … titleSection.numbers.more{"count":6}');
    expect(summary).toHaveAttribute('title', '1,2,3,4,10-14');
  });

  it('shows a short list in full, without a tail', () => {
    render(<Harness value="1234, 1235" />);
    expect(screen.getByRole('button', { name: 'titleSection.numbers.goTo' }).textContent).toBe(
      '1234,1235',
    );
  });

  it('leads to the box when clicked', async () => {
    render(<Harness value="1234, 1235" />);
    await userEvent.click(screen.getByRole('button', { name: 'titleSection.numbers.goTo' }));
    expect(box()).toHaveFocus();
  });
});

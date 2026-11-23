import { beforeEach, describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { render, screen } from '@/test/test-utils';
import PdfLayoutDialog from './PdfLayoutDialog';

const setup = () => {
  const onExport = vi.fn();
  const { user } = render(<PdfLayoutDialog isOpen onClose={vi.fn()} onExport={onExport} />);
  return { user, onExport };
};
const fontDropdown = () => screen.getByRole('button', { name: 'Font size' });

beforeEach(() => localStorage.clear());

describe('PdfLayoutDialog font size', () => {
  it('defaults to 11 px and hides the number input until Custom is chosen', () => {
    setup();
    expect(fontDropdown()).toHaveTextContent('11 px');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('explains that Fit makes the font a maximum, and not for Split', async () => {
    const { user } = setup();
    expect(screen.getByText(/this is the maximum size.*down to 6 px/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: "When columns don't fit" }));
    await user.click(screen.getByRole('option', { name: 'Continue columns on next page' }));
    expect(screen.queryByText(/this is the maximum size/)).not.toBeInTheDocument();
  });

  it('shows the range hint under the number input for Custom', async () => {
    const { user } = setup();
    await user.click(fontDropdown());
    await user.click(screen.getByRole('option', { name: 'Custom' }));
    const input = screen.getByRole('textbox', { name: 'Custom font size' });
    expect(input).toHaveValue('11');
    expect(input).toHaveAccessibleDescription('Allowed 6–16 px');
  });

  it('describes an invalid custom value even while focused, and disables Export', async () => {
    const { user } = setup();
    await user.click(fontDropdown());
    await user.click(screen.getByRole('option', { name: 'Custom' }));
    const input = screen.getByRole('textbox', { name: 'Custom font size' });

    await user.clear(input);
    await user.type(input, '3');
    expect(input).toHaveAccessibleDescription('Font size must be 6–16 px');
    const message = screen.getByText('Font size must be 6–16 px');
    expect(message).toHaveClass('sr-only');

    await user.tab();
    expect(message).not.toHaveClass('sr-only');
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();

    await user.click(input);
    await user.clear(input);
    await user.type(input, '12');
    expect(input).toHaveAccessibleDescription('Allowed 6–16 px');
  });

  it('carries the picked preset into Custom, and exports a typed custom size', async () => {
    const { user, onExport } = setup();
    await user.click(fontDropdown());
    await user.click(screen.getByRole('option', { name: '13 px' }));
    await user.click(fontDropdown());
    await user.click(screen.getByRole('option', { name: 'Custom' }));
    const input = screen.getByRole('textbox', { name: 'Custom font size' });
    expect(input).toHaveValue('13');
    await user.clear(input);
    await user.type(input, '15');
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith({
      orientation: 'landscape',
      overflow: 'fit',
      fontSize: 15,
    });
    expect(JSON.parse(localStorage.getItem('operationalReports.pdfLayout')!).fontSize).toBe(15);
  });

  it('exports and remembers a preset size', async () => {
    const { user, onExport } = setup();
    await user.click(fontDropdown());
    await user.click(screen.getByRole('option', { name: '12 px' }));
    await user.click(screen.getByRole('button', { name: 'Export' }));
    expect(onExport).toHaveBeenCalledWith({
      orientation: 'landscape',
      overflow: 'fit',
      fontSize: 12,
    });
    expect(JSON.parse(localStorage.getItem('operationalReports.pdfLayout')!).fontSize).toBe(12);
  });

  it('reopens a remembered off-preset size as Custom with the number filled', () => {
    localStorage.setItem(
      'operationalReports.pdfLayout',
      JSON.stringify({ orientation: 'portrait', overflow: 'split', fontSize: 15 }),
    );
    setup();
    expect(fontDropdown()).toHaveTextContent('Custom');
    expect(screen.getByRole('textbox', { name: 'Custom font size' })).toHaveValue('15');
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ExportMenu from './ExportMenu';

describe('ExportMenu language choice', () => {
  it('exports in Thai by default and in English after toggling', async () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} isExporting={false} hasThaiHeaders />);

    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Excel' }));
    expect(onExport).toHaveBeenLastCalledWith('xlsx', 'th');

    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: 'English' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'CSV' }));
    expect(onExport).toHaveBeenLastCalledWith('csv', 'en');
  });

  it('shows no language choice and sends no lang without Thai headers', async () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} isExporting={false} />);

    await userEvent.click(screen.getByRole('button', { name: /export/i }));
    expect(screen.queryByRole('menuitemradio')).toBeNull();
    await userEvent.click(screen.getByRole('menuitem', { name: 'PDF' }));
    expect(onExport).toHaveBeenLastCalledWith('pdf', undefined);
  });

  it('picks the language with the keyboard and keeps the menu open', async () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} isExporting={false} hasThaiHeaders />);

    screen.getByRole('button', { name: /export/i }).focus();
    await userEvent.keyboard('{Enter}'); // opens, first item (ไทย) active
    await userEvent.keyboard('{ArrowDown}'); // English
    await userEvent.keyboard('{Enter}');
    expect(
      screen.getByRole('menuitemradio', { name: 'English' }).getAttribute('aria-checked'),
    ).toBe('true');

    await userEvent.click(screen.getByRole('menuitem', { name: 'Excel' }));
    expect(onExport).toHaveBeenLastCalledWith('xlsx', 'en');
  });
});

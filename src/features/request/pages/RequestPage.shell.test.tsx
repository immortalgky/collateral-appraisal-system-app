import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { delay, http, HttpResponse } from 'msw';
import { server } from '@/test/mocks/server';
import { render, screen, waitFor } from '@/test/test-utils';
import RequestPage from './RequestPage';

// The page tests run in a memory router, which has no blocker to register
vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

describe('RequestPage shell', () => {
  it('shows the header strip, the section nav and the missing-fields chip on a new request', async () => {
    render(<RequestPage />, { initialEntries: ['/requests/new'] });

    expect(await screen.findByText('No request number yet')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Jump to section' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    // an empty form is never complete: the chip lists what is missing
    expect(await screen.findByRole('button', { name: /^\d+ missing$/ })).toBeInTheDocument();
  });

  it('opens the comments drawer from the header and closes it with Escape', async () => {
    const { user } = render(<RequestPage />, { initialEntries: ['/requests/new'] });

    await user.click(await screen.findByRole('button', { name: /Comments/ }));
    expect(await screen.findByRole('dialog', { name: 'Comments' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Comments' })).toBeNull());
  });

  it('leaves the seeded blank customer and property rows out of a draft save', async () => {
    let body: { customers?: unknown[]; properties?: unknown[] } | null = null;
    server.use(
      http.post('*/api/requests/draft', async ({ request }) => {
        body = (await request.json()) as typeof body;
        return HttpResponse.json({ id: 'new-1' });
      }),
    );
    const { user } = render(<RequestPage />, { initialEntries: ['/requests/new'] });

    // the create form starts with one empty row in each table
    await waitFor(() =>
      expect(document.querySelector('[data-field="customers.0.name"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-field="properties.0.propertyType"]')).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'Save draft' }));

    await waitFor(() => expect(body).not.toBeNull());
    expect(body!.customers).toEqual([]);
    expect(body!.properties).toEqual([]);
  });

  it('is not dirty when nothing has been touched (the starting rows are part of the defaults)', async () => {
    render(<RequestPage />, { initialEntries: ['/requests/new'] });

    await waitFor(() =>
      expect(document.querySelector('[data-field="customers.0.name"]')).not.toBeNull(),
    );
    // let the debounced check and any seeding effects settle
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('shows one blank row in each table for a draft saved with none, and is not dirty', async () => {
    server.use(
      http.get('*/api/requests/draft-1', () =>
        HttpResponse.json({
          id: 'draft-1',
          requestNumber: null,
          status: 'Draft',
          requestedAt: null,
          purpose: '03',
          customers: [],
          properties: [],
          titles: [],
          documents: [],
        }),
      ),
    );
    render(
      <Routes>
        <Route path="/requests/:requestId" element={<RequestPage />} />
      </Routes>,
      { initialEntries: ['/requests/draft-1'] },
    );

    await waitFor(() =>
      expect(document.querySelector('[data-field="customers.0.name"]')).not.toBeNull(),
    );
    expect(document.querySelector('[data-field="properties.0.propertyType"]')).not.toBeNull();
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });

  it('keeps the skeleton, not the empty form, up for the whole of a slow load', async () => {
    server.use(
      http.get('*/api/requests/slow-1', async () => {
        await delay(1200);
        return HttpResponse.json({
          id: 'slow-1',
          requestNumber: 'REQ-1',
          status: 'Draft',
          requestedAt: null,
          purpose: '03',
          customers: [],
          properties: [],
          titles: [],
          documents: [],
        });
      }),
    );
    const { container } = render(
      <Routes>
        <Route path="/requests/:requestId" element={<RequestPage />} />
      </Routes>,
      { initialEntries: ['/requests/slow-1'] },
    );

    // past the 500 ms minimum, still waiting for the response
    await new Promise(resolve => setTimeout(resolve, 800));
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(document.querySelector('[data-field="customers.0.name"]')).toBeNull();

    expect(await screen.findByText('REQ-1')).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });
});

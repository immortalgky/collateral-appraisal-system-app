import { describe, expect, it, vi } from 'vitest';
import { Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import { mockRequestPageApi } from '@/test/mocks/requestPage';
import RequestPage from './RequestPage';

vi.mock('@/shared/components/UnsavedChangesDialog', () => ({ default: () => null }));

mockRequestPageApi();
// Long enough that the answer (a few ms) always comes inside it, however fast the machine is
vi.mock('./skeletonDelay', () => ({ MIN_SKELETON_MS: 1200 }));

describe('RequestPage skeleton', () => {
  it('goes away once the minimum has passed, also when the request was answered inside it', async () => {
    server.use(
      http.get('*/api/requests/r-1', () =>
        HttpResponse.json({
          id: 'r-1',
          requestNumber: 'REQ-1',
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
    const { container } = render(
      <Routes>
        <Route path="/requests/:requestId" element={<RequestPage />} />
      </Routes>,
      { initialEntries: ['/requests/r-1'] },
    );

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull();
    // it used to stay for good: the timer was cleared when the answer came
    expect(await screen.findByText('REQ-1', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(container.querySelector('[aria-busy="true"]')).toBeNull();
  });
});

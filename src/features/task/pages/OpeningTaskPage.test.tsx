import { beforeEach, describe, expect, it } from 'vitest';
import '@/i18n';
import { http, HttpResponse } from 'msw';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import OpeningTaskPage from './OpeningTaskPage';

const Where = () => <div data-testid="location">{useLocation().pathname}</div>;

/** Enters the opening gate the way a caller does: with router state attached. */
const renderGate = (state?: { landOn?: string }) =>
  render(
    <Routes>
      <Route path="/" element={<Navigate to="/tasks/t1/opening" state={state} replace />} />
      <Route path="/tasks/:taskId/opening" element={<OpeningTaskPage />} />
      <Route path="/tasks/:taskId/*" element={<Where />} />
    </Routes>,
  );

describe('OpeningTaskPage', () => {
  beforeEach(() =>
    server.use(http.post('*/tasks/t1/open', () => HttpResponse.json({ isSuccess: true }))),
  );

  it('lands on the task root by default', async () => {
    renderGate();
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tasks/t1'));
    expect(screen.getByTestId('location').textContent).toBe('/tasks/t1');
  });

  it('ignores a sub-route that is not on the allowlist', async () => {
    renderGate({ landOn: '../../admin' });
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/tasks/t1'));
    expect(screen.getByTestId('location').textContent).toBe('/tasks/t1');
  });

  it('lands on the sub-route asked for in router state', async () => {
    renderGate({ landOn: 'administration' });
    await waitFor(() =>
      expect(screen.getByTestId('location').textContent).toBe('/tasks/t1/administration'),
    );
  });
});

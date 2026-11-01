import { afterEach, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { Route, Routes, useLocation } from 'react-router-dom';
import { server } from '@/test/mocks/server';
import { render, screen } from '@/test/test-utils';
import { useNotificationStore } from '../store';
import NotificationDropdown from './NotificationDropdown';

function Where() {
  return <p data-testid="path">{useLocation().pathname}</p>;
}

describe('NotificationDropdown', () => {
  afterEach(() => useNotificationStore.setState({ notifications: [] }));

  it('opens the Administration page of the case from an assignment email failure', async () => {
    server.use(http.patch('*/notifications/:id/read', () => new HttpResponse(null)));
    useNotificationStore.setState({
      notifications: [
        {
          id: 'n1',
          title: 'ส่งอีเมลแจ้งงานไม่สำเร็จ',
          message: 'ส่งอีเมลแจ้งงาน 69105526 ถึง บริษัท ตัวอย่าง ไม่สำเร็จ: บริษัทไม่มีอีเมลในระบบ',
          type: 'AssignmentEmailFailed',
          createdAt: new Date().toISOString(),
          isRead: false,
          actionUrl: '/appraisals/a1/administration',
          metadata: { appraisalId: 'a1', emailId: 'e1' },
        },
      ],
    });
    const { user } = render(
      <Routes>
        <Route
          path="*"
          element={
            <>
              <NotificationDropdown />
              <Where />
            </>
          }
        />
      </Routes>,
    );

    await user.click(screen.getByRole('button', { name: /^Notifications/ }));
    await user.click(await screen.findByText('ส่งอีเมลแจ้งงานไม่สำเร็จ'));

    expect(screen.getByTestId('path')).toHaveTextContent('/appraisals/a1/administration');
  });
});

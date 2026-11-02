import { describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { render, screen } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import SelectedStaffDisplay from './SelectedStaffDisplay';
import type { InternalStaff } from '../types/administration';

/** A person picked from the eligible pool has a name only: the card reads the rest from the user record. */
const fromPool: InternalStaff = {
  id: 'int.staff1',
  employeeId: 'int.staff1',
  name: 'Anuwat Srisawat',
  email: '',
  department: '',
  avatar: null,
  currentWorkload: 3,
};

describe('SelectedStaffDisplay', () => {
  it('shows position, department, phone and email from the user record, and keeps the pool workload', async () => {
    const asked: string[] = [];
    server.use(
      http.get('*/auth/users/by-username/:username', ({ params }) => {
        asked.push(String(params.username));
        return HttpResponse.json({
          id: 'g1',
          username: 'int.staff1',
          firstName: 'Anuwat',
          lastName: 'Srisawat',
          email: 'int.staff1@bank.co.th',
          phoneNumber: '0898140013',
          position: 'Internal Appraiser',
          department: 'Appraisal',
        });
      }),
    );

    render(<SelectedStaffDisplay staff={fromPool} />);

    const position = await screen.findByText('Internal Appraiser');
    expect(position.parentElement?.textContent).toBe(
      'Internal Appraiser·Appraisal·0898140013·int.staff1@bank.co.th',
    );
    expect(asked).toEqual(['int.staff1']);
    expect(screen.getByText('administration.workload')).toBeInTheDocument();
  });

  it('stays a name-only card when the username is unknown (404)', async () => {
    server.use(
      http.get('*/auth/users/by-username/:username', () =>
        HttpResponse.json({ title: 'Not found' }, { status: 404 }),
      ),
    );

    render(<SelectedStaffDisplay staff={fromPool} />);

    expect(await screen.findByText('Anuwat Srisawat')).toBeInTheDocument();
    expect(screen.queryByText('Internal Appraiser')).toBeNull();
  });

  it('does not look the user up when the card already has the details', () => {
    let called = false;
    server.use(
      http.get('*/auth/users/by-username/:username', () => {
        called = true;
        return HttpResponse.json({});
      }),
    );

    render(<SelectedStaffDisplay staff={{ ...fromPool, email: 'a@bank.co.th' }} />);

    expect(called).toBe(false);
  });
});

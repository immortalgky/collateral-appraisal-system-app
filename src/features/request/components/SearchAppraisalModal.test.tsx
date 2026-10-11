import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { http, HttpResponse } from 'msw';
import { act } from '@testing-library/react';
import { render, screen, waitFor } from '@/test/test-utils';
import { server } from '@/test/mocks/server';
import SearchAppraisalModal from './SearchAppraisalModal';

const row = (n: number, over: Record<string, unknown> = {}) => ({
  id: `a-${n}`,
  appraisalNumber: `6910${String(n).padStart(4, '0')}`,
  requestNumber: `REQ-${n}`,
  status: 'Completed',
  customerName: `Customer ${n}`,
  customerCount: 1,
  propertyCount: 1,
  propertyTypes: 'L',
  appraisalValue: 3_630_000,
  facilityLimit: 800_000,
  province: null,
  district: null,
  companyName: null,
  assignmentType: null,
  inspectionNumber: null,
  appointmentDateTime: '2026-08-01T00:00:00',
  appraisalDate: '2026-09-23T00:00:00',
  ...over,
});

const respond = (rows: ReturnType<typeof row>[], count = rows.length) => {
  const calls: URLSearchParams[] = [];
  server.use(
    http.get('*/api/appraisals', ({ request }) => {
      calls.push(new URL(request.url).searchParams);
      return HttpResponse.json({ result: { items: rows, count, pageNumber: 0, pageSize: 25 } });
    }),
  );
  return calls;
};

const open = (onSelect = vi.fn()) =>
  render(<SearchAppraisalModal isOpen onClose={vi.fn()} onSelect={onSelect} />);

describe('SearchAppraisalModal', () => {
  it('shows how many were found, and dates as dd/MM/yyyy', async () => {
    respond([row(1), row(2)], 130);
    open();
    expect(await screen.findByText('130 found')).toBeInTheDocument();
    expect(screen.getAllByText('23/09/2026')).toHaveLength(2);
    expect(screen.getAllByText('3,630,000')).toHaveLength(2);
  });

  it('lists by the appraisal date, newest first, and shows that date and not the appointment', async () => {
    const calls = respond([row(1)]);
    open();
    await screen.findByText('Customer 1');
    const last = calls.at(-1)!;
    expect(last.get('sortBy')).toBe('appraisalDate');
    expect(last.get('sortDir')).toBe('desc');
    // the appointment is not asked for any more
    expect(last.has('appointmentDateFrom')).toBe(false);
    expect(screen.getByRole('button', { name: 'Appraisal Date' })).toBeInTheDocument();
    expect(screen.getByText('23/09/2026')).toBeInTheDocument();
    expect(screen.queryByText('01/08/2026')).not.toBeInTheDocument();
  });

  it('shows the report number alone in the first column, not the request number', async () => {
    respond([row(1)]);
    open();
    expect(await screen.findByText('69100001')).toBeInTheDocument();
    expect(screen.queryByText('REQ-1')).not.toBeInTheDocument();
  });

  describe('sorting', () => {
    const setup = async () => {
      const calls = respond([row(1)]);
      const view = open();
      await screen.findByText('Customer 1');
      const last = () => {
        const c = calls.at(-1)!;
        return [c.get('sortBy'), c.get('sortDir')];
      };
      return {
        ...view,
        last,
        customer: screen.getByRole('button', { name: 'Customer' }),
        date: screen.getByRole('button', { name: 'Appraisal Date' }),
        // the sort state is on the column header cell, which holds the button
        customerHead: screen.getByRole('columnheader', { name: 'Customer' }),
        dateHead: screen.getByRole('columnheader', { name: 'Appraisal Date' }),
      };
    };

    it('opens showing the default order: the date header active and descending', async () => {
      const { last, customer, date, customerHead, dateHead } = await setup();
      expect(last()).toEqual(['appraisalDate', 'desc']);
      expect(dateHead).toHaveAttribute('aria-sort', 'descending');
      expect(date).toHaveClass('text-primary');
      expect(customerHead).toHaveAttribute('aria-sort', 'none');
      expect(customer).not.toHaveClass('text-primary');
    });

    it('keeps the sorted header green on hover; only an unsorted one goes grey', async () => {
      const { customer, date } = await setup();
      expect(date).toHaveClass('hover:text-primary-700');
      expect(date).not.toHaveClass('hover:text-gray-900');
      expect(customer).toHaveClass('hover:text-gray-900');
      expect(customer).not.toHaveClass('hover:text-primary-700');
    });

    it('takes another column through ascending, descending and off, back to the date default', async () => {
      const { user, last, customer, customerHead, dateHead } = await setup();
      await user.click(customer);
      await waitFor(() => expect(last()).toEqual(['CustomerName', 'asc']));
      expect(customerHead).toHaveAttribute('aria-sort', 'ascending');
      expect(customer).toHaveClass('text-primary');
      expect(dateHead).toHaveAttribute('aria-sort', 'none');
      await user.click(customer);
      await waitFor(() => expect(last()).toEqual(['CustomerName', 'desc']));
      expect(customerHead).toHaveAttribute('aria-sort', 'descending');
      await user.click(customer);
      await waitFor(() => expect(last()).toEqual(['appraisalDate', 'desc']));
      expect(customerHead).toHaveAttribute('aria-sort', 'none');
      expect(dateHead).toHaveAttribute('aria-sort', 'descending');
    });

    it('flips the date column between descending and ascending, and never goes neutral', async () => {
      const { user, last, date, dateHead } = await setup();
      await user.click(date);
      await waitFor(() => expect(last()).toEqual(['appraisalDate', 'asc']));
      expect(dateHead).toHaveAttribute('aria-sort', 'ascending');
      await user.click(date);
      await waitFor(() => expect(last()).toEqual(['appraisalDate', 'desc']));
      expect(dateHead).toHaveAttribute('aria-sort', 'descending');
      await user.click(date);
      await waitFor(() => expect(last()).toEqual(['appraisalDate', 'asc']));
    });
  });

  it('centres the appraisal-date column, header and cells', async () => {
    respond([row(1)]);
    open();
    await screen.findByText('Customer 1');
    expect(screen.getByRole('columnheader', { name: 'Appraisal Date' })).toHaveClass(
      'justify-self-center',
    );
    expect(screen.getByText('23/09/2026')).toHaveClass('text-center');
  });

  it('keeps every English header on one line, in Title Case', async () => {
    respond([row(1)]);
    open();
    await screen.findByText('Customer 1');
    for (const name of ['Appraisal No.', 'Customer', 'Appraisal Date']) {
      expect(screen.getByRole('button', { name })).toHaveClass('whitespace-nowrap');
    }
    // the plain headers sit in the header row, which does not wrap either
    for (const text of ['Collateral', 'Appraiser', 'Appraisal Value']) {
      expect(screen.getByText(text).closest('.whitespace-nowrap')).not.toBeNull();
    }
  });

  it('shows the appraisal value alone, with no facility-limit line under it', async () => {
    respond([row(1)]);
    open();
    expect(await screen.findByText('3,630,000')).toBeInTheDocument();
    expect(screen.queryByText(/800,000/)).not.toBeInTheDocument();
  });

  it('names the appraiser: the bank when internal, the company when external, a dash when unassigned', async () => {
    respond([
      row(1, { assignmentType: 'Internal', companyName: null }),
      row(2, { assignmentType: 'External', companyName: 'Acme Appraisal Co.' }),
      row(3, { assignmentType: null, companyName: null }),
    ]);
    open();
    await screen.findByText('Customer 1');
    const [internal, external, unassigned] = screen.getAllByRole('option');
    expect(internal).toHaveTextContent('Bank');
    expect(internal).not.toHaveTextContent('Acme');
    expect(external).toHaveTextContent('Acme Appraisal Co.');
    expect(external).not.toHaveTextContent('Bank');
    expect(unassigned).not.toHaveTextContent('Bank');
    expect(unassigned).toHaveTextContent('—');
  });

  it('shows a dash for a missing value and reaches the next page of a long result', async () => {
    const calls = respond([row(1, { appraisalValue: 0 })], 130);
    const { user } = open();
    await screen.findByText('130 found');
    expect(screen.getByRole('option')).toHaveTextContent('—');
    expect(calls.at(-1)?.get('pageNumber')).toBe('0');
    await user.click(await screen.findByRole('button', { name: /next|ถัดไป/i }));
    await waitFor(() => expect(calls.some(c => c.get('pageNumber') === '1')).toBe(true));
  });

  it('Enter picks the active row; the arrow keys move it', async () => {
    respond([row(1), row(2)]);
    server.use(
      http.get('*/api/appraisals/a-2', () =>
        HttpResponse.json({
          id: 'a-2',
          appraisalNumber: '69100002',
          status: 'Completed',
          request: null,
          documents: [],
        }),
      ),
    );
    const onSelect = vi.fn();
    const { user } = open(onSelect);
    await screen.findByText('Customer 2');
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{Enter}');
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'a-2' }));
  });

  it('says so when nothing matches, and offers to clear the dates', async () => {
    respond([], 0);
    open();
    expect(await screen.findByText('No completed appraisal matches')).toBeInTheDocument();
    expect(screen.getByText(/part of the report number/)).toBeInTheDocument();
  });

  it('does not search on a term that is too short, and says why', async () => {
    const calls = respond([row(1)]);
    const { user } = open();
    await screen.findByText('Customer 1');
    await user.type(screen.getByRole('combobox'), '69');
    expect(screen.getByText('Type at least 3 characters to search.')).toBeInTheDocument();
    await new Promise(resolve => setTimeout(resolve, 450));
    expect(calls.every(c => !c.get('search'))).toBe(true);
  });
});

describe('SearchAppraisalModal loading', () => {
  /** A server whose answers wait until the test lets them go; each page has its own customer. */
  const gated = (count = 130) => {
    const waiting: (() => void)[] = [];
    server.use(
      http.get('*/api/appraisals', async ({ request }) => {
        const page = Number(new URL(request.url).searchParams.get('pageNumber') ?? 0);
        await new Promise<void>(resolve => waiting.push(resolve));
        return HttpResponse.json({
          result: { items: [row(page * 10 + 1)], count, pageNumber: page, pageSize: 10 },
        });
      }),
    );
    return {
      // lets the answers go once the modal has asked for them
      release: async () => {
        await waitFor(() => expect(waiting.length).toBeGreaterThan(0));
        await act(async () => waiting.splice(0).forEach(go => go()));
      },
    };
  };

  it('shows placeholder rows, and says it is searching, before the first answer', async () => {
    const { release } = gated();
    open();
    const list = screen.getByRole('listbox');
    expect(list).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(list.querySelectorAll('[aria-hidden] .animate-pulse').length).toBeGreaterThan(0);
    expect(screen.getByText('Searching…')).toBeInTheDocument();
    expect(screen.queryByText(/found/)).not.toBeInTheDocument();

    await release();
    expect(await screen.findByText('Customer 1')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'false');
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();
  });

  it('keeps the old rows, dimmed and busy, while the next page loads', async () => {
    const { release } = gated();
    const { user } = open();
    await release();
    await screen.findByText('Customer 1');
    // the 10-per-page size is the test server's; the pager shows once there is more than a page
    await user.click(await screen.findByRole('button', { name: /next|ถัดไป/i }));

    const list = screen.getByRole('listbox');
    await waitFor(() => expect(list).toHaveAttribute('aria-busy', 'true'));
    expect(screen.getByText('Customer 1')).toBeInTheDocument(); // not blanked
    expect(list).toHaveClass('opacity-50', 'pointer-events-none');
    expect(document.querySelector('progress')).not.toBeNull();
    expect(screen.queryByText('Searching…')).not.toBeInTheDocument();

    await release();
    expect(await screen.findByText('Customer 11')).toBeInTheDocument();
    expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'false');
    expect(document.querySelector('progress')).toBeNull();
  });

  it('does not pick a row with Enter while the rows are the previous answer', async () => {
    const { release } = gated();
    const onSelect = vi.fn();
    const { user } = open(onSelect);
    await release();
    await screen.findByText('Customer 1');
    await user.click(await screen.findByRole('button', { name: /next|ถัดไป/i }));
    await waitFor(() => expect(screen.getByRole('listbox')).toHaveAttribute('aria-busy', 'true'));
    await user.click(screen.getByRole('combobox'));
    await user.keyboard('{Enter}');
    expect(onSelect).not.toHaveBeenCalled();
    await release();
  });
});

describe('SearchAppraisalModal closing while a pick loads', () => {
  const pickAndClose = async (
    close: (user: ReturnType<typeof render>['user']) => Promise<void>,
  ) => {
    respond([row(1)]);
    let release!: () => void;
    const gate = new Promise<void>(resolve => (release = resolve));
    server.use(
      http.get('*/api/appraisals/a-1', async () => {
        await gate;
        return HttpResponse.json({
          id: 'a-1',
          appraisalNumber: '69100001',
          status: 'Completed',
          request: null,
          documents: [],
        });
      }),
    );
    const onSelect = vi.fn();
    const onClose = vi.fn();
    const { user } = render(<SearchAppraisalModal isOpen onClose={onClose} onSelect={onSelect} />);
    await user.click(await screen.findByText('Customer 1'));
    await close(user);
    expect(onClose).toHaveBeenCalled();
    release();
    // give the answer time to arrive and be dropped
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(onSelect).not.toHaveBeenCalled();
  };

  it('drops the answer when the maker presses Escape', async () => {
    await pickAndClose(user => user.keyboard('{Escape}'));
  });

  it('drops the answer when the maker presses Cancel, which stays available during the load', async () => {
    await pickAndClose(async user => {
      const cancel = screen.getByRole('button', { name: /cancel|ยกเลิก/i });
      expect(cancel).toBeEnabled();
      await user.click(cancel);
    });
  });

  it('still delivers the answer when the dialog stays open', async () => {
    respond([row(1)]);
    server.use(
      http.get('*/api/appraisals/a-1', () =>
        HttpResponse.json({
          id: 'a-1',
          appraisalNumber: '69100001',
          status: 'Completed',
          request: null,
          documents: [],
        }),
      ),
    );
    const onSelect = vi.fn();
    const { user } = open(onSelect);
    await user.click(await screen.findByText('Customer 1'));
    await waitFor(() => expect(onSelect).toHaveBeenCalledTimes(1));
  });
});

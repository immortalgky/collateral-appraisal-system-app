import { describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import type { ExternalCompany } from '../types/administration';
import CompanyDisplay from './CompanyDisplay';

// The rating stars of a company are the shared serviceQualityEvaluation StarRating; the "(x.x)"
// value beside them is the call site's own.

const company = {
  id: 'c1',
  companyName: 'Acme',
  companyNameLocal: null,
  registrationNo: '',
  contactPerson: '',
  contactPhone: '',
  contactEmail: '',
  rating: 4.5,
  activeAssignments: 2,
} as ExternalCompany;

describe('company rating on the company card', () => {
  it('shows stars with the value beside them', () => {
    const { container } = render(<CompanyDisplay company={company} />);

    expect(screen.getByText('(4.5)')).toBeInTheDocument();
    expect(container.innerHTML).toContain('star-half-stroke');
  });

  it('shows no rating for a company without one', () => {
    render(<CompanyDisplay company={{ ...company, rating: 0 }} />);

    expect(screen.queryByText(/^\(\d/)).not.toBeInTheDocument();
  });
});

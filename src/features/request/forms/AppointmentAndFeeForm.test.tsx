import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@/test/test-utils';
import AppointmentAndFeeForm from './AppointmentAndFeeForm';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

const calls = vi.hoisted(() => ({
  list: [] as { names: string[]; namePrefix?: string }[],
}));
vi.mock('@/shared/components/form', () => ({
  FormFields: ({
    fields,
    namePrefix,
  }: {
    fields: { name: string; label: string }[];
    namePrefix?: string;
  }) => {
    calls.list.push({ names: fields.map(f => f.name), namePrefix });
    return (
      <div data-testid="form-fields">
        {fields.map(f => (
          <span key={f.name}>{f.label}</span>
        ))}
      </div>
    );
  },
}));
vi.mock('@shared/components', () => ({
  SectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

describe('AppointmentAndFeeForm', () => {
  it('has two groups: appointment with the contact person, and the fee', () => {
    calls.list.length = 0;
    render(<AppointmentAndFeeForm />);

    expect(screen.getByText('requestForm.sections.appointmentAndContact')).toBeInTheDocument();
    expect(screen.getByText('requestForm.sections.fee')).toBeInTheDocument();
    expect(screen.getByText('fields.contactPersonName')).toBeInTheDocument();
    expect(screen.getByText('fields.contactPersonPhone')).toBeInTheDocument();
  });

  it('keeps the contact person at detail.contact and the rest at their full paths', () => {
    calls.list.length = 0;
    render(<AppointmentAndFeeForm />);

    const all = calls.list.flatMap(c =>
      c.names.map(n => `${c.namePrefix ? `${c.namePrefix}.` : ''}${n}`),
    );
    expect(all).toEqual(
      expect.arrayContaining([
        'detail.appointment.appointmentDateTime',
        'detail.appointment.appointmentLocation',
        'detail.contact.contactPersonName',
        'detail.contact.contactPersonPhone',
        'detail.fee.feePaymentType',
        'detail.fee.absorbedAmount',
        'detail.fee.feeNotes',
      ]),
    );
  });
});

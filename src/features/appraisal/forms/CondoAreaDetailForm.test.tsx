import { describe, expect, it } from 'vitest';
import '@/i18n';
import { FormProvider, useForm } from 'react-hook-form';
import { render, screen, within } from '@/test/test-utils';
import { FormLayoutProvider } from '@/shared/components/form';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import type { FormLayoutMode } from '@/shared/components/form';
import CondoAreaDetailForm from './CondoAreaDetailForm';

const ROWS = [
  { areaDescription: 'Living', areaSize: 20, sequence: 1 },
  { areaDescription: 'Balcony', areaSize: 5, sequence: 2 },
];

const Harness = ({
  layout,
  areaDetails = ROWS,
  readOnly = false,
}: {
  layout: FormLayoutMode;
  areaDetails?: typeof ROWS;
  readOnly?: boolean;
}) => {
  const methods = useForm({ defaultValues: { areaDetails } });
  return (
    <FormLayoutProvider layout={layout}>
      <FormReadOnlyContext.Provider value={readOnly}>
        <FormProvider {...methods}>
          <CondoAreaDetailForm name="areaDetails" />
        </FormProvider>
      </FormReadOnlyContext.Provider>
    </FormLayoutProvider>
  );
};

const addLabel = { standard: 'Add area', compact: '+ Add area' } as const;

describe.each(['standard', 'compact'] as const)('CondoAreaDetailForm (%s)', layout => {
  it('shows the rows with the total in the totals row', () => {
    render(<Harness layout={layout} />);
    expect(screen.getByLabelText('Area detail, row 1')).toHaveValue('Living');
    expect(screen.getByLabelText('Area detail, row 2')).toHaveValue('Balcony');
    const footer = screen.getAllByRole('row').at(-1)!;
    expect(within(footer).getByText('Total · 2 items')).toBeInTheDocument();
    expect(within(footer).getByText('25.00')).toBeInTheDocument();
  });

  it('adds a row, focuses its description and counts it', async () => {
    const { user } = render(<Harness layout={layout} />);
    await user.click(screen.getByRole('button', { name: addLabel[layout] }));
    expect(screen.getByLabelText('Area detail, row 3')).toHaveFocus();
    expect(screen.getByText('Total · 3 items')).toBeInTheDocument();
  });

  it('removes a row after a second click and keeps the others in order', async () => {
    const { user } = render(<Harness layout={layout} />);
    await user.click(screen.getByRole('button', { name: 'Delete row 1' }));
    await user.click(screen.getByRole('button', { name: 'Confirm delete' }));
    expect(screen.queryByLabelText('Area detail, row 2')).toBeNull();
    expect(screen.getByLabelText('Area detail, row 1')).toHaveValue('Balcony');
    expect(screen.getByText('Total · 1 item')).toBeInTheDocument();
  });

  it('moves a row down by its stored sequence', async () => {
    const { user } = render(<Harness layout={layout} />);
    await user.click(screen.getByRole('button', { name: 'Move row 1 down' }));
    expect(screen.getByLabelText('Area detail, row 1')).toHaveValue('Balcony');
    expect(screen.getByLabelText('Area detail, row 2')).toHaveValue('Living');
  });

  it('is one add box instead of a table when empty', async () => {
    const { user } = render(<Harness layout={layout} areaDetails={[]} />);
    expect(screen.queryByRole('table')).toBeNull();
    await user.click(screen.getByRole('button', { name: /No area details yet/ }));
    expect(screen.getByLabelText('Area detail, row 1')).toBeInTheDocument();
  });

  it('read-only: plain text, no controls', () => {
    render(<Harness layout={layout} readOnly />);
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Living')).toBeInTheDocument();
    expect(screen.getByText('20.00')).toBeInTheDocument();
  });
});

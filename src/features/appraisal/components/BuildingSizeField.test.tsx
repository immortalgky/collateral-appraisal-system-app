import { describe, expect, it } from 'vitest';
import '@/i18n';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { render, screen } from '@/test/test-utils';
import { FormLayoutProvider } from '@/shared/components/form/FormLayoutProvider';
import { FormProvider } from '@/shared/components/form/FormProvider';
import BuildingSizeField from './BuildingSizeField';

function Harness({ layout }: { layout: 'standard' | 'compact' }) {
  const methods = useForm<Record<string, unknown>>({
    defaultValues: { buildingWidth: 8, buildingLength: 12 },
  });
  return (
    <FormLayoutProvider layout={layout}>
      <FormProvider methods={methods} schema={z.object({}).passthrough()}>
        <BuildingSizeField />
      </FormProvider>
    </FormLayoutProvider>
  );
}

describe('BuildingSizeField', () => {
  it.each(['standard', 'compact'] as const)(
    'puts the unit inside each box, none after the last (%s)',
    layout => {
      render(<Harness layout={layout} />);
      const width = screen.getByRole('textbox', { name: 'Width' });
      const length = screen.getByRole('textbox', { name: 'Length' });
      // each input sits in a box that carries its own unit
      expect(width.parentElement).toHaveTextContent('m');
      expect(length.parentElement).toHaveTextContent('m');
      // two units in all: the one after the length box is gone
      expect(screen.getAllByText('m')).toHaveLength(2);
    },
  );
});

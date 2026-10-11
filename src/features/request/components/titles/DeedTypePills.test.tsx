import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues, type UseFormReturn } from 'react-hook-form';
import type { TFunction } from 'i18next';
import { FormReadOnlyContext } from '@/shared/components/form/context';
import { makeTitleLandFields } from '../../configs/fields';
import { requestTitleDefault } from '../../schemas/form';
import { DeedTypePills } from './DeedTypePills';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('@/shared/utils/parameterUtils', () => ({
  useParametersByGroup: () => [
    { code: 'DEED', description: 'Deed' },
    { code: 'NS3K', description: 'NS3K' },
    { code: 'NS3', description: 'NS3' },
  ],
}));

const fields = makeTitleLandFields(((key: string) => key) as unknown as TFunction<'request'>);
const titleField = fields.find(f => f.name === 'titleType');

let form: UseFormReturn<FieldValues>;
function Harness({
  readOnly = false,
  titleType = 'DEED',
  codes,
}: {
  readOnly?: boolean;
  titleType?: string;
  codes?: readonly string[];
}) {
  form = useForm<FieldValues>({
    defaultValues: {
      titles: [
        {
          ...structuredClone(requestTitleDefault),
          collateralType: '01',
          titleType,
          rawang: '5136',
          landParcelNumber: '88',
          surveyNumber: '1022',
          aerialMapName: 'old',
          mapSheetNumber: '3',
        },
      ],
    },
  });
  return (
    <FormReadOnlyContext.Provider value={readOnly}>
      <FormProvider {...form}>
        <DeedTypePills index={0} field={titleField} dependents={fields} codes={codes} />
      </FormProvider>
    </FormReadOnlyContext.Provider>
  );
}

describe('DeedTypePills', () => {
  it('marks the current type and sets the title type on a pick', async () => {
    render(<Harness />);
    expect(screen.getByRole('button', { name: 'Deed' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'NS3K' }));
    expect(form.getValues('titles.0.titleType')).toBe('NS3K');
    expect(screen.getByRole('button', { name: 'NS3K' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('clears the position fields the new type does not carry, and keeps the ones it does', async () => {
    render(<Harness titleType="DEED" />);
    await userEvent.click(screen.getByRole('button', { name: 'NS3K' }));
    // a น.ส.3 ก. has no rawang or survey page, but keeps the parcel number and takes the aerial fields
    expect(form.getValues('titles.0.rawang')).toBeNull();
    expect(form.getValues('titles.0.surveyNumber')).toBeNull();
    expect(form.getValues('titles.0.landParcelNumber')).toBe('88');
    expect(form.getValues('titles.0.mapSheetNumber')).toBe('3');
    expect(form.getValues('titles.0.aerialMapName')).toBe('old');
  });

  it('keeps everything for the catch-all types', async () => {
    render(<Harness titleType="DEED" />);
    await userEvent.click(screen.getByRole('button', { name: 'OTHER' }));
    expect(form.getValues('titles.0.rawang')).toBe('5136');
    expect(form.getValues('titles.0.aerialMapName')).toBe('old');
  });

  it('shows the required star from the config, not when read-only', () => {
    const { unmount } = render(<Harness />);
    expect(screen.getByText('fields.titleType').textContent).toContain('*');
    unmount();
    render(<Harness readOnly />);
    expect(screen.getByText('fields.titleType').textContent).not.toContain('*');
  });

  it('cannot be changed when read-only', async () => {
    render(<Harness readOnly />);
    const pill = screen.getByRole('button', { name: 'NS3K' });
    expect(pill).toBeDisabled();
    await userEvent.click(pill);
    expect(form.getValues('titles.0.titleType')).toBe('DEED');
  });

  it('is addressable by its path so the "still missing" list can focus it', () => {
    render(<Harness />);
    expect(document.querySelector('[data-field="titles.0.titleType"]')).not.toBeNull();
  });

  describe('when only some types are on offer (a condominium)', () => {
    const pills = () => screen.getAllByRole('button').map(b => b.textContent);

    it('shows just those pills', () => {
      render(<Harness codes={['DEED']} />);
      expect(pills()).toEqual(['Deed']);
      expect(screen.getByRole('button', { name: 'Deed' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('also shows a saved value outside the list, leaves it alone, and lets the user switch', async () => {
      render(<Harness codes={['DEED']} titleType="NS3K" />);
      expect(pills()).toEqual(['Deed', 'NS3K']);
      expect(screen.getByRole('button', { name: 'NS3K' })).toHaveAttribute('aria-pressed', 'true');
      expect(form.getValues('titles.0.titleType')).toBe('NS3K');
      await userEvent.click(screen.getByRole('button', { name: 'Deed' }));
      expect(form.getValues('titles.0.titleType')).toBe('DEED');
    });

    it('offers every type when no list is given', () => {
      render(<Harness />);
      expect(pills()).toHaveLength(6);
    });
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm, type FieldValues } from 'react-hook-form';
import { requestTitleDefault } from '../../schemas/form';
import { TitleTable, TitleTableGroup } from './TitleTable';

vi.mock('react-i18next', async importOriginal => ({
  ...(await importOriginal<typeof import('react-i18next')>()),
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}${JSON.stringify(options)}` : key,
  }),
}));
const card = vi.hoisted(() => ({ wide: true }));
vi.mock('../documentCard/usePaneLayout', () => ({
  useCardIsWide: () => [{ current: null }, card.wide] as const,
}));
vi.mock('./titleHooks', () => ({ useMissingFieldLabel: () => (path: string) => path }));

const actions = {
  open: vi.fn(),
  duplicate: vi.fn(),
  remove: vi.fn(),
  moveTo: vi.fn(),
  moveToEdge: vi.fn(),
};

const titles = [
  { ...structuredClone(requestTitleDefault), collateralType: '01', titleNumber: '1' },
  { ...structuredClone(requestTitleDefault), collateralType: '01', titleNumber: '2' },
  { ...structuredClone(requestTitleDefault), collateralType: '10', titleNumber: 'AB 1' },
];

function Harness() {
  const form = useForm<FieldValues>({ defaultValues: { titles } });
  const common = {
    titles: titles as never,
    sigs: ['a', 'b', 'c'],
    missing: [[], [], []],
    readOnly: false,
    canOrder: true,
    dragOff: false,
    orderLocked: false,
    actions,
    onReorder: vi.fn(),
  };
  return (
    <FormProvider {...form}>
      <TitleTableGroup hasEstate>
        {collapsed => (
          <>
            <TitleTable
              {...common}
              kind="estate"
              heading="Estate"
              rows={[0, 1]}
              groupRows={[0, 1]}
              collapsed={collapsed}
            />
            <TitleTable
              {...common}
              kind="movable"
              heading="Movable"
              rows={[2]}
              groupRows={[2]}
              collapsed={collapsed}
            />
          </>
        )}
      </TitleTableGroup>
    </FormProvider>
  );
}

/** The card's width as the table's observer reports it. */
const observeWidth = (width: number) => {
  card.wide = width >= 60 * 14;
};

describe('TitleTable actions column', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the three icons and the menu when the card is wide enough', () => {
    observeWidth(2000);
    render(<Harness />);
    expect(screen.getAllByLabelText('common:actions.edit')).toHaveLength(3);
    expect(screen.getAllByLabelText('titleSection.row.menu')).toHaveLength(3);
  });

  it('folds the actions of BOTH tables into the menu when the card is narrow', async () => {
    observeWidth(300);
    render(<Harness />);
    expect(screen.queryByLabelText('common:actions.edit')).toBeNull();
    await userEvent.click(screen.getAllByLabelText('titleSection.row.menu')[0]);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'common:actions.edit' }));
    expect(actions.open).toHaveBeenCalledWith(0);
    // the movable table's row (index 2) folded too
    await userEvent.click(screen.getAllByLabelText('titleSection.row.menu')[2]);
    await userEvent.click(await screen.findByRole('menuitem', { name: 'actions.delete' }));
    expect(actions.remove).toHaveBeenCalledWith(2);
  });
});

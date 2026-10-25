import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@/test/test-utils';
import { useUIStore } from '@/shared/store';
import { FormLayoutProvider, UserFormLayoutProvider } from './FormLayoutProvider';
import { useFormLayout } from './formLayoutContext';

const Probe = () => <span data-testid="layout">{useFormLayout()}</span>;

describe('FormLayoutProvider', () => {
  const initial = useUIStore.getState().formLayout;
  afterEach(() => useUIStore.setState({ formLayout: initial }));

  it('is standard outside any provider', () => {
    render(<Probe />);
    expect(screen.getByTestId('layout')).toHaveTextContent('standard');
  });

  it.each(['standard', 'compact'] as const)('gives %s when set explicitly', layout => {
    // Whatever the user's setting is.
    useUIStore.setState({ formLayout: layout === 'standard' ? 'grid' : 'classic' });
    render(
      <FormLayoutProvider layout={layout}>
        <Probe />
      </FormLayoutProvider>,
    );
    expect(screen.getByTestId('layout')).toHaveTextContent(layout);
  });

  it.each([
    ['grid', 'compact'],
    ['classic', 'standard'],
  ] as const)('maps the user setting %s to %s', (setting, layout) => {
    useUIStore.setState({ formLayout: setting });
    render(
      <UserFormLayoutProvider>
        <Probe />
      </UserFormLayoutProvider>,
    );
    expect(screen.getByTestId('layout')).toHaveTextContent(layout);
  });

  it('an explicit provider inside the user one wins (a Block page inside a property screen)', () => {
    useUIStore.setState({ formLayout: 'grid' });
    render(
      <UserFormLayoutProvider>
        <FormLayoutProvider layout="standard">
          <Probe />
        </FormLayoutProvider>
      </UserFormLayoutProvider>,
    );
    expect(screen.getByTestId('layout')).toHaveTextContent('standard');
  });
});

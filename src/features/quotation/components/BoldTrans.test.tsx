import { describe, expect, it } from 'vitest';
import '@/i18n';
import { render } from '@/test/test-utils';
import BoldTrans from './BoldTrans';

// QuotationSelectionPage renders four of these keys but is too heavy for a unit test, so the
// component that owns the string is tested here for every key it accepts. Without the escape
// override in BoldTrans, the <strong> case below nests a second bold element and fails.
const KEYS = [
  ['cancel.bodyRich', 'number'],
  ['cancel.draftBody', 'number'],
  ['cancel.standaloneBody', 'number'],
  ['finalize.awardBody', 'company'],
  ['finalize.awardBodyAssigning', 'company'],
  ['rejectWinner.body', 'company'],
  ['selectWinner.bodyRich', 'company'],
  ['shared.quotationAwarded', 'company'],
] as const;

describe('BoldTrans', () => {
  it.each(KEYS)('%s keeps an image-tag name as text, in one bold element', (key, name) => {
    const hostile = '<img src=x onerror=alert(1)>';
    const { container } = render(<BoldTrans i18nKey={key} values={{ [name]: hostile }} />);

    expect(container.querySelector('img')).toBeNull();
    const bold = container.querySelectorAll('strong');
    expect(bold).toHaveLength(1);
    expect(bold[0].textContent).toBe(hostile);
  });

  it.each(KEYS)('%s does not let a <strong> in the name add a second bold element', (key, name) => {
    const hostile = '<strong>Evil</strong>';
    const { container } = render(<BoldTrans i18nKey={key} values={{ [name]: hostile }} />);

    const bold = container.querySelectorAll('strong');
    expect(bold).toHaveLength(1);
    expect(bold[0].textContent).toBe(hostile);
  });

  it('bolds a number and applies the class', () => {
    const { container } = render(
      <BoldTrans
        i18nKey="shortlist.sendToRmBody"
        values={{ count: 3 }}
        strongClassName="text-gray-900"
      />,
    );

    const bold = container.querySelector('strong');
    expect(bold?.textContent).toBe('3');
    expect(bold).toHaveClass('text-gray-900');
  });
});

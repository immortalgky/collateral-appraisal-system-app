import { act, render, screen } from '@testing-library/react';
import { addDays } from 'date-fns';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import Input from '../Input';
import NumberInput from '../inputs/NumberInput';
import { validateDateConstraints } from '../inputs/dateConstraints';
import { FormFieldShell } from './FormFieldShell';
import { ValidationText } from './ValidationText';
import { tokenT, translateValidationMessage, vmsg } from './validationMessage';

// The typed `t` only takes known keys; a token's key is a runtime string
const t = (key: string, options?: object) =>
  i18n.t(key as never, options as never) as unknown as string;
const shown = (message: string, label?: string) => translateValidationMessage(t, message, label);

const setLanguage = (lng: 'en' | 'th' | 'zh') =>
  act(async () => {
    await i18n.changeLanguage(lng);
  });

describe('validation message tokens', () => {
  beforeEach(() => setLanguage('en'));

  it('are plain strings that carry no language', () => {
    expect(vmsg('maxLength', { max: 5 })).toBe('i18n:common:validation.maxLength|{"max":5}');
    expect(vmsg('request:validation.provinceRequired')).toBe(
      'i18n:request:validation.provinceRequired',
    );
  });

  it('come out of a schema factory built with the token t, params included', async () => {
    const t = tokenT('committee');
    expect(t('validation.majorityValueExceedsMembers', { max: 7 })).toBe(
      vmsg('committee:validation.majorityValueExceedsMembers', { max: 7 }),
    );
    await i18n.loadNamespaces('committee');
    await setLanguage('th');
    expect(shown(t('validation.majorityValueExceedsMembers', { max: 7 }))).toContain('7');
  });

  it('leave a legacy sentence alone', () => {
    expect(shown('Land Description is required')).toBe('Land Description is required');
  });

  it('read as the field name plus the rule when a label is known, and the rule alone when not', async () => {
    expect(shown(vmsg('required'), 'Land Description')).toBe('Land Description is required');
    expect(shown(vmsg('required'))).toBe('This field is required');
    await setLanguage('th');
    expect(shown(vmsg('required'), 'รายละเอียดที่ดิน')).toBe('กรุณาระบุรายละเอียดที่ดิน');
    expect(shown(vmsg('required'))).toBe('จำเป็นต้องกรอกข้อมูลนี้');
  });

  it('put the limit in with thousands separators', async () => {
    await setLanguage('th');
    expect(shown(vmsg('maxLength', { max: 4000 }), 'หมายเหตุ')).toBe(
      'หมายเหตุ ต้องไม่เกิน 4,000 ตัวอักษร',
    );
    expect(shown(vmsg('minValue', { min: 5 }))).toBe('ต้องไม่น้อยกว่า 5');
    await setLanguage('zh');
    expect(shown(vmsg('maxValue', { max: 10 }))).toBe('不能大于 10');
  });

  it('keep the text before a token (a summary row reads "Field: message")', async () => {
    await setLanguage('th');
    expect(shown(`Land Description: ${vmsg('required')}`, 'ignored')).toBe(
      'Land Description: จำเป็นต้องกรอกข้อมูลนี้',
    );
  });

  it('come out of the date constraints in the UI language', async () => {
    const message = validateDateConstraints(addDays(new Date(), -3), { disablePastDates: true });
    expect(message).toBe(vmsg('datePast'));
    await setLanguage('th');
    expect(shown(message!)).toBe('เลือกวันที่ผ่านมาแล้วไม่ได้');
  });
});

describe('the error text a control shows', () => {
  beforeEach(() => setLanguage('en'));

  it('names the field by the label its wrapper draws, in the UI language', async () => {
    await setLanguage('th');
    render(
      <FormFieldShell name="landDescription" label="รายละเอียดที่ดิน" labelFor="land">
        <Input id="land" error={vmsg('required')} />
      </FormFieldShell>,
    );
    expect(screen.getByText('กรุณาระบุรายละเอียดที่ดิน')).toBeInTheDocument();
  });

  it('uses the control own label when it draws one', () => {
    render(<NumberInput label="Amount" error={vmsg('minValue', { min: 5 })} />);
    expect(screen.getByText('Amount must be at least 5')).toBeInTheDocument();
  });

  it('falls back to the rule alone with no label anywhere', () => {
    render(<Input aria-label="cell" error={vmsg('maxLength', { max: 10 })} />);
    expect(screen.getByText('Must be at most 10 characters')).toBeInTheDocument();
  });

  it('follows a language switch without the message being rebuilt', async () => {
    render(
      <FormFieldShell name="landDescription" label="Land Description" labelFor="land">
        <Input id="land" error={vmsg('required')} />
      </FormFieldShell>,
    );
    expect(screen.getByText('Land Description is required')).toBeInTheDocument();

    await setLanguage('th');
    expect(screen.getByText('กรุณาระบุLand Description')).toBeInTheDocument();
    expect(screen.queryByText('Land Description is required')).toBeNull();

    await setLanguage('en');
    expect(screen.getByText('Land Description is required')).toBeInTheDocument();
  });

  it('is what a hand-built `{errors.x.message}` renders through: a token reads, nothing renders for none', async () => {
    await setLanguage('th');
    const { container } = render(
      <p>
        <ValidationText message={vmsg('minValue', { min: 1 })} />
      </p>,
    );
    expect(screen.getByText('ต้องไม่น้อยกว่า 1')).toBeInTheDocument();
    expect(screen.queryByText(/i18n:/)).toBeNull();

    render(<ValidationText message={undefined} />);
    expect(container.textContent).not.toContain('i18n:');
  });

  it('shows a legacy plain sentence as it is, in any language', async () => {
    await setLanguage('th');
    render(<Input aria-label="cell" error="Item is required" />);
    expect(screen.getByText('Item is required')).toBeInTheDocument();
  });
});

import { createContext } from 'react';
import type { FlatNamespace, TFunction } from 'i18next';
import { z } from 'zod';

/**
 * Validation messages are locale-independent tokens, translated where they are rendered, so a
 * message already sitting in the form state follows a language switch and never freezes in English
 * (DESIGN.md 17.8). A token is `i18n:<ns>:<key>` with optional `|<json params>`; a plain string is
 * a legacy sentence and renders as it is.
 */
const PREFIX = 'i18n:';

type Params = Record<string, string | number>;
// i18next's `t` is overloaded per namespace; the key here is a runtime string, so it is typed loose.
type Translate = (key: never, options?: never) => unknown;

/**
 * Builds a token. A bare name is a key under `common:validation.`; `ns:full.key` names another
 * namespace's key. `{{label}}` is filled in at render with the label of the field showing the
 * message, and the `_labeled` variant of the key is used when there is one (the base key is the
 * label-less sentence).
 *
 * @example vmsg('maxLength', { max: 100 })  // "ไม่เกิน 100 ตัวอักษร", or "ชื่อ ไม่เกิน 100 ตัวอักษร" in a labelled field
 */
export function vmsg(key: string, params?: Params): string {
  const full = key.includes(':') ? key : `common:validation.${key}`;
  return `${PREFIX}${full}${params ? `|${JSON.stringify(params)}` : ''}`;
}

/**
 * A stand-in `t` for the schema factories that take one (`makeXSchema(t)`): `t('validation.x')`
 * comes back as the token `vmsg('ns:validation.x')`, so a schema built once with it serves every
 * language and a message in the form state follows a language switch.
 */
export function tokenT<N extends FlatNamespace>(ns: N): TFunction<N> {
  const t = (key: string, options?: Params) => vmsg(`${ns}:${key}`, options);
  return t as unknown as TFunction<N>;
}

/** The label of the field a control sits in (set by `FormFieldShell`), for the `{{label}}` slot. */
export const ValidationLabelContext = createContext<string | undefined>(undefined);

export function hasValidationToken(message: string | undefined): message is string {
  return !!message && message.includes(PREFIX);
}

/** The namespace a token's key lives in (`common` for `vmsg('required')`). */
export function validationNamespace(message: string): string {
  const key = message.slice(message.indexOf(PREFIX) + PREFIX.length).split('|', 1)[0];
  return key.split(':', 1)[0] || 'common';
}

const formatParam = (v: string | number) =>
  typeof v === 'number' ? v.toLocaleString('en-US', { maximumFractionDigits: 6 }) : v;

/**
 * Turns a message into display text. Text before a token (a "Field: " prefix) is kept, and then
 * names the field itself, so `label` only applies to a message that is a token on its own.
 */
export function translateValidationMessage(t: Translate, message: string, label?: string): string {
  const at = message.indexOf(PREFIX);
  if (at < 0) return message;

  const head = message.slice(0, at);
  const body = message.slice(at + PREFIX.length);
  const bar = body.indexOf('|');
  const key = bar < 0 ? body : body.slice(0, bar);

  let params: Params = {};
  if (bar >= 0) {
    try {
      params = JSON.parse(body.slice(bar + 1));
    } catch {
      return message;
    }
  }

  const name = head ? undefined : label;
  const values = Object.fromEntries(Object.entries(params).map(([k, v]) => [k, formatParam(v)]));
  const text = String(
    (t as (k: string, o?: object) => unknown)(key, {
      ...values,
      label: name,
      context: name ? 'labeled' : undefined,
    }),
  );
  return head + text;
}

/**
 * Zod's own default sentences ("Required", "Expected string, received null", "Invalid") become
 * tokens too. A message a schema sets itself wins over this map, so only what nobody wrote comes
 * through here.
 */
const tokenErrorMap: z.ZodErrorMap = (issue, ctx) => {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      if (issue.received === 'nan') return { message: vmsg('invalidNumber') };
      return {
        message: vmsg(
          issue.received === 'undefined' || issue.received === 'null' ? 'required' : 'invalidValue',
        ),
      };
    case z.ZodIssueCode.too_small: {
      const min = Number(issue.minimum);
      // A bare `.min(1)` on text or a list is how a schema says "required"
      if (min === 1 && issue.inclusive && (issue.type === 'string' || issue.type === 'array'))
        return { message: vmsg('required') };
      if (issue.type === 'string') return { message: vmsg('minLength', { min }) };
      if (issue.type === 'array') return { message: vmsg('minItems', { min }) };
      if (issue.type === 'number')
        return { message: vmsg(issue.inclusive ? 'minValue' : 'greaterThan', { min }) };
      break;
    }
    case z.ZodIssueCode.too_big: {
      const max = Number(issue.maximum);
      if (issue.type === 'string') return { message: vmsg('maxLength', { max }) };
      if (issue.type === 'array') return { message: vmsg('maxItems', { max }) };
      if (issue.type === 'number')
        return { message: vmsg(issue.inclusive ? 'maxValue' : 'lessThan', { max }) };
      break;
    }
    case z.ZodIssueCode.invalid_string:
      return { message: vmsg(issue.validation === 'email' ? 'invalidEmail' : 'invalidFormat') };
    case z.ZodIssueCode.not_multiple_of:
      return { message: vmsg('invalidNumber') };
    case z.ZodIssueCode.invalid_date:
      return { message: vmsg('invalidDate') };
  }
  return { message: ctx.defaultError };
};

// Installed on import: every schema that builds its messages here parses under it.
z.setErrorMap(tokenErrorMap);

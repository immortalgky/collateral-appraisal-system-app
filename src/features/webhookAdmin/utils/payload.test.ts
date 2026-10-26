import { describe, expect, it } from 'vitest';
import { parsePayloadRefs, tokenizeJson } from './payload';

describe('parsePayloadRefs', () => {
  it('reads eventId and data.appraisalNumber', () => {
    const payload = JSON.stringify({ eventId: 'e-1', data: { appraisalNumber: 69105470 } });
    expect(parsePayloadRefs(payload)).toEqual({ eventId: 'e-1', appraisalNumber: '69105470' });
  });

  it('survives a payload that is missing, not JSON, or not an object', () => {
    expect(parsePayloadRefs(undefined)).toEqual({});
    expect(parsePayloadRefs('not json')).toEqual({});
    expect(parsePayloadRefs('null')).toEqual({ eventId: undefined, appraisalNumber: undefined });
  });
});

describe('tokenizeJson', () => {
  it('marks only keys, and gives the text back unchanged', () => {
    const pretty = JSON.stringify({ a: 'x: "y"', b: { c: 1 } }, null, 2);
    const tokens = tokenizeJson(pretty);
    expect(tokens.map(t => t.text).join('')).toBe(pretty);
    expect(tokens.filter(t => t.key).map(t => t.text)).toEqual(['"a"', '"b"', '"c"']);
  });
});

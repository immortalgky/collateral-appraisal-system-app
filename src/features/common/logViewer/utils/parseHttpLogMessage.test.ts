import { describe, it, expect } from 'vitest';
import { parseHttpLogMessage, isHttpLoggingRow } from './parseHttpLogMessage';

describe('parseHttpLogMessage', () => {
  it('parses newline-separated CombineLogs fields', () => {
    const message = [
      'Request and Response:',
      'Method: POST',
      'Path: /api/v1/requests',
      'StatusCode: 400',
      'RequestBody: {"a":1}',
      'ResponseBody: {"title":"Validation failed"}',
      'Duration: 38.4',
    ].join('\n');
    expect(parseHttpLogMessage(message)).toEqual({
      method: 'POST',
      path: '/api/v1/requests',
      statusCode: 400,
      durationMs: 38.4,
    });
  });

  it('parses space-separated fields', () => {
    const message =
      'Request and Response: Method: GET Path: /api/v1/appraisals/AP-1/status StatusCode: 200 Duration: 12';
    expect(parseHttpLogMessage(message)).toEqual({
      method: 'GET',
      path: '/api/v1/appraisals/AP-1/status',
      statusCode: 200,
      durationMs: 12,
    });
  });

  it('parses the real CombineLogs format (captured from dev)', () => {
    const message = [
      'Request and Response:',
      'Method: POST',
      'PathBase: ',
      'Path: /api/v1/requests',
      'QueryString: ',
      'StatusCode: 400',
      'RequestBody: {"externalReference":"E2E-LOG-TEST","channel":"LOS"}',
      'RequestBodyStatus: [Completed]',
      'ResponseBody: {"title":"ValidationException","status":400,"errors":{"Channel":["\'Channel\' must not be empty."]}}',
      'Duration: 85.1427',
    ].join('\n');
    expect(parseHttpLogMessage(message)).toEqual({
      method: 'POST',
      path: '/api/v1/requests',
      statusCode: 400,
      durationMs: 85.1427,
    });
  });

  it('parses a GET row with no request/response body lines', () => {
    const message = [
      'Request and Response:',
      'Method: GET',
      'PathBase: ',
      'Path: /api/v1/appraisals/AP-1/status',
      'QueryString: ',
      'StatusCode: 200',
      'Duration: 6.2',
    ].join('\n');
    expect(parseHttpLogMessage(message)).toEqual({
      method: 'GET',
      path: '/api/v1/appraisals/AP-1/status',
      statusCode: 200,
      durationMs: 6.2,
    });
  });

  it('takes the LAST Duration line, even after a multi-line response body', () => {
    const message = [
      'Request and Response:',
      'Method: POST',
      'PathBase: ',
      'Path: /api/v1/requests',
      'QueryString: ',
      'StatusCode: 200',
      'RequestBody: {"a":1}',
      'RequestBodyStatus: [Completed]',
      'ResponseBody: {',
      '  "id": "abc",',
      '  "lines": ["one", "two"]',
      '}',
      'Duration: 12.5',
    ].join('\n');
    expect(parseHttpLogMessage(message)?.durationMs).toBe(12.5);
  });

  it('tolerates a missing duration', () => {
    const message = 'Method: GET Path: /api/v1/x StatusCode: 200';
    expect(parseHttpLogMessage(message)?.durationMs).toBeNull();
  });

  it('falls back to null when the shape does not match', () => {
    expect(parseHttpLogMessage('some unrelated log line')).toBeNull();
    expect(parseHttpLogMessage(null)).toBeNull();
    expect(parseHttpLogMessage('')).toBeNull();
  });

  it('recognises the HttpLogging source context', () => {
    expect(isHttpLoggingRow('Microsoft.AspNetCore.HttpLogging.HttpLoggingMiddleware')).toBe(true);
    expect(isHttpLoggingRow('Shared.Behaviors.LoggingBehavior')).toBe(false);
    expect(isHttpLoggingRow(null)).toBe(false);
  });
});

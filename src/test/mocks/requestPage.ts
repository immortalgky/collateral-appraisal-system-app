import { afterEach, beforeEach, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './server';

/**
 * What the Request page asks for besides the request itself, answered empty: the address masters the
 * pickers load, the document types, the comment list, and the checklist of required documents. A
 * test that needs a different answer puts its own handler in front with server.use.
 */
export const requestPageHandlers = [
  http.get('*/api/parameters/addresses/title', () => HttpResponse.json([])),
  http.get('*/api/parameters/addresses/dopa', () => HttpResponse.json([])),
  http.get('*/api/document-types', () => HttpResponse.json({ documentTypes: [] })),
  http.get('*/api/requests/:id/comments', () => HttpResponse.json({ comments: [] })),
  http.get('*/api/document-checklist', () =>
    HttpResponse.json({ applicationDocuments: [], propertyTypeGroups: [] }),
  ),
];

/**
 * For a test file that must stay off the network: installs requestPageHandlers before each test and
 * fails the test if any request is still unanswered. Unanswered requests are only warned about by
 * default, and they then go to whatever listens on the API port: a dev server on a developer's
 * machine answers them, so such a test passes there and fails where nothing listens (CI).
 */
export function mockRequestPageApi() {
  const unanswered: string[] = [];
  const record = ({ request }: { request: Request }) => {
    unanswered.push(`${request.method} ${new URL(request.url).pathname}`);
  };
  beforeEach(() => {
    unanswered.length = 0;
    server.use(...requestPageHandlers);
    server.events.on('request:unhandled', record);
  });
  afterEach(() => {
    server.events.removeListener('request:unhandled', record);
    expect(unanswered, 'requests no handler answered').toEqual([]);
  });
}

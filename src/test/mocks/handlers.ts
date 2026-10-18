/**
 * MSW Request Handlers
 * Define mock API responses here
 */
import { http, HttpResponse, delay } from 'msw';

// Base API URL - use wildcard to match any origin in tests
// This allows handlers to intercept requests regardless of VITE_API_URL setting
const API_URL = '*/api';

// ============================================
// Mock Data
// ============================================
export const mockUser = {
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: 'appraiser',
};

export const mockRequest = {
  id: 1,
  appraisalNo: 'APR-2024-001',
  status: 'pending',
  createdAt: '2024-01-15T10:00:00Z',
};

export const mockParameters = [
  { id: 1, group: 'collateral', value: 'Land', label: 'Land' },
  { id: 2, group: 'collateral', value: 'Building', label: 'Building' },
  { id: 3, group: 'status', value: 'Active', label: 'Active' },
];

// ============================================
// Request Handlers
// ============================================
export const handlers = [
  // CORS preflight: the SPA sends credentials and custom headers (X-Background-Request) on
  // cross-origin calls, so the browser asks first. Answer it for every path.
  http.options('*', ({ request }) => {
    return new HttpResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': request.headers.get('Origin') ?? '*',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE',
        'Access-Control-Allow-Headers':
          request.headers.get('Access-Control-Request-Headers') ?? '*',
      },
    });
  }),

  // ------------------------------------------
  // Auth Endpoints
  // ------------------------------------------

  // POST /auth/logout - Ends the session; the API answers with the IdP end-session URL.
  http.post(`${API_URL}/auth/logout`, async () => {
    await delay(50);
    return HttpResponse.json({ url: 'https://idp.example.com/connect/logout' });
  }),

  // GET /auth/me - Get current user. The session is an HttpOnly cookie that MSW cannot see, so
  // answer as a signed-in user; tests for a dead session override this with `errorHandlers.noSession`.
  http.get(`${API_URL}/auth/me`, async () => {
    await delay(50);
    return HttpResponse.json(mockUser);
  }),

  // ------------------------------------------
  // Request Endpoints
  // ------------------------------------------

  // GET /requests - List all requests
  http.get(`${API_URL}/requests`, async () => {
    await delay(100);
    return HttpResponse.json({
      data: [mockRequest],
      total: 1,
    });
  }),

  // GET /requests/:id - Get single request
  http.get(`${API_URL}/requests/:id`, async ({ params }) => {
    await delay(100);

    const id = Number(params.id);

    // Simulate not found
    if (id === 999) {
      return HttpResponse.json({ message: 'Request not found' }, { status: 404 });
    }

    return HttpResponse.json({
      ...mockRequest,
      id,
    });
  }),

  // POST /requests - Create new request
  http.post(`${API_URL}/requests`, async ({ request }) => {
    await delay(200);

    const body = await request.json();

    // Simulate validation error
    if (!body) {
      return HttpResponse.json(
        { message: 'Request body is required' },
        { status: 400 }
      );
    }

    return HttpResponse.json(
      { id: Math.floor(Math.random() * 1000), ...(body as object) },
      { status: 201 }
    );
  }),

  // ------------------------------------------
  // Document Endpoints
  // ------------------------------------------

  // POST /documents/upload - Upload documents
  http.post(`${API_URL}/documents/upload`, async ({ request }) => {
    await delay(500); // Simulate upload time

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    // Return mock document data
    return HttpResponse.json(
      files.map((file, index) => ({
        documentId: `doc-${Date.now()}-${index}`,
        fileName: file.name,
        filePath: `/uploads/${file.name}`,
        fileSize: file.size,
        uploadDate: new Date().toISOString(),
      }))
    );
  }),

  // GET /documents/:id/download - Download document
  http.get(`${API_URL}/documents/:id/download`, async () => {
    await delay(100);

    // Return a mock PDF blob
    const blob = new Blob(['Mock PDF content'], { type: 'application/pdf' });
    return new HttpResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="document.pdf"',
      },
    });
  }),

  // ------------------------------------------
  // Parameter Endpoints
  // ------------------------------------------

  // GET /parameters - Get parameters
  http.get(`${API_URL}/parameters`, async ({ request }) => {
    await delay(50);

    const url = new URL(request.url);
    const group = url.searchParams.get('group');

    // Filter by group if provided
    const filtered = group
      ? mockParameters.filter((p) => p.group === group)
      : mockParameters;

    return HttpResponse.json(filtered);
  }),
];

// ============================================
// Error Simulation Handlers
// Use these to override default handlers in tests
// ============================================
export const errorHandlers = {
  // Network error
  networkError: http.get(`${API_URL}/requests`, () => {
    return HttpResponse.error();
  }),

  // 500 Internal Server Error
  serverError: http.get(`${API_URL}/requests`, () => {
    return HttpResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  // No session (cookie missing, expired or revoked): /auth/me answers 401
  noSession: http.get(`${API_URL}/auth/me`, () => {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),

  // 401 Unauthorized
  unauthorized: http.get(`${API_URL}/requests`, () => {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
};

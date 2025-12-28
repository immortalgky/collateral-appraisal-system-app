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
  // ------------------------------------------
  // Auth Endpoints
  // ------------------------------------------

  // POST /auth/login - Login user
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    await delay(100); // Simulate network delay

    const body = (await request.json()) as { email: string; password: string };

    // Simulate validation
    if (!body.email || !body.password) {
      return HttpResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Simulate wrong credentials
    if (body.password === 'wrong') {
      return HttpResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    return HttpResponse.json({
      user: mockUser,
      token: 'mock-jwt-token',
    });
  }),

  // POST /auth/logout - Logout user
  http.post(`${API_URL}/auth/logout`, async () => {
    await delay(50);
    return HttpResponse.json({ success: true });
  }),

  // GET /auth/me - Get current user
  http.get(`${API_URL}/auth/me`, async ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    // Check if token is provided
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

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
      { id: Math.floor(Math.random() * 1000), ...body },
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

  // 401 Unauthorized
  unauthorized: http.get(`${API_URL}/requests`, () => {
    return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }),
};

# API Integration Guide

This document explains how to replace mock API calls with real backend API integration for the document management system.

## Current Mock Implementation

The application currently uses mock API responses for development. Mock implementations are located in:

- `/src/features/request/api.ts` - Document upload/download hooks

## Steps to Integrate Real API

### 1. Update Environment Variables

Add your API endpoint to `.env`:

```env
VITE_API_BASE_URL=https://your-api-endpoint.com/api
```

The axios instance at `/src/shared/api/axiosInstance.ts` will automatically use this base URL.

### 2. Update Upload Document API

**File**: `/src/features/request/api.ts`

**Current Mock Implementation**:
```typescript
export const useUploadDocument = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<UploadDocumentResponse[]> => {
      // Mock response for development
      await new Promise(resolve => setTimeout(resolve, 1000));

      return Array.from(files).map((file, index) => ({
        documentId: `doc-${Date.now()}-${index}`,
        fileName: file.name,
        filePath: `/uploads/${file.name}`,
        uploadDate: new Date().toISOString(),
      }));
    },
  });
};
```

**Real API Implementation**:
```typescript
export const useUploadDocument = () => {
  return useMutation({
    mutationFn: async (files: FileList): Promise<UploadDocumentResponse[]> => {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await apiClient.post<UploadDocumentResponse[]>(
        '/documents/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      return response.data;
    },
  });
};
```

### 3. Update Download Document API

**Current Mock Implementation**:
```typescript
export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (documentId: string): Promise<Blob> => {
      // Mock: Return empty blob
      await new Promise(resolve => setTimeout(resolve, 500));
      return new Blob(['Mock document content'], { type: 'application/pdf' });
    },
  });
};
```

**Real API Implementation**:
```typescript
export const useDownloadDocument = () => {
  return useMutation({
    mutationFn: async (documentId: string): Promise<Blob> => {
      const response = await apiClient.get(`/documents/${documentId}/download`, {
        responseType: 'blob',
      });

      return response.data;
    },
  });
};
```

### 4. Expected API Endpoints

Your backend should implement the following endpoints:

#### Upload Documents
```
POST /api/documents/upload
Content-Type: multipart/form-data

Request Body:
- files: File[] (multiple files)

Response: 200 OK
[
  {
    "documentId": "string",
    "fileName": "string",
    "filePath": "string",
    "uploadDate": "ISO 8601 date string"
  }
]
```

#### Download Document
```
GET /api/documents/{documentId}/download

Response: 200 OK
Content-Type: application/pdf | image/png | image/jpeg
Body: Binary file data
```

### 5. Error Handling

The application already includes error handling with toast notifications. Ensure your API returns appropriate HTTP status codes:

- `200 OK` - Success
- `400 Bad Request` - Invalid file type, size, etc.
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Permission denied
- `404 Not Found` - Document not found
- `413 Payload Too Large` - File size exceeds limit
- `500 Internal Server Error` - Server error

Error messages from the API will be displayed to users via toast notifications.

### 6. Authentication

If your API requires authentication, update the axios instance in `/src/shared/api/axiosInstance.ts`:

```typescript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 7. File Validation

Current client-side validation (in `CreateRequestFileInput.tsx`):
- Max file size: 10MB
- Allowed types: PDF, PNG, JPG, JPEG

Ensure your backend implements the same or stricter validation.

### 8. Testing API Integration

1. Start your backend server
2. Update `.env` with your API endpoint
3. Test file upload in the application
4. Verify files are stored in your backend
5. Test file download/view functionality
6. Test error scenarios (large files, invalid types, etc.)

### 9. Production Considerations

- Enable CORS on your backend for the frontend domain
- Implement rate limiting to prevent abuse
- Add virus scanning for uploaded files
- Implement file size limits on the backend
- Store files securely (S3, cloud storage, etc.)
- Generate secure, time-limited download URLs
- Add audit logging for file operations
- Implement file retention policies

## Type Definitions

The application expects these TypeScript interfaces:

```typescript
export interface UploadDocumentResponse {
  documentId: string;
  fileName: string;
  filePath: string;
  uploadDate: string;
}
```

Ensure your API responses match these interfaces or update the types accordingly.

## Troubleshooting

### CORS Issues
If you encounter CORS errors, ensure your backend includes these headers:
```
Access-Control-Allow-Origin: https://your-frontend-domain.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

### Large File Uploads
If uploads fail for large files:
1. Check nginx/server upload limits
2. Increase axios timeout:
```typescript
const response = await apiClient.post('/documents/upload', formData, {
  timeout: 60000, // 60 seconds
});
```

### Authentication Issues
If downloads fail with 401:
1. Verify authentication token is included in requests
2. Check token expiration
3. Ensure interceptors are properly configured

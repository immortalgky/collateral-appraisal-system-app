// ─── OAuth Clients ────────────────────────────────────────────────────────────

export type ClientType = 'public' | 'confidential';

export const GRANT_TYPES = [
  'authorization_code',
  'client_credentials',
  'password',
  'refresh_token',
] as const;
export type GrantType = (typeof GRANT_TYPES)[number];

export interface OAuthClientListItem {
  id: string;
  clientId: string;
  displayName: string;
  clientType: ClientType;
  grantTypes: string[];
  scopes: string[];
  hasSecret: boolean;
  /** Seeded core clients (spa/los/cls) cannot be deleted. */
  isSystem: boolean;
}

export interface OAuthClientDetail extends OAuthClientListItem {
  redirectUris: string[];
  postLogoutRedirectUris: string[];
}

export interface OAuthClientListResult {
  items: OAuthClientListItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateClientRequest {
  clientId?: string;
  displayName: string;
  clientType: ClientType;
  redirectUris: string[];
  postLogoutRedirectUris: string[];
  grantTypes: string[];
  scopes: string[];
}

export type UpdateClientRequest = Omit<CreateClientRequest, 'clientId' | 'clientType'>;

/** Returned once on create — the only time the secret is ever visible. */
export interface CreateClientResponse {
  id: string;
  clientId: string;
  clientSecret: string | null;
}

export interface RotateSecretResponse {
  clientId: string;
  clientSecret: string;
}

// ─── OAuth Scopes ─────────────────────────────────────────────────────────────

export interface OAuthScope {
  id: string;
  name: string;
  displayName: string | null;
  description: string | null;
  resources: string[];
}

export interface OAuthScopeListResult {
  items: OAuthScope[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface CreateScopeRequest {
  name: string;
  displayName?: string;
  description?: string;
  resources: string[];
}

export type UpdateScopeRequest = Omit<CreateScopeRequest, 'name'>;

// ─── OAuth Authorizations & Tokens ─────────────────────────────────────────────

export interface OAuthAuthorization {
  id: string;
  subject: string | null;
  status: string | null;
  type: string | null;
  applicationId: string | null;
  clientId: string | null;
  scopes: string[];
  creationDate: string | null;
}

export interface OAuthToken {
  id: string;
  subject: string | null;
  status: string | null;
  type: string | null;
  applicationId: string | null;
  clientId: string | null;
  creationDate: string | null;
  expirationDate: string | null;
}

export interface PaginatedResult<T> {
  items: T[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface TokenViewerParams {
  clientId?: string;
  subject?: string;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface Permission {
  id: string;
  permissionCode: string;
  displayName: string;
  description: string;
  module: string;
}

export interface PermissionListResult {
  items: Permission[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetPermissionsParams {
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreatePermissionRequest {
  permissionCode: string;
  displayName: string;
  description: string;
  module: string;
}

export interface UpdatePermissionRequest {
  displayName: string;
  description: string;
  module: string;
}

// ─── Role ────────────────────────────────────────────────────────────────────

export type RoleScope = 'Bank' | 'Company';

export interface RolePermission {
  id: string;
  permissionCode: string;
  description: string;
}

export interface RoleUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  scope: RoleScope;
  permissions: RolePermission[];
}

export interface RoleListItem {
  id: string;
  name: string;
  description: string;
  scope: RoleScope;
  permissionCount: number;
  userCount: number;
}

export interface RoleListResult {
  items: RoleListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetRolesParams {
  search?: string;
  scope?: RoleScope | '';
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateRoleRequest {
  name: string;
  description: string;
  scope: RoleScope;
  permissionIds: string[];
}

export interface UpdateRoleRequest {
  name: string;
  description: string;
  scope: RoleScope;
}

export interface UpdateRolePermissionsRequest {
  permissionIds: string[];
}

export interface UpdateRoleUsersRequest {
  userIds: string[];
}

// ─── Group ───────────────────────────────────────────────────────────────────

export type GroupScope = 'Bank' | 'Company';

export interface GroupUser {
  userId: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface MonitoredGroup {
  groupId: string;
  groupName: string;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  scope: GroupScope;
  companyId: string | null;
  users: GroupUser[];
  monitoredGroups: MonitoredGroup[];
}

export interface GroupListItem {
  id: string;
  name: string;
  description: string;
  scope: GroupScope;
  companyId: string | null;
  userCount: number;
}

export interface GroupListResult {
  items: GroupListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetGroupsParams {
  search?: string;
  scope?: GroupScope | '';
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  scope: GroupScope;
  companyId?: string | null;
}

export interface UpdateGroupRequest {
  name: string;
  description: string;
  scope: GroupScope;
}

export interface UpdateGroupUsersRequest {
  userIds: string[];
}

export interface UpdateGroupMonitoringRequest {
  monitoredGroupIds: string[];
}

export type TeamScope = 'Bank' | 'Company';

// ─── User / Profile ──────────────────────────────────────────────────────────

export interface UserRole {
  id: string;
  name: string;
  scope: string;
}

export interface UserGroup {
  id: string;
  name: string;
  scope: string;
}

export interface UserTeam {
  id: string;
  name: string;
  scope: TeamScope;
}

/** A group as returned by /auth/me (note: keyed groupId/groupName, not id/name). */
export interface MeGroup {
  groupId: string;
  groupName: string;
  scope: string;
}

/** A team as returned by /auth/me. */
export interface MeTeam {
  teamId: string;
  teamName: string;
  scope: TeamScope;
}

/**
 * The signed-in user's own profile, as returned by GET /auth/me.
 * Mirrors MeResponse on the backend — keep the two in step.
 */
export interface UserProfile {
  id: string;
  username: string;
  // The API omits null fields from the payload, so every nullable scalar here is
  // optional at runtime as well as nullable.
  email?: string | null;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  position?: string | null;
  department?: string | null;
  aoCode?: string | null;
  employeeId?: string | null;
  companyId?: string | null;
  companyName?: string | null;
  companyNameLocal?: string | null;
  authSource: 'Local' | 'LDAP';
  isActive: boolean;
  lastLoginAt?: string | null;
  passwordChangedAt?: string | null;
  /** /auth/me returns role *names* only, unlike the admin endpoints' UserRole objects. */
  roles: string[];
  permissions: string[];
  groups: MeGroup[];
  teams: MeTeam[];
  mustChangePassword: boolean;
}

export interface PasswordPolicy {
  requiredLength: number;
  requireDigit: boolean;
  requireLowercase: boolean;
  requireUppercase: boolean;
  requireNonAlphanumeric: boolean;
  requiredUniqueChars: number;
}

/** Full, admin-editable password policy (returned by /auth/admin/password-policy). */
export interface PasswordPolicyConfig extends PasswordPolicy {
  expiryDays: number;
  historyCount: number;
  blocklist: string;
  lockoutEnabled: boolean;
  maxFailedAccessAttempts: number;
  lockoutMinutes: number;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  position?: string | null;
  department?: string | null;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AdminUserListItem {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  companyId: string | null;
  roles: UserRole[];
  isActive: boolean;
  isLocked: boolean;
}

export interface AdminUserDetail extends AdminUserListItem {
  avatarUrl: string | null;
  authSource: 'Local' | 'LDAP';
  aoCode: string | null;
  employeeId: string | null;
  companyName: string | null;
  companyNameLocal?: string | null;
  groups: UserGroup[];
  teams: UserTeam[];
  lastLoginAt: string | null;
}

export interface AdminUserListResult {
  items: AdminUserListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetUsersParams {
  search?: string;
  scope?: 'Bank' | 'Company';
  role?: string;
  groupId?: string;
  teamId?: string;
  companyId?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface AdminUpdateUserRequest {
  firstName: string;
  lastName: string;
  email: string;
  position?: string | null;
  department?: string | null;
  companyId?: string | null;
  authSource?: 'Local' | 'LDAP';
  // Bank-internal officer code; only sent for bank users (no companyId).
  aoCode?: string | null;
  // Bank staff employee id; only sent for bank users (no companyId).
  employeeId?: string | null;
}

export interface UpdateUserRolesRequest {
  roleNames: string[];
}

export interface UpdateUserGroupsRequest {
  groupIds: string[];
}

export interface UpdateUserTeamsRequest {
  teamIds: string[];
}

export interface SetUserActivationRequest {
  isActive: boolean;
}

export interface CreateUserRequest {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  position?: string | null;
  department?: string | null;
  companyId?: string | null;
  roles: string[];
  groupIds?: string[];
  teamIds?: string[];
  authSource?: 'Local' | 'LDAP';
  // Bank-internal officer code; only sent for bank users (no companyId).
  aoCode?: string | null;
  // Bank staff employee id; only sent for bank users (no companyId).
  employeeId?: string | null;
}

export interface CreateUserResponse {
  id: string;
}

/** Directory attributes returned when looking up a username in LDAP/AD (no password validation) */
export interface LdapLookupResponse {
  found: boolean;
  username: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  department?: string | null;
  position?: string | null;
}

// ─── Team ────────────────────────────────────────────────────────────────────

export interface TeamMember {
  userId: string;
  userName: string;
  firstName: string;
  lastName: string;
}

export interface TeamDetail {
  id: string;
  name: string;
  scope: TeamScope;
  description: string | null;
  members: TeamMember[];
}

export interface TeamListItem {
  id: string;
  name: string;
  scope: TeamScope;
  description: string | null;
  memberCount: number;
}

export interface TeamListResult {
  items: TeamListItem[];
  count: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetTeamsParams {
  search?: string;
  scope?: TeamScope;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateTeamRequest {
  name: string;
  scope?: TeamScope;
  description?: string | null;
}

export interface UpdateTeamRequest {
  name: string;
  scope: TeamScope;
  description?: string | null;
}

export interface UpdateTeamMembersRequest {
  userIds: string[];
}

// ─── Audit Log ───────────────────────────────────────────────────────────────

export type AuditAction = 'Created' | 'Updated' | 'Deleted' | 'AssignmentChanged';
export type AuditEntityType = 'User' | 'Role' | 'Permission' | 'Group' | 'Team';

export interface AuditLogRow {
  id: string;
  occurredAt: string;
  actorUserId: string;
  actorName: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  entityName: string;
  changesJson: string | null;
}

export interface AuditLogResult {
  items: AuditLogRow[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetAuditLogsParams {
  entityType?: AuditEntityType | '';
  entityId?: string;
  actorUserId?: string;
  actorName?: string;
  from?: string;
  to?: string;
  action?: AuditAction | '';
  pageNumber?: number;
  pageSize?: number;
}

// ─── Company ─────────────────────────────────────────────────────────────────

export interface Company {
  id: string;
  name: string;
  nameLocal: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  effectiveDate: string | null;
  expireDate: string | null;
  contactPerson: string | null;
  hostCompanyCode: string | null;
  loanTypes: string[];
  isActive: boolean;
  bankAccountNo: string | null;
  bankAccountName: string | null;
}

export interface CompanyListItem {
  id: string;
  name: string;
  nameLocal?: string | null;
  taxId: string | null;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  userCount: number;
}

export interface CompanyListResult {
  companies: CompanyListItem[];
}

export interface GetCompaniesParams {
  search?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface CreateCompanyRequest {
  name: string;
  nameLocal?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  effectiveDate?: string | null;
  expireDate?: string | null;
  contactPerson?: string | null;
  hostCompanyCode?: string | null;
  loanTypes?: string[];
  isActive?: boolean;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
}

export interface UpdateCompanyRequest {
  name: string;
  nameLocal?: string | null;
  taxId?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  effectiveDate?: string | null;
  expireDate?: string | null;
  contactPerson?: string | null;
  hostCompanyCode?: string | null;
  loanTypes?: string[];
  isActive?: boolean;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
}

export interface EligibleCompany {
  id: string;
  name: string;
  nameLocal?: string | null;
}

// ─── Access Report ───────────────────────────────────────────────────────────

export interface UserAccessMatrixRow {
  userId: string;
  userName: string;
  fullName: string;
  email: string;
  companyName: string | null;
  scope: string;
  isActive: boolean;
  roles: string;
  groups: string;
  teams: string;
}

export interface UserAccessMatrixResult {
  items: UserAccessMatrixRow[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface GetUserAccessMatrixParams {
  scope?: string;
  companyId?: string;
  roleName?: string;
  groupId?: string;
  teamId?: string;
  isActive?: boolean;
  search?: string;
  pageNumber?: number;
  pageSize?: number;
}

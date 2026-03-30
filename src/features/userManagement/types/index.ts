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
  permissionId: string;
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
}

export interface UpdateGroupUsersRequest {
  userIds: string[];
}

export interface UpdateGroupMonitoringRequest {
  monitoredGroupIds: string[];
}

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

export interface UserProfile {
  id: string;
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  position: string | null;
  department: string | null;
  authSource: 'Local' | 'External';
  companyId: string | null;
  roles: UserRole[];
  groups: UserGroup[];
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
  userName: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string | null;
  department: string | null;
  companyId: string | null;
  roles: UserRole[];
}

export interface AdminUserDetail extends AdminUserListItem {
  avatarUrl: string | null;
  authSource: 'Local' | 'External';
  groups: UserGroup[];
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
  pageNumber?: number;
  pageSize?: number;
}

export interface AdminUpdateUserRequest {
  firstName: string;
  lastName: string;
  position?: string | null;
  department?: string | null;
  companyId?: string | null;
}

export interface UpdateUserRolesRequest {
  roleNames: string[];
}

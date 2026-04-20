import axios from '@shared/api/axiosInstance';
import type {
  MyMenuResponse,
  MenuItemAdminDto,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  ReorderMenuItemsRequest,
  MenuScope,
  ActivitySummary,
  ActivityOverridesResponse,
  UpdateActivityOverridesRequest,
} from '../types';

/**
 * GET /auth/me/menu — fetched once after authentication.
 *
 * Pass `activityId` to apply activity-scoped overrides to the appraisal tree
 * (backend replaces role-derived visibility/canEdit for items configured under
 * that activity in auth.ActivityMenuOverrides).
 */
export async function fetchMyMenu(activityId?: string): Promise<MyMenuResponse> {
  const params = activityId ? { activityId } : undefined;
  const { data } = await axios.get<MyMenuResponse>('/auth/me/menu', { params });
  return data;
}

/** GET /admin/menus?scope=Main|Appraisal */
export async function listMenus(scope: MenuScope): Promise<MenuItemAdminDto[]> {
  const { data } = await axios.get<MenuItemAdminDto[]>('/admin/menus', {
    params: { scope },
  });
  return data;
}

/** GET /admin/menus/{id} */
export async function getMenu(id: string): Promise<MenuItemAdminDto> {
  const { data } = await axios.get<MenuItemAdminDto>(`/admin/menus/${id}`);
  return data;
}

/** POST /admin/menus */
export async function createMenu(body: CreateMenuItemRequest): Promise<MenuItemAdminDto> {
  const { data } = await axios.post<MenuItemAdminDto>('/admin/menus', body);
  return data;
}

/** PUT /admin/menus/{id} */
export async function updateMenu(
  id: string,
  body: UpdateMenuItemRequest,
): Promise<MenuItemAdminDto> {
  const { data } = await axios.put<MenuItemAdminDto>(`/admin/menus/${id}`, body);
  return data;
}

/** DELETE /admin/menus/{id} */
export async function deleteMenu(id: string): Promise<void> {
  await axios.delete(`/admin/menus/${id}`);
}

/** PUT /admin/menus/reorder */
export async function reorderMenus(body: ReorderMenuItemsRequest): Promise<void> {
  await axios.put('/admin/menus/reorder', body);
}

/** GET /admin/activities — list of activity IDs derived from task menu items. */
export async function listActivities(): Promise<ActivitySummary[]> {
  const { data } = await axios.get<ActivitySummary[]>('/admin/activities');
  return data;
}

/** GET /admin/activity-menu-overrides/{activityId} */
export async function getActivityOverrides(activityId: string): Promise<ActivityOverridesResponse> {
  const { data } = await axios.get<ActivityOverridesResponse>(
    `/admin/activity-menu-overrides/${encodeURIComponent(activityId)}`,
  );
  return data;
}

/** PUT /admin/activity-menu-overrides/{activityId} — bulk replace. */
export async function updateActivityOverrides(
  activityId: string,
  body: UpdateActivityOverridesRequest,
): Promise<void> {
  await axios.put(`/admin/activity-menu-overrides/${encodeURIComponent(activityId)}`, body);
}

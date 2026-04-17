import axios from '@shared/api/axiosInstance';
import type {
  MyMenuResponse,
  MenuItemAdminDto,
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  ReorderMenuItemsRequest,
  MenuScope,
} from '../types';

/** GET /auth/me/menu — fetched once after authentication */
export async function fetchMyMenu(): Promise<MyMenuResponse> {
  const { data } = await axios.get<MyMenuResponse>('/auth/me/menu');
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

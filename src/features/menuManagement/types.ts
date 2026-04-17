export type IconStyle = 'solid' | 'regular' | 'light' | 'duotone' | 'thin' | 'brands';
export type MenuScope = 'Main' | 'Appraisal';

/**
 * A node in the menu tree as returned by GET /auth/me/menu.
 * Children are recursively nested.
 */
export interface MenuTreeNode {
  id: string;
  itemKey: string;
  path: string | null;
  iconName: string;
  iconStyle: IconStyle;
  iconColor: string | null;
  sortOrder: number;
  /** Multi-language labels: { "en": "...", "th": "...", "zh": "..." } */
  labels: Record<string, string>;
  /** Whether the current user has edit permission for this item */
  canEdit: boolean;
  children: MenuTreeNode[];
}

export interface MyMenuResponse {
  main: MenuTreeNode[];
  appraisal: MenuTreeNode[];
}

/**
 * Full admin DTO returned by GET /admin/menus and GET /admin/menus/{id}.
 * Extends MenuTreeNode (id, itemKey, path, icon, labels, canEdit, children) with the
 * admin-only fields the form needs. children is recursive and is populated for the
 * list endpoint (returns roots) and empty for the detail endpoint.
 */
export interface MenuItemAdminDto extends Omit<MenuTreeNode, 'children'> {
  scope: MenuScope;
  parentId: string | null;
  viewPermissionCode: string;
  editPermissionCode: string | null;
  isSystem: boolean;
  translations: MenuItemTranslationDto[];
  children: MenuItemAdminDto[];
}

export interface MenuItemTranslationDto {
  languageCode: string;
  label: string;
}

/** Request body for POST /admin/menus */
export interface CreateMenuItemRequest {
  itemKey: string;
  scope: MenuScope;
  parentId: string | null;
  path: string | null;
  iconName: string;
  iconStyle: IconStyle;
  iconColor: string | null;
  sortOrder: number;
  viewPermissionCode: string;
  editPermissionCode: string | null;
  translations: MenuItemTranslationDto[];
}

/** Request body for PUT /admin/menus/{id}. ItemKey and Scope are immutable on update. */
export type UpdateMenuItemRequest = Omit<CreateMenuItemRequest, 'itemKey' | 'scope'>;

/** Request body for PUT /admin/menus/reorder */
export interface ReorderMenuItemsRequest {
  items: ReorderItem[];
}

export interface ReorderItem {
  id: string;
  parentId: string | null;
  sortOrder: number;
}

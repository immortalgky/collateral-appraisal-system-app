import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { createMenu, updateMenu, deleteMenu, reorderMenus, getMenu } from '../api/menus';
import type {
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  ReorderMenuItemsRequest,
} from '../types';
import { MENU_KEYS } from './useMenuList';

export function useGetMenuById(id: string | null) {
  return useQuery({
    queryKey: MENU_KEYS.detail(id ?? ''),
    queryFn: () => getMenu(id!),
    enabled: !!id,
  });
}

export function useCreateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateMenuItemRequest) => createMenu(body),
    onSuccess: data => {
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.all });
      toast.success(`Menu item "${data.itemKey}" created`);
    },
    onError: () => {
      toast.error('Failed to create menu item');
    },
  });
}

export function useUpdateMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateMenuItemRequest }) => updateMenu(id, body),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.all });
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.detail(id) });
      toast.success(`Menu item updated`);
    },
    onError: () => {
      toast.error('Failed to update menu item');
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenu(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.all });
      toast.success('Menu item deleted');
    },
    onError: () => {
      toast.error('Failed to delete menu item');
    },
  });
}

export function useReorderMenuItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: ReorderMenuItemsRequest) => reorderMenus(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.all });
    },
    onError: () => {
      toast.error('Failed to reorder menu items');
    },
  });
}

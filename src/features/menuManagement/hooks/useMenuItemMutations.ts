import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import i18n from '@/i18n';
import { createMenu, updateMenu, deleteMenu, reorderMenus, getMenu } from '../api/menus';
import type {
  CreateMenuItemRequest,
  UpdateMenuItemRequest,
  ReorderMenuItemsRequest,
} from '../types';
import { MENU_KEYS } from './useMenuList';

// Non-component caller: namespace-bound t resolved from the i18n instance.
const t = i18n.getFixedT(null, 'menuManagement');

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
      toast.success(t('toasts.created', { key: data.itemKey }));
    },
    onError: () => {
      toast.error(t('toasts.createFailed'));
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
      toast.success(t('toasts.updated'));
    },
    onError: () => {
      toast.error(t('toasts.updateFailed'));
    },
  });
}

export function useDeleteMenuItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteMenu(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MENU_KEYS.all });
      toast.success(t('toasts.deleted'));
    },
    onError: () => {
      toast.error(t('toasts.deleteFailed'));
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
      toast.error(t('toasts.reorderFailed'));
    },
  });
}

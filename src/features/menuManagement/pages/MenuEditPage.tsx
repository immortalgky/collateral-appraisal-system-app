import { useNavigate, useParams, Link } from 'react-router-dom';
import Icon from '@shared/components/Icon';
import { MenuItemForm, type MenuItemFormValues } from '../components/MenuItemForm';
import {
  useGetMenuById,
  useCreateMenuItem,
  useUpdateMenuItem,
} from '../hooks/useMenuItemMutations';
import { useMenuList } from '../hooks/useMenuList';
import type { CreateMenuItemRequest, MenuItemAdminDto, UpdateMenuItemRequest } from '../types';

/**
 * Create / edit form page for a single menu item.
 * URLs:
 *   /admin/menus/new     — create
 *   /admin/menus/:menuId — edit
 */
export default function MenuEditPage() {
  const { menuId } = useParams<{ menuId: string }>();
  const navigate = useNavigate();
  const isNew = !menuId;

  const { data: existing, isLoading: isLoadingItem } = useGetMenuById(menuId ?? null);
  const { data: mainItems } = useMenuList('Main');
  const { data: appraisalItems } = useMenuList('Appraisal');

  const createMutation = useCreateMenuItem();
  const updateMutation = useUpdateMenuItem();

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Build parent options from both scopes
  const buildOptions = (items: MenuItemAdminDto[] | undefined) =>
    (items ?? []).flatMap(item => [
      { id: item.id, label: item.labels?.en ?? item.itemKey },
      ...(item.children ?? []).map(c => ({
        id: c.id,
        label: `  ${c.labels?.en ?? c.itemKey}`,
      })),
    ]);

  const parentOptions = [...buildOptions(mainItems), ...buildOptions(appraisalItems)];

  const handleSubmit = (values: MenuItemFormValues) => {
    if (isNew) {
      const body: CreateMenuItemRequest = {
        itemKey: values.itemKey,
        scope: values.scope,
        parentId: values.parentId,
        path: values.path || null,
        iconName: values.iconName,
        iconStyle: values.iconStyle,
        iconColor: values.iconColor,
        sortOrder: values.sortOrder,
        viewPermissionCode: values.viewPermissionCode,
        editPermissionCode: values.editPermissionCode,
        translations: values.translations.filter(t => t.label.trim() !== ''),
      };
      createMutation.mutate(body, {
        onSuccess: () => navigate('/admin/menus'),
      });
    } else {
      const body: UpdateMenuItemRequest = {
        parentId: values.parentId,
        path: values.path || null,
        iconName: values.iconName,
        iconStyle: values.iconStyle,
        iconColor: values.iconColor,
        sortOrder: values.sortOrder,
        viewPermissionCode: values.viewPermissionCode,
        editPermissionCode: values.editPermissionCode,
        translations: values.translations.filter(t => t.label.trim() !== ''),
      };
      updateMutation.mutate(
        { id: menuId!, body },
        {
          onSuccess: () => navigate('/admin/menus'),
        },
      );
    }
  };

  if (!isNew && isLoadingItem) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/admin/menus"
          className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <Icon name="arrow-left" style="solid" className="size-4 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {isNew ? 'New Menu Item' : `Edit: ${existing?.labels?.en ?? existing?.itemKey}`}
          </h1>
          {!isNew && existing?.isSystem && (
            <p className="text-xs text-amber-600 mt-0.5">
              System item — ItemKey is locked and deletion is disabled.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <MenuItemForm
          initial={existing ?? null}
          parentOptions={parentOptions}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}

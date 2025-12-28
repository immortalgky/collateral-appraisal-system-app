import { create } from 'zustand';
import type { PropertyGroup, PropertyItem, PropertyStore } from './types';

const createDefaultGroup = (index: number): PropertyGroup => ({
  id: crypto.randomUUID(),
  name: `Group ${index}`,
  items: [],
});

export const usePropertyStore = create<PropertyStore>(set => ({
  groups: [createDefaultGroup(1)],
  clipboard: null,

  addGroup: () =>
    set(state => ({
      groups: [...state.groups, createDefaultGroup(state.groups.length + 1)],
    })),

  deleteGroup: (groupId: string) =>
    set(state => ({
      groups: state.groups.filter(group => group.id !== groupId),
    })),

  addPropertyToGroup: (groupId: string, property: Omit<PropertyItem, 'id'>) =>
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: [...group.items, { ...property, id: crypto.randomUUID() }],
            }
          : group,
      ),
    })),

  updateProperty: (
    groupId: string,
    propertyId: string,
    updates: Partial<PropertyItem>,
  ) =>
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.map(item =>
                item.id === propertyId ? { ...item, ...updates } : item,
              ),
            }
          : group,
      ),
    })),

  deleteProperty: (groupId: string, propertyId: string) =>
    set(state => ({
      groups: state.groups.map(group =>
        group.id === groupId
          ? {
              ...group,
              items: group.items.filter(item => item.id !== propertyId),
            }
          : group,
      ),
    })),

  movePropertyToGroup: (
    fromGroupId: string,
    toGroupId: string,
    propertyId: string,
  ) =>
    set(state => {
      const fromGroup = state.groups.find(g => g.id === fromGroupId);
      const property = fromGroup?.items.find(item => item.id === propertyId);

      if (!property) return state;

      return {
        groups: state.groups.map(group => {
          if (group.id === fromGroupId) {
            return {
              ...group,
              items: group.items.filter(item => item.id !== propertyId),
            };
          }
          if (group.id === toGroupId) {
            return {
              ...group,
              items: [...group.items, property],
            };
          }
          return group;
        }),
      };
    }),

  reorderPropertiesInGroup: (
    groupId: string,
    oldIndex: number,
    newIndex: number,
  ) =>
    set(state => ({
      groups: state.groups.map(group => {
        if (group.id !== groupId) return group;

        const items = [...group.items];
        const [removed] = items.splice(oldIndex, 1);
        items.splice(newIndex, 0, removed);

        return {
          ...group,
          items,
        };
      }),
    })),

  copyProperty: (property: PropertyItem) =>
    set(() => ({
      clipboard: property,
    })),

  pasteProperty: (groupId: string) =>
    set(state => {
      if (!state.clipboard) return state;

      return {
        groups: state.groups.map(group =>
          group.id === groupId
            ? {
                ...group,
                items: [
                  ...group.items,
                  { ...state.clipboard!, id: crypto.randomUUID() },
                ],
              }
            : group,
        ),
      };
    }),
}));

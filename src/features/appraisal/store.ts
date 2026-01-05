import { create } from 'zustand';
import type { PropertyGroup, PropertyItem, PropertyStore } from './types';

// Mock properties for development
const MOCK_PROPERTIES: Omit<PropertyItem, 'id'>[] = [
  {
    type: 'Land and building',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
    address: '123/45 Sukhumvit Road, Soi 55',
    area: '150 sq.wa.',
    priceRange: '฿15,000,000 - ฿18,000,000',
    location: 'Watthana, Bangkok',
  },
  {
    type: 'Condominium',
    image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=400&h=300&fit=crop',
    address: 'The Line Asoke-Ratchada Unit 2501',
    area: '45 sq.m.',
    priceRange: '฿6,500,000 - ฿7,200,000',
    location: 'Din Daeng, Bangkok',
  },
];

const createDefaultGroup = (): PropertyGroup => ({
  id: crypto.randomUUID(),
  name: 'Group 1',
  items: MOCK_PROPERTIES.map(prop => ({ ...prop, id: crypto.randomUUID() })),
});

const createEmptyGroup = (index: number): PropertyGroup => ({
  id: crypto.randomUUID(),
  name: `Group ${index}`,
  items: [],
});

export const usePropertyStore = create<PropertyStore>(set => ({
  groups: [createDefaultGroup()],
  clipboard: null,

  addGroup: () =>
    set(state => ({
      groups: [...state.groups, createEmptyGroup(state.groups.length + 1)],
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

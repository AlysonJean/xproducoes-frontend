import { createContext, useContext, useState } from 'react';
import type { Equipment } from '../types/types';

interface CompareContextType {
  items: Equipment[];
  addItem: (equipment: Equipment) => void; // Ensure Equipment is a local type
  removeItem: (equipmentId: string) => void;
  clearCompare: () => void;
  isInCompare: (equipmentId: string) => boolean;
  canAddMore: boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare deve ser usado dentro de um CompareProvider');
  }
  return context;
};

const MAX_COMPARE_ITEMS = 4;

export const CompareProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<Equipment[]>([]);

  const addItem = (equipment: Equipment) => {
    setItems((prev) => {
      if (prev.length >= MAX_COMPARE_ITEMS) {
        return prev;
      }
      if (!equipment?.id) return prev;
      const idStr = String(equipment.id);
      if (prev.some((item) => String(item.id) === idStr)) {
        return prev;
      }
      return [...prev, { ...equipment, id: idStr } as Equipment];
    });
  };

  const removeItem = (equipmentId: string | number) => {
    const idStr = String(equipmentId);
    setItems((prev) => prev.filter((item) => String(item.id) !== idStr));
  };

  const clearCompare = () => {
    setItems([]);
  };

  const isInCompare = (equipmentId: string | number) => {
    const idStr = String(equipmentId);
    return items.some((item) => String(item.id) === idStr);
  };

  const canAddMore = items.length < MAX_COMPARE_ITEMS;

  return (
    <CompareContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        clearCompare,
        isInCompare,
        canAddMore,
      }}
    >
      {children}
    </CompareContext.Provider>
  );
};

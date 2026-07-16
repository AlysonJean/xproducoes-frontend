// Provider + hook(s) co-localizados de propósito (padrão oficial de Context do React) —
// só afeta a granularidade do Fast Refresh em dev, sem efeito em produção/correção.
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import type { Equipment } from '../types/types';
import { logger } from '../utils/logger';

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
// Achado (auditoria de produto): a lista de comparação vivia só em memória — um refresh
// perdia tudo. Persistida em localStorage, mesmo padrão do carrinho de convidado.
const COMPARE_STORAGE_KEY = 'xproducoes-compare';

function readStoredCompare(): Equipment[] {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Equipment[]) : [];
  } catch {
    return [];
  }
}

export const CompareProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<Equipment[]>(() => readStoredCompare());

  useEffect(() => {
    try {
      localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      logger.warn('Não foi possível salvar a comparação no localStorage', 'CompareContext', e);
    }
  }, [items]);

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

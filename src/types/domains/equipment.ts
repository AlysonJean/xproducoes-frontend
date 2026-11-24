// Onda 4 da auditoria de 19/11 (F2-15): Equipment, Category, Service, Kit, KitItem e PortfolioItem tinham uma segunda declaração aqui,
// diferente da de types/types.ts (a que 107 arquivos usam). Agora este arquivo só reexporta a de types.ts.
export type { Equipment, Category, Service, Kit, KitItem, PortfolioItem } from '../types';

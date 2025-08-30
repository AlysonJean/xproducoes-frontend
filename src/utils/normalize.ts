// Utilitário simples para normalizar respostas como array
export function asArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && Array.isArray((data as any).data)) return (data as any).data as T[];
  return [] as T[];
}


// Utilitário simples para normalizar respostas como array
export function asArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && 'data' in data && Array.isArray((data as {data: unknown[]}).data)) {
    return (data as {data: T[]}).data;
  }
  return [] as T[];
}

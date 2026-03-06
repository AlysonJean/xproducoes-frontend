// Utilitário simples para normalizar respostas como array
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function asArray<T>(data: any): T[] {
  if (Array.isArray(data)) return data as T[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (data && Array.isArray((data as any).data)) return (data as any).data as T[];
  return [] as T[];
}

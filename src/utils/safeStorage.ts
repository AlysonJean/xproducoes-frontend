// Onda 2 da auditoria de 19/11 (F1-05): com cookies e dados de sites bloqueados (Chrome, Firefox), só acessar
// window.localStorage já lança SecurityError. O tema lia durante o render, os cookies e os favoritos liam sem proteção:
// o erro subia ao ErrorBoundary e o site inteiro virava a tela de erro. Estas funções nunca lançam: sem armazenamento,
// a leitura volta null e a gravação não faz nada (a preferência só não persiste).
// Só ler window.localStorage já pode lançar: cada função abaixo chama dentro do próprio try.
const storage = (): Storage | null => (typeof window === 'undefined' ? null : window.localStorage);

export function safeGetItem(key: string): string | null {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    storage()?.setItem(key, value);
  } catch {
    // sem armazenamento (bloqueado ou cheio): não persiste
  }
}

export function safeRemoveItem(key: string): void {
  try {
    storage()?.removeItem(key);
  } catch {
    // sem armazenamento: nada a apagar
  }
}

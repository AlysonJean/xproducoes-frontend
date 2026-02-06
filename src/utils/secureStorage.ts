// Utilitário simples para armazenamento seguro (pode ser expandido)
export const secureStorage = {
  set(key: string, value: string) {
    localStorage.setItem(key, value);
  },
  get(key: string) {
    return localStorage.getItem(key);
  },
  remove(key: string) {
    localStorage.removeItem(key);
  },
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return null;
      return window.localStorage.getItem(key);
    } catch (e) {
      // avoid throwing in environments where localStorage is disabled
      // eslint-disable-next-line no-console
      console.warn(`safeLocalStorage.getItem failed for ${key}:`, e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.setItem(key, value);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`safeLocalStorage.setItem failed for ${key}:`, e);
    }
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) return;
      window.localStorage.removeItem(key);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`safeLocalStorage.removeItem failed for ${key}:`, e);
    }
  },
};
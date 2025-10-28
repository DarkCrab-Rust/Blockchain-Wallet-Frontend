import { safeLocalStorage } from './safeLocalStorage';

describe('utils/safeLocalStorage', () => {
  const originalLocalStorage = window.localStorage;
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    // reset localStorage to a fresh in-memory implementation for reliability
    const store: Record<string, string> = {};
    const fake = {
      getItem: jest.fn((k: string) => (k in store ? store[k] : null)),
      setItem: jest.fn((k: string, v: string) => { store[k] = String(v); }),
      removeItem: jest.fn((k: string) => { delete store[k]; }),
      clear: jest.fn(() => { Object.keys(store).forEach(k => delete store[k]); }),
      key: jest.fn((i: number) => Object.keys(store)[i] || null),
      get length() { return Object.keys(store).length; },
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: fake, configurable: true });
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    window.localStorage.clear();
  });

  afterEach(() => {
    warnSpy.mockRestore();
    Object.defineProperty(window, 'localStorage', { value: originalLocalStorage, configurable: true });
  });

  test('set/get/remove works with normal localStorage', () => {
    safeLocalStorage.setItem('k1', 'v1');
    expect(safeLocalStorage.getItem('k1')).toBe('v1');
    safeLocalStorage.removeItem('k1');
    expect(safeLocalStorage.getItem('k1')).toBeNull();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('returns null or no-op when localStorage is missing', () => {
    Object.defineProperty(window, 'localStorage', { value: undefined, configurable: true });
    expect(safeLocalStorage.getItem('k2')).toBeNull();
    // set/remove should be no-op without warnings
    safeLocalStorage.setItem('k2', 'v2');
    safeLocalStorage.removeItem('k2');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  test('getItem catches exceptions and warns, returning null', () => {
    const bad = {
      getItem: jest.fn(() => { throw new Error('boom-get'); }),
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: bad, configurable: true });
    const v = safeLocalStorage.getItem('k3');
    expect(v).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
  });

  test('setItem catches exceptions and warns', () => {
    const bad = {
      setItem: jest.fn(() => { throw new Error('boom-set'); }),
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: bad, configurable: true });
    safeLocalStorage.setItem('k4', 'v4');
    expect(warnSpy).toHaveBeenCalled();
  });

  test('removeItem catches exceptions and warns', () => {
    const bad = {
      removeItem: jest.fn(() => { throw new Error('boom-remove'); }),
    } as unknown as Storage;
    Object.defineProperty(window, 'localStorage', { value: bad, configurable: true });
    safeLocalStorage.removeItem('k5');
    expect(warnSpy).toHaveBeenCalled();
  });
});
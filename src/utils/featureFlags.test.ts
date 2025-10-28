import { getFeatureFlags, setFeatureFlag, FEATURE_EVENT, FEATURE_KEYS } from './featureFlags';

describe('utils/featureFlags', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('setFeatureFlag writes to localStorage and dispatches event', () => {
    const handler = jest.fn();
    window.addEventListener(FEATURE_EVENT, handler);
    setFeatureFlag('ledger', true);
    expect(localStorage.getItem(FEATURE_KEYS.ledger)).toBe('true');
    expect(handler).toHaveBeenCalled();
    window.removeEventListener(FEATURE_EVENT, handler);
  });

  test('getFeatureFlags reads overrides from localStorage', () => {
    localStorage.setItem(FEATURE_KEYS.ledger, 'true');
    localStorage.setItem(FEATURE_KEYS.trezor, 'false');
    const flags = getFeatureFlags();
    expect(flags.enableLedger).toBe(true);
    expect(flags.enableTrezor).toBe(false);
  });
});
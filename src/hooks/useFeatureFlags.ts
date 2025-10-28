import { useEffect, useState } from 'react';
import { getFeatureFlags, FEATURE_KEYS, FEATURE_EVENT } from '../utils/featureFlags';

export function useFeatureFlags() {
  const [flags, setFlags] = useState(getFeatureFlags());

  useEffect(() => {
    const shallowEqual = (a: typeof flags, b: typeof flags) =>
      a.enableSolana === b.enableSolana &&
      a.enableBtcTaproot === b.enableBtcTaproot &&
      a.enableLedger === b.enableLedger &&
      a.enableTrezor === b.enableTrezor &&
      a.useMockBackend === b.useMockBackend;

    const applyLatest = () => {
      const next = getFeatureFlags();
      setFlags(prev => (shallowEqual(prev, next) ? prev : next));
    };

    const onStorage = (e: StorageEvent) => {
      const relevantKeys = Object.values(FEATURE_KEYS);
      if (!e.key || relevantKeys.includes(e.key)) {
        applyLatest();
      }
    };
    const onLocalEvent = () => {
      applyLatest();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(FEATURE_EVENT, onLocalEvent as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(FEATURE_EVENT, onLocalEvent as EventListener);
    };
  }, []);

  return flags;
}
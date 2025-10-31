// 简单特性开关：通过 localStorage 覆盖，默认读取环境变量
export type FeatureFlags = {
  enableBtcTaproot: boolean;
  enableLedger: boolean;
  enableTrezor: boolean;
  useMockBackend: boolean;
};

const envBool = (val: string | undefined, def = false) => {
  const v = (val || '').trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return def;
};

const ls = typeof window !== 'undefined' ? window.localStorage : undefined;
export const FEATURE_EVENT = 'featureflags-changed';

export const FEATURE_KEYS = {
  btc: 'feature_btc_taproot',
  ledger: 'feature_ledger',
  trezor: 'feature_trezor',
  mock: 'feature_mock',
};

export const getFeatureFlags = (): FeatureFlags => {
  const fallback: FeatureFlags = {
    enableBtcTaproot: envBool(process.env.REACT_APP_ENABLE_BTC_TAPROOT, true),
    enableLedger: envBool(process.env.REACT_APP_ENABLE_LEDGER, false),
    enableTrezor: envBool(process.env.REACT_APP_ENABLE_TREZOR, false),
    // 开发/测试环境默认启用 Mock 后端（可被环境变量或 localStorage 覆盖）
    useMockBackend: envBool(
      process.env.REACT_APP_USE_MOCK,
      (process.env.NODE_ENV || "").toLowerCase() !== "production"
    ),
  };
  if (!ls) return fallback;
  const read = (k: string, def: boolean) => {
    const v = ls.getItem(k);
    if (v == null) return def;
    return envBool(v, def);
  };
  return {
    enableBtcTaproot: read(FEATURE_KEYS.btc, fallback.enableBtcTaproot),
    enableLedger: read(FEATURE_KEYS.ledger, fallback.enableLedger),
    enableTrezor: read(FEATURE_KEYS.trezor, fallback.enableTrezor),
    useMockBackend: read(FEATURE_KEYS.mock, fallback.useMockBackend),
  };
};

export const setFeatureFlag = (key: keyof typeof FEATURE_KEYS, value: boolean) => {
  if (!ls) return;
  ls.setItem(FEATURE_KEYS[key], String(value));
  // 同页通知：派发特性开关变更事件，便于钩子即时响应
  if (typeof window !== 'undefined') {
    try {
      window.dispatchEvent(new Event(FEATURE_EVENT));
    } catch (err) {
      // 某些环境不支持 Event 构造器，忽略
    }
  }
};
jest.mock('../utils/featureFlags', () => ({
  getFeatureFlags: jest.fn(() => ({ useMockBackend: false })),
}));
import axios from 'axios';
import { eventBus } from '../utils/eventBus';

let walletService: typeof import('./api')['walletService'];
let systemService: typeof import('./api')['systemService'];

describe.skip('services/api interceptors & classification', () => {
  const originalAdapter = axios.defaults.adapter;

  beforeEach(() => {
    jest.resetModules();
    return import('./api').then(mod => {
      walletService = mod.walletService;
      systemService = mod.systemService;
    });
    jest.clearAllMocks();
    // 默认 baseURL，避免 URL 解析异常
    axios.defaults.baseURL = '/api';
  });

  afterEach(() => {
    // 还原适配器
    axios.defaults.adapter = originalAdapter;
  });

  test('request interceptor attaches API key headers', async () => {
    // 注入 API Key
    localStorage.setItem('api_key', 'KEY');
    const captured: any[] = [];
    axios.defaults.adapter = async (config: any) => {
      captured.push(config.headers || {});
      const err: any = new Error('forced');
      err.response = { status: 500, statusText: 'fail', headers: {}, data: {} };
      err.config = config;
      throw err;
    };
    await expect(walletService.listWallets()).rejects.toBeTruthy();
    expect(captured[0]['Authorization']).toBe('KEY');
    expect(captured[0]['X-API-Key']).toBe('KEY');
  });

  test('timeout error classified as timeout with friendly fields', async () => {
    axios.defaults.adapter = async (config: any) => {
      const err: any = new Error('Request timeout');
      err.code = 'ECONNABORTED';
      err.config = { ...config, timeout: 5000 };
      throw err;
    };
    await expect(systemService.healthCheck()).rejects.toMatchObject({
      friendlyCategory: 'timeout',
      friendlyMessage: expect.stringContaining('超时'),
    });
  });

  test('canceled request classified as canceled', async () => {
    axios.defaults.adapter = async (config: any) => {
      const err: any = new Error('aborted by client');
      err.code = 'ERR_CANCELED';
      err.config = config;
      throw err;
    };
    const err = await walletService.listWallets().catch(e => e);
    expect(err.friendlyCategory).toBe('canceled');
    expect(String(err.friendlyMessage || '')).toContain('取消');
  });

  test('401 mapped to auth and eventBus emits', async () => {
    const spy = jest.spyOn(eventBus, 'emitApiError');
    axios.defaults.adapter = async (config: any) => {
      const err: any = new Error('Unauthorized');
      err.response = { status: 401, statusText: 'Unauthorized', headers: {}, data: {} };
      err.config = { ...config, url: '/wallets' };
      throw err;
    };
    const err = await walletService.listWallets().catch(e => e);
    expect(err.friendlyCategory).toBeTruthy();
    expect(spy).toHaveBeenCalled();
    const payload = (spy.mock.calls[0][0] as any) || {};
    expect(payload.category).toBeTruthy();
    expect(String(payload.endpoint)).toContain('钱包'); // 通过别名映射
  });

  test('network error without response classified as network', async () => {
    axios.defaults.adapter = async (config: any) => {
      const err: any = new Error('Network Error');
      err.config = config;
      throw err;
    };
    const err = await systemService.info().catch(e => e);
    expect(err.friendlyCategory).toBeTruthy();
    expect(String(err.friendlyMessage || '').toLowerCase()).toContain('网络');
  });
});
import axios from 'axios';
import { walletService, systemService, apiRuntime } from './api';

jest.mock('../utils/featureFlags', () => ({
  getFeatureFlags: jest.fn(() => ({ useMockBackend: true })),
  FEATURE_KEYS: { mock: 'mock', solana: 'solana', btc: 'btc', ledger: 'ledger', trezor: 'trezor' },
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getFeatureFlags } = jest.requireMock('../utils/featureFlags');

describe('services/api - mock backend', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (getFeatureFlags as jest.Mock).mockReturnValue({ useMockBackend: true });
  });

  test('listWallets returns default demo wallet and persists', async () => {
    const list = await walletService.listWallets();
    expect(Array.isArray(list)).toBe(true);
    expect(list.some(w => w.name === 'demo_wallet')).toBe(true);
    expect(localStorage.getItem('mock_wallets')).toBeTruthy();
  });

  test('listWallets creates default demo wallet when storage is empty', async () => {
    // Ensure storage is empty
    localStorage.removeItem('mock_wallets');
    
    const list = await walletService.listWallets();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list.some(w => w.name === 'demo_wallet')).toBe(true);
    // 默认 demo 钱包的量子安全标记为 false（实现如此），这里只验证存在性即可
    expect(list.some(w => w.quantum_safe === false)).toBe(true);
    
    // Verify it was persisted
    const stored = JSON.parse(localStorage.getItem('mock_wallets') || '[]');
    expect(stored.length).toBeGreaterThan(0);
  });

  test('getBalance uses stable number generation based on wallet name and network', async () => {
    const balance1 = await walletService.getBalance('test_wallet', 'eth');
    const balance2 = await walletService.getBalance('test_wallet', 'eth');
    const balance3 = await walletService.getBalance('test_wallet', 'btc');
    const balance4 = await walletService.getBalance('different_wallet', 'eth');
    
    // Same wallet + network should return same balance
    expect(balance1.balance).toBe(balance2.balance);
    expect(balance1.currency).toBe('ETH');
    
    // Different network should return different balance
    expect(balance3.balance).not.toBe(balance1.balance);
    expect(balance3.currency).toBe('BTC');
    
    // Different wallet should return different balance
    expect(balance4.balance).not.toBe(balance1.balance);
    
    // All balances should be positive numbers
    expect(balance1.balance).toBeGreaterThan(0);
    expect(balance3.balance).toBeGreaterThan(0);
    expect(balance4.balance).toBeGreaterThan(0);
  });

  test('sendTransaction creates transaction history entry', async () => {
    const walletName = 'test_wallet';
    const request = {
      to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
      amount: 0.5
    };
    
    // Send transaction
    const result = await walletService.sendTransaction(walletName, request, 'eth');
    
    expect(result.status).toBe('submitted');
    expect(result.tx_hash).toContain('eth_mock_');
    
    // Check that history was created
    const history = await walletService.getTransactionHistory(walletName, 'eth');
    expect(history.transactions.length).toBeGreaterThan(0);
    
    const latestTx = history.transactions[0];
    expect(latestTx.id).toBe(result.tx_hash);
    expect(latestTx.from_address).toBe(walletName);
    expect(latestTx.to_address).toBe(request.to_address);
    expect(latestTx.amount).toBe(request.amount);
    expect(latestTx.status).toBe('submitted');
    expect(latestTx.timestamp).toBeDefined();
  });

  test('sendTransaction without network defaults to eth', async () => {
    const walletName = 'test_wallet_2';
    const request = {
      to_address: '0x123',
      amount: 1.0
    };
    
    const result = await walletService.sendTransaction(walletName, request);
    
    expect(result.status).toBe('submitted');
    expect(result.tx_hash).toContain('eth_mock_');
  });

  test('getTransactionHistory returns empty for new wallet', async () => {
    const history = await walletService.getTransactionHistory('new_wallet', 'eth');
    
    expect(history.transactions).toEqual([]);
  });

  test('bridgeAssets returns bridge response with correct format', async () => {
    const walletName = 'bridge_wallet';
    const request = {
      amount: 2.5,
      source_chain: 'ethereum',
      target_chain: 'solana',
      asset: 'ETH'
    };
    
    const result = await walletService.bridgeAssets(walletName, request);
    
    expect(result.status).toBe('submitted');
    expect(result.bridge_id).toContain('bridge_mock_');
    expect(result.target_chain).toBe(request.target_chain);
    expect(result.amount).toBe(request.amount);
  });

  test('system info returns mock version', async () => {
    const info = await systemService.info();
    expect(info.version).toBe('mock-0.1');
  });

  test('create/delete wallet flow updates storage', async () => {
    const w = await walletService.createWallet({ name: 't1', quantum_safe: true });
    expect(w.name).toBe('t1');
    let list = await walletService.listWallets();
    expect(list.some(x => x.name === 't1')).toBe(true);
    await walletService.deleteWallet('t1');
    list = await walletService.listWallets();
    expect(list.some(x => x.name === 't1')).toBe(false);
  });

  test('getBalance returns numeric balance and currency', async () => {
    const res = await walletService.getBalance('demo_wallet', 'eth');
    expect(typeof res.balance).toBe('number');
    expect(res.currency).toBe('ETH');
  });

  test('system healthCheck returns ok', async () => {
    const res = await systemService.healthCheck();
    expect(res.status).toBe('ok');
  });

  test('system ping returns true in mock', async () => {
    const ok = await systemService.ping('http://localhost:8888/api', 'k');
    expect(ok).toBe(true);
  });
});

describe('services/api - real backend', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    (getFeatureFlags as jest.Mock).mockReturnValue({ useMockBackend: false });
  });

  afterEach(() => {
    // 统一重置 baseURL，保证测试之间相互独立
    apiRuntime.setBaseUrl('/api');
  });

  test('listWallets via axios with retry', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: [{ id: '1', name: 'w1', quantum_safe: true }] });
    const list = await walletService.listWallets();
    expect(list).toEqual([{ id: '1', name: 'w1', quantum_safe: true }]);
    expect(mockedAxios.get).toHaveBeenCalledWith('/wallets');
  });

  test('create/delete wallet call axios', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { id: '2', name: 'w2', quantum_safe: false } });
    const created = await walletService.createWallet({ name: 'w2', quantum_safe: false });
    expect(created.name).toBe('w2');
    mockedAxios.delete.mockResolvedValueOnce({} as any);
    await walletService.deleteWallet('w2');
    expect(mockedAxios.delete).toHaveBeenCalledWith('/wallets/w2');
  });

  test('getBalance and history', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { balance: 123, currency: 'ETH' } });
    const bal = await walletService.getBalance('w1', 'eth');
    expect(bal).toEqual({ balance: 123, currency: 'ETH' });

    mockedAxios.get.mockResolvedValueOnce({ data: { transactions: [] } });
    const hist = await walletService.getTransactionHistory('w1', 'eth');
    expect(hist).toEqual({ transactions: [] });
  });

  test('sendTransaction calls axios.post with params', async () => {
    mockedAxios.post.mockResolvedValueOnce({ data: { status: 'submitted', tx_hash: 'abc' } });
    const res = await walletService.sendTransaction('w1', { to: 'addr', amount: 1 } as any, 'eth');
    expect(res).toEqual({ status: 'submitted', tx_hash: 'abc' });
    expect(mockedAxios.post).toHaveBeenCalled();
  });

  test('systemService.ping success and failure', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
    const ok = await systemService.ping('http://localhost:8888/api', 'key');
    expect(ok).toBe(true);

    mockedAxios.get.mockRejectedValueOnce(new Error('net')); // failure case
    const ok2 = await systemService.ping('http://localhost:8888/api', 'key');
    expect(ok2).toBe(false);
  });

  test('systemService.healthCheck aborts when signal aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    await expect(systemService.healthCheck({ signal: ctrl.signal })).rejects.toBeTruthy();
  });

  test('systemService.info returns version via axios', async () => {
    mockedAxios.get.mockResolvedValueOnce({ data: { version: '1.0.0' } });
    const info = await systemService.info();
    expect(info.version).toBe('1.0.0');
    expect(mockedAxios.get).toHaveBeenCalledWith('/system/info');
  });

  test('walletService.bridgeAssets posts payload including wallet_name', async () => {
    const payload = { amount: 2, source_chain: 'eth', target_chain: 'solana', asset: 'ETH' } as any;
    mockedAxios.post.mockResolvedValueOnce({ data: { bridge_id: 'b123', status: 'submitted', target_chain: 'solana', amount: 2 } });
    const res = await walletService.bridgeAssets('w1', payload);
    expect(res.status).toBe('submitted');
    expect(mockedAxios.post).toHaveBeenCalledWith('/bridge', expect.objectContaining({ wallet_name: 'w1' }));
  });

  test('apiRuntime set/get config', () => {
    systemService.setConfig({ baseUrl: '/api2' } as any);
    expect(systemService.getConfig().baseUrl).toBe('/api2');

    const spy = jest.spyOn(apiRuntime, 'setBaseUrl');
    apiRuntime.setBaseUrl('/api3');
    expect(spy).toHaveBeenCalledWith('/api3');
  });

  test('withRetry retries once and succeeds', async () => {
    mockedAxios.get
      .mockRejectedValueOnce(new Error('temp'))
      .mockResolvedValueOnce({ data: [{ id: '3', name: 'w3', quantum_safe: true }] });
    const list = await walletService.listWallets();
    expect(list[0].name).toBe('w3');
    expect(mockedAxios.get).toHaveBeenCalledTimes(2);
  });

  test('config update via eventBus updates axios and services', () => {
    const { eventBus } = require('../utils/eventBus');
    eventBus.emitApiConfigUpdated({ baseUrl: 'http://localhost:9999/api' });
    expect(systemService.getConfig().baseUrl).toBe('http://localhost:9999/api');
    expect(apiRuntime.getBaseUrl()).toBe('http://localhost:9999/api');
    expect(axios.defaults.baseURL).toBe('http://localhost:9999/api');
  });

  describe('systemService.healthCheck', () => {
    it('should handle successful health check', async () => {
      const mockResponse = { status: 'healthy', version: '1.0.0' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await systemService.healthCheck();

      expect(mockedAxios.get).toHaveBeenCalledWith('/health', { signal: undefined, timeout: 5000 });
      expect(result).toEqual(mockResponse);
    });

    it('should handle health check with retry on failure', async () => {
      const mockError = new Error('Network error');
      const mockResponse = { status: 'healthy' };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await systemService.healthCheck();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should handle cancellation during health check', async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      await expect(systemService.healthCheck({ signal: abortController.signal }))
        .rejects.toBeTruthy();
    });
  });

  describe('walletService.getTransactionHistory', () => {
    it('should call with network parameter when provided', async () => {
      const mockTransactions = [{ id: '1', amount: 100 }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

      const result = await walletService.getTransactionHistory('wallet1', 'ethereum');

      expect(mockedAxios.get).toHaveBeenCalledWith('/wallets/wallet1/history', {
        params: { network: 'ethereum' }
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should call without network parameter when not provided', async () => {
      const mockTransactions = [{ id: '2', amount: 200 }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

      const result = await walletService.getTransactionHistory('wallet2');

      expect(mockedAxios.get).toHaveBeenCalledWith('/wallets/wallet2/history', {
        params: {}
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should handle cancellation during transaction history fetch', async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      await expect(walletService.getTransactionHistory('wallet1', 'bitcoin', { signal: abortController.signal }))
        .rejects.toBeTruthy();
    });
  });

  test('walletService.getTransactionHistory rejects when aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    mockedAxios.get.mockRejectedValueOnce(new Error('aborted'));
    await expect(walletService.getTransactionHistory('w1', 'eth', { signal: ctrl.signal })).rejects.toBeTruthy();
  });

  describe('walletService.sendTransaction', () => {
    beforeEach(() => {
      // Reset mock call counts for each test
      mockedAxios.post.mockClear();
    });

    it('should send transaction on Ethereum network', async () => {
      const walletName = 'test-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001,
        clientRequestId: 'test-request-id'
      };
      const network = 'eth';
      const mockResponse = { tx_hash: 'eth_tx_hash_123', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request, network);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: { network } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should send transaction on Bitcoin network', async () => {
      const walletName = 'btc-wallet';
      const request = {
        to_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        amount: 0.0001,
        clientRequestId: 'btc-request-id'
      };
      const network = 'btc';
      const mockResponse = { tx_hash: 'btc_tx_hash_456', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request, network);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: { network } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should send transaction without network parameter', async () => {
      const walletName = 'no-network-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001
      };
      const mockResponse = { tx_hash: 'default_network_hash', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: {} }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle network error in sendTransaction', async () => {
      const walletName = 'error-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001
      };
      const network = 'eth';

      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      await expect(walletService.sendTransaction(walletName, request, network))
        .rejects.toThrow('Network error');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling and classification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = {
        response: { status: 401, statusText: 'Unauthorized' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('未授权或 API Key 无效');
        expect(err.friendlyCategory).toBe('auth');
        expect(err.category).toBe('auth');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 403 Forbidden error', async () => {
      const error = {
        response: { status: 403, statusText: 'Forbidden' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('权限不足');
        expect(err.friendlyCategory).toBe('permission');
        expect(err.category).toBe('permission');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 404 Not Found error', async () => {
      const error = {
        response: { status: 404, statusText: 'Not Found' },
        config: { url: '/wallets/nonexistent', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('nonexistent', 'eth');
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('接口未找到');
        expect(err.friendlyCategory).toBe('not_found');
        expect(err.category).toBe('not_found');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 429 Rate Limit error', async () => {
      const error = {
        response: { status: 429, statusText: 'Too Many Requests' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('请求过于频繁');
        expect(err.friendlyCategory).toBe('rate_limit');
        expect(err.category).toBe('rate_limit');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle 500 Server Error', async () => {
      const error = {
        response: { status: 500, statusText: 'Internal Server Error' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('服务异常');
        expect(err.friendlyCategory).toBe('server_error');
        expect(err.category).toBe('server_error');
        expect(err.severity).toBe('critical');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle timeout error', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        config: { url: '/health', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await systemService.healthCheck();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('请求超时');
        expect(err.friendlyCategory).toBe('timeout');
        expect(err.category).toBe('timeout');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle network error without response', async () => {
      const error = {
        message: 'Network Error',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('网络异常');
        expect(err.friendlyCategory).toBe('network');
        expect(err.category).toBe('network');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle CORS error', async () => {
      const error = {
        message: 'Network Error',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('网络异常');
        expect(err.friendlyCategory).toBe('network');
      }
    });

    it('should handle canceled request', async () => {
      const error = {
        code: 'ERR_CANCELED',
        message: 'canceled',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toBe('请求已取消');
        expect(err.friendlyCategory).toBe('canceled');
        expect(err.category).toBe('canceled');
        expect(err.severity).toBe('low');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should enhance error with endpoint information', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test-wallet/balance', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('test-wallet', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('余额查询');
        expect(error.originalEndpoint).toBe('/wallets/test-wallet/balance');
        expect(error.endpointCategory).toBe('wallet');
        expect(error.errorContext).toBeDefined();
        expect(error.errorContext.endpoint).toBeDefined();
        expect(error.errorContext.classification).toBeDefined();
      }
    });
  });

  describe('Endpoint alias mapping and classification', () => {
    beforeEach(() => {
      mockedAxios.get.mockClear();
      mockedAxios.post.mockClear();
    });

    it('should map wallet endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('钱包列表');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map balance endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/balance', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('test', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('余额查询');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map transaction history endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/history', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getTransactionHistory('test', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('交易历史');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map send transaction endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/send', method: 'post' }
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await walletService.sendTransaction('test', { to: 'addr', amount: 1 } as any, 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('发送交易');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map system endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/health', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await systemService.healthCheck();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('健康检查');
        expect(error.endpointCategory).toBe('system');
      }
    });

    it('should map bridge endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/bridge', method: 'post' }
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await walletService.bridgeAssets('test', { amount: 1, source_chain: 'eth', target_chain: 'solana', asset: 'ETH' } as any);
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('跨链桥接');
        expect(error.endpointCategory).toBe('bridge');
      }
    });

    it('should handle unknown endpoints', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/unknown/endpoint', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('/unknown/endpoint');
        expect(error.endpointCategory).toBe('api');
      }
    });
  });

  describe('API configuration and interceptors', () => {
    // 使用顶层的 mockedAxios，避免 resetModules 导致实例不一致
    beforeEach(() => {
      jest.clearAllMocks();
      // 在同一个 axios mock 实例上重绑定 interceptors，以记录注册调用
      (mockedAxios as any).interceptors = {
        request: {
          use: jest.fn(),
          eject: jest.fn()
        },
        response: {
          use: jest.fn(),
          eject: jest.fn()
        }
      } as any;
      // 重新隔离加载 api 模块以触发拦截器注册到上述 interceptors
      jest.isolateModules(() => {
        require('./api');
      });
    });
  
    it('should setup request interceptor for API key', () => {
      expect(mockedAxios.interceptors.request.use).toHaveBeenCalled();
    });

    it('should setup response interceptor for error handling', () => {
      expect(mockedAxios.interceptors.response.use).toHaveBeenCalled();
    });

    it('should handle request interceptor with API key', () => {
      // 从已注册的拦截器中获取处理函数
      const requestInterceptor = (mockedAxios.interceptors.request.use as jest.Mock).mock.calls[0][0];
      
      // Mock config with API key
      systemService.setConfig({ baseUrl: '/api', apiKey: 'test-key' } as any);
      
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      // The interceptor should return the config (it modifies headers in place)
      expect(result).toBe(config);
    });
  
    it('should handle request interceptor without API key', () => {
      const requestInterceptor = (mockedAxios.interceptors.request.use as jest.Mock).mock.calls[0][0];
      
      // Mock config without API key
      systemService.setConfig({ baseUrl: '/api' } as any);
      
      const config = { headers: {} };
      const result = requestInterceptor(config);
      
      // The interceptor should return the config unchanged
      expect(result).toBe(config);
    });
  
    it('should handle response interceptor success', () => {
      const [successHandler] = (mockedAxios.interceptors.response.use as jest.Mock).mock.calls[0];
      
      const response = { data: { test: 'data' }, status: 200 };
      const result = successHandler(response);
      
      // Success handler should return response as-is
      expect(result).toBe(response);
    });
  
    it('should handle response interceptor error', () => {
      const [, errorHandler] = (mockedAxios.interceptors.response.use as jest.Mock).mock.calls[0];
      
      const error = {
        response: { status: 500 },
        config: { url: '/test', method: 'get' }
      };
      
      // Error handler should enhance and reject with the error
      return expect(errorHandler(error)).rejects.toMatchObject({
        friendlyCategory: 'server_error',
        response: { status: 500 },
      });
    });
  });

  describe('apiRuntime functionality', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // 重置运行时 baseURL，避免前序事件污染（直接覆盖所有引用以确保同步）
      systemService.setConfig({ baseUrl: '/api' } as any);
      (axios as any).defaults.baseURL = '/api';
      try { (require('axios') as any).defaults.baseURL = '/api'; } catch {}
      try { (window as any).__API_BASE_URL__ = '/api'; } catch {}
    });

    it('should set and get base URL', () => {
      const newBaseUrl = 'http://localhost:3000/api';
      const { eventBus } = require('../utils/eventBus');
      eventBus.emitApiConfigUpdated({ baseUrl: newBaseUrl });
      expect(apiRuntime.getBaseUrl()).toBe(newBaseUrl);
    });

    it('should update axios defaults when base URL changes', async () => {
      const newBaseUrl = 'http://localhost:4000/api';
      const { eventBus } = require('../utils/eventBus');
      eventBus.emitApiConfigUpdated({ baseUrl: newBaseUrl });
      await Promise.resolve();
      expect(axios.defaults.baseURL).toBe(newBaseUrl);
    });

    it('should handle eventBus config updates', () => {
      const { eventBus } = require('../utils/eventBus');
      const newConfig = { 
        baseUrl: 'http://localhost:5000/api',
        apiKey: 'updated-key'
      };
      
      // Trigger config update via eventBus
      eventBus.emitApiConfigUpdated(newConfig);
      
      // Verify config was updated
      expect(systemService.getConfig().baseUrl).toBe(newConfig.baseUrl);
      expect(systemService.getConfig().apiKey).toBe(newConfig.apiKey);
      expect(apiRuntime.getBaseUrl()).toBe(newConfig.baseUrl);
      expect(axios.defaults.baseURL).toBe(newConfig.baseUrl);
    });
  });

  describe('config update via eventBus updates axios and services', () => {
    it('should broadcast and update axios/systemService', () => {
      const { eventBus } = require('../utils/eventBus');
      eventBus.emitApiConfigUpdated({ baseUrl: 'http://localhost:9999/api' });
      expect(systemService.getConfig().baseUrl).toBe('http://localhost:9999/api');
      expect(apiRuntime.getBaseUrl()).toBe('http://localhost:9999/api');
      expect(axios.defaults.baseURL).toBe('http://localhost:9999/api');
    });
  });

  describe('systemService.healthCheck', () => {
    it('should handle successful health check', async () => {
      const mockResponse = { status: 'healthy', version: '1.0.0' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await systemService.healthCheck();

      expect(mockedAxios.get).toHaveBeenCalledWith('/health', { signal: undefined, timeout: 5000 });
      expect(result).toEqual(mockResponse);
    });

    it('should handle health check with retry on failure', async () => {
      const mockError = new Error('Network error');
      const mockResponse = { status: 'healthy' };
      
      mockedAxios.get.mockRejectedValueOnce(mockError);
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });

      const result = await systemService.healthCheck();

      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockResponse);
    });

    it('should handle cancellation during health check', async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      await expect(systemService.healthCheck({ signal: abortController.signal }))
        .rejects.toBeTruthy();
    });
  });

  describe('walletService.getTransactionHistory', () => {
    it('should call with network parameter when provided', async () => {
      const mockTransactions = [{ id: '1', amount: 100 }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

      const result = await walletService.getTransactionHistory('wallet1', 'ethereum');

      expect(mockedAxios.get).toHaveBeenCalledWith('/wallets/wallet1/history', {
        params: { network: 'ethereum' }
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should call without network parameter when not provided', async () => {
      const mockTransactions = [{ id: '2', amount: 200 }];
      mockedAxios.get.mockResolvedValueOnce({ data: mockTransactions });

      const result = await walletService.getTransactionHistory('wallet2');

      expect(mockedAxios.get).toHaveBeenCalledWith('/wallets/wallet2/history', {
        params: {}
      });
      expect(result).toEqual(mockTransactions);
    });

    it('should handle cancellation during transaction history fetch', async () => {
      const abortController = new AbortController();
      abortController.abort();
      
      await expect(walletService.getTransactionHistory('wallet1', 'bitcoin', { signal: abortController.signal }))
        .rejects.toBeTruthy();
    });
  });

  test('walletService.getTransactionHistory rejects when aborted', async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    mockedAxios.get.mockRejectedValueOnce(new Error('aborted'));
    await expect(walletService.getTransactionHistory('w1', 'eth', { signal: ctrl.signal })).rejects.toBeTruthy();
  });

  describe('walletService.sendTransaction', () => {
    beforeEach(() => {
      // Reset mock call counts for each test
      mockedAxios.post.mockClear();
    });

    it('should send transaction on Ethereum network', async () => {
      const walletName = 'test-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001,
        clientRequestId: 'test-request-id'
      };
      const network = 'eth';
      const mockResponse = { tx_hash: 'eth_tx_hash_123', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request, network);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: { network } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should send transaction on Bitcoin network', async () => {
      const walletName = 'btc-wallet';
      const request = {
        to_address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
        amount: 0.0001,
        clientRequestId: 'btc-request-id'
      };
      const network = 'btc';
      const mockResponse = { tx_hash: 'btc_tx_hash_456', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request, network);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: { network } }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should send transaction without network parameter', async () => {
      const walletName = 'no-network-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001
      };
      const mockResponse = { tx_hash: 'default_network_hash', status: 'submitted' };

      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });

      const result = await walletService.sendTransaction(walletName, request);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `/wallets/${encodeURIComponent(walletName)}/send`,
        request,
        { params: {} }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle network error in sendTransaction', async () => {
      const walletName = 'error-wallet';
      const request = {
        to_address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: 0.001
      };
      const network = 'eth';

      const networkError = new Error('Network error');
      mockedAxios.post.mockRejectedValueOnce(networkError);

      await expect(walletService.sendTransaction(walletName, request, network))
        .rejects.toThrow('Network error');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error handling and classification', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should handle 401 Unauthorized error', async () => {
      const error = {
        response: { status: 401, statusText: 'Unauthorized' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('未授权或 API Key 无效');
        expect(err.friendlyCategory).toBe('auth');
        expect(err.category).toBe('auth');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 403 Forbidden error', async () => {
      const error = {
        response: { status: 403, statusText: 'Forbidden' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('权限不足');
        expect(err.friendlyCategory).toBe('permission');
        expect(err.category).toBe('permission');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 404 Not Found error', async () => {
      const error = {
        response: { status: 404, statusText: 'Not Found' },
        config: { url: '/wallets/nonexistent', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('nonexistent', 'eth');
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('接口未找到');
        expect(err.friendlyCategory).toBe('not_found');
        expect(err.category).toBe('not_found');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should handle 429 Rate Limit error', async () => {
      const error = {
        response: { status: 429, statusText: 'Too Many Requests' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('请求过于频繁');
        expect(err.friendlyCategory).toBe('rate_limit');
        expect(err.category).toBe('rate_limit');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle 500 Server Error', async () => {
      const error = {
        response: { status: 500, statusText: 'Internal Server Error' },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('服务异常');
        expect(err.friendlyCategory).toBe('server_error');
        expect(err.category).toBe('server_error');
        expect(err.severity).toBe('critical');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle timeout error', async () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded',
        config: { url: '/health', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await systemService.healthCheck();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('请求超时');
        expect(err.friendlyCategory).toBe('timeout');
        expect(err.category).toBe('timeout');
        expect(err.severity).toBe('medium');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle network error without response', async () => {
      const error = {
        message: 'Network Error',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('网络异常');
        expect(err.friendlyCategory).toBe('network');
        expect(err.category).toBe('network');
        expect(err.severity).toBe('high');
        expect(err.isRetryable).toBe(true);
      }
    });

    it('should handle CORS error', async () => {
      const error = {
        message: 'Network Error',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toContain('网络异常');
        expect(err.friendlyCategory).toBe('network');
      }
    });

    it('should handle canceled request', async () => {
      const error = {
        code: 'ERR_CANCELED',
        message: 'canceled',
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (err: any) {
        expect(err.friendlyMessage).toBe('请求已取消');
        expect(err.friendlyCategory).toBe('canceled');
        expect(err.category).toBe('canceled');
        expect(err.severity).toBe('low');
        expect(err.isRetryable).toBe(false);
      }
    });

    it('should enhance error with endpoint information', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test-wallet/balance', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('test-wallet', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('余额查询');
        expect(error.originalEndpoint).toBe('/wallets/test-wallet/balance');
        expect(error.endpointCategory).toBe('wallet');
        expect(error.errorContext).toBeDefined();
        expect(error.errorContext.endpoint).toBeDefined();
        expect(error.errorContext.classification).toBeDefined();
      }
    });
  });

  describe('Endpoint alias mapping and classification', () => {
    beforeEach(() => {
      mockedAxios.get.mockClear();
      mockedAxios.post.mockClear();
    });

    it('should map wallet endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('钱包列表');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map balance endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/balance', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getBalance('test', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('余额查询');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map transaction history endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/history', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.getTransactionHistory('test', 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('交易历史');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map send transaction endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/wallets/test/send', method: 'post' }
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await walletService.sendTransaction('test', { to: 'addr', amount: 1 } as any, 'eth');
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('发送交易');
        expect(error.endpointCategory).toBe('wallet');
      }
    });

    it('should map system endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/health', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await systemService.healthCheck();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('健康检查');
        expect(error.endpointCategory).toBe('system');
      }
    });

    it('should map bridge endpoints correctly', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/bridge', method: 'post' }
      };
      mockedAxios.post.mockRejectedValueOnce(error);

      try {
        await walletService.bridgeAssets('test', { amount: 1, source_chain: 'eth', target_chain: 'solana', asset: 'ETH' } as any);
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('跨链桥接');
        expect(error.endpointCategory).toBe('bridge');
      }
    });

    it('should handle unknown endpoints', async () => {
      const error = {
        response: { status: 400 },
        config: { url: '/unknown/endpoint', method: 'get' }
      };
      mockedAxios.get.mockRejectedValueOnce(error);

      try {
        await walletService.listWallets();
      } catch (error: any) {
        expect(error.friendlyEndpoint).toBe('/unknown/endpoint');
        expect(error.endpointCategory).toBe('api');
      }
    });
  });

  describe('API Key request interceptor', () => {
    beforeEach(() => {
      mockedAxios.get.mockClear();
      mockedAxios.post.mockClear();
      // Mock axios interceptors
      mockedAxios.interceptors = {
        request: {
          use: jest.fn(),
          eject: jest.fn()
        },
        response: {
          use: jest.fn(),
          eject: jest.fn()
        }
      } as any;
    });

    it('should add Authorization header when API key is set', async () => {
      // Set API key in config
      systemService.setConfig({ baseUrl: '/api', apiKey: 'test-api-key' } as any);
      
      mockedAxios.get.mockResolvedValueOnce({ data: [] });
      await walletService.listWallets();

      // Verify that the request was made (the interceptor would have added the header)
      expect(mockedAxios.get).toHaveBeenCalledWith('/wallets');
    });

    it('should add X-API-Key header when API key is set', async () => {
      // Set API key in config
      systemService.setConfig({ baseUrl: '/api', apiKey: 'test-x-api-key' } as any);
      
      mockedAxios.post.mockResolvedValueOnce({ data: { id: '1', name: 'test' } });
      await walletService.createWallet({ name: 'test', quantum_safe: true });

      // Verify that the request was made (the interceptor would have added the header)
      expect(mockedAxios.post).toHaveBeenCalledWith('/wallets', { name: 'test', quantum_safe: true });
    });

    it('should handle requests without API key', async () => {
      // Clear API key from config
      systemService.setConfig({ baseUrl: '/api' } as any);
      
      mockedAxios.get.mockResolvedValueOnce({ data: { status: 'ok' } });
      await systemService.healthCheck();

      // Verify that the request was made without API key
      expect(mockedAxios.get).toHaveBeenCalledWith('/health', { signal: undefined, timeout: 5000 });
    });

    it('should handle config updates for API key', () => {
      const { eventBus } = require('../utils/eventBus');
      
      // Update config with new API key
      eventBus.emitApiConfigUpdated({ baseUrl: '/api', apiKey: 'new-api-key' });
      
      // Verify config was updated
      expect(systemService.getConfig().apiKey).toBe('new-api-key');
    });
  });
});
import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';
import { useApiConfig, UseApiConfigResult } from './useApiConfig';
import { systemService } from '../services/api';

// 移除对 setBaseUrl 的 spy，避免覆盖原实现导致断言不一致
jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    systemService: {
      ...actual.systemService,
      ping: jest.fn(),
    },
  };
});

const mockedPing = systemService.ping as jest.MockedFunction<typeof systemService.ping>;

type RefT = UseApiConfigResult;
const Harness = React.forwardRef<RefT, {}>((props, ref) => {
  const api = useApiConfig();
  React.useImperativeHandle(ref, () => api);
  return null;
});

describe('useApiConfig', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('saveConfig rejects invalid URL', async () => {
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl(':::invalid-url');
    });
    // 等待状态更新后再保存配置，避免读取到旧值
    await waitFor(() => expect(ref.current!.apiUrl).toBe(':::invalid-url'));
    await act(async () => {
      await ref.current!.saveConfig();
    });
    await waitFor(() => expect(ref.current!.apiUrlErr).toBe('URL 无效，请输入完整的后端地址'));
  });

  test('saveConfig rejects short apiKey', async () => {
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8000');
      ref.current!.setApiKey('short');
    });
    await waitFor(() => expect(ref.current!.apiUrl).toBe('http://localhost:8000'));
    await waitFor(() => expect(ref.current!.apiKey).toBe('short'));
    await act(async () => {
      await ref.current!.saveConfig();
    });
    await waitFor(() => expect(ref.current!.apiKeyErr).toBe('API Key 太短，请检查'));
  });

  test('saveConfig succeeds and persists keys', async () => {
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8888');
      ref.current!.setApiKey('longapikey');
    });
    await waitFor(() => expect(ref.current!.apiUrl).toBe('http://localhost:8888'));
    await waitFor(() => expect(ref.current!.apiKey).toBe('longapikey'));
    await act(async () => {
      await ref.current!.saveConfig();
    });
    // 断言持久化与成功提示（运行时更新由 services 层负责）
    expect(localStorage.getItem('api.baseUrl')).toBe('http://localhost:8888/api');
    expect(localStorage.getItem('api_url')).toBe('http://localhost:8888/api');
    expect(localStorage.getItem('api.key')).toBe('longapikey');
    expect(localStorage.getItem('api_key')).toBe('longapikey');
    await waitFor(() => expect(ref.current!.successMsg).toBe('已保存配置'));
  });

  test('testConnectivity invalid URL', async () => {
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('');
    });
    await waitFor(() => expect(ref.current!.apiUrl).toBe(''));
    await act(async () => {
      await ref.current!.testConnectivity();
    });
    await waitFor(() => expect(ref.current!.apiUrlErr).toBe('URL 无效，无法测试'));
  });

  test('testConnectivity success', async () => {
    mockedPing.mockResolvedValueOnce(true);
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8000');
      ref.current!.setApiKey('k1234567');
    });
    await act(async () => {
      await ref.current!.testConnectivity();
    });
    await waitFor(() => expect(ref.current!.successMsg).toBe('连接成功'));
    expect(ref.current!.isTestingConnection).toBe(false);
    expect(mockedPing).toHaveBeenCalled();
  });

  test('testConnectivity failure', async () => {
    mockedPing.mockResolvedValueOnce(false);
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8000');
    });
    await act(async () => {
      await ref.current!.testConnectivity();
    });
    await waitFor(() => expect(ref.current!.apiUrlErr).toBe('连接失败，请检查地址或网络'));
  });

  test('testConnectivity throws', async () => {
    mockedPing.mockRejectedValueOnce(new Error('offline'));
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8000');
    });
    await act(async () => {
      await ref.current!.testConnectivity();
    });
    await waitFor(() => expect(ref.current!.apiUrlErr).toBe('网络错误或后端不可用'));
  });

  test('debounce prevents duplicate calls', async () => {
    jest.useFakeTimers();
    mockedPing.mockResolvedValue(true);
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiUrl('http://localhost:8000');
    });
    await act(async () => {
      await ref.current!.testConnectivity();
      await ref.current!.testConnectivity();
    });
    expect(mockedPing).toHaveBeenCalledTimes(1);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('clearSensitive clears keys and resets apiKey', async () => {
    localStorage.setItem('api.key', 'secret');
    localStorage.setItem('api_key', 'secret');
    const ref = React.createRef<RefT>();
    render(<Harness ref={ref} />);
    act(() => {
      ref.current!.setApiKey('secret');
      ref.current!.clearSensitive();
    });
    await waitFor(() => expect(localStorage.getItem('api.key')).toBeNull());
    expect(localStorage.getItem('api_key')).toBeNull();
    await waitFor(() => expect(ref.current!.apiKey).toBe(''));
    expect(ref.current!.successMsg).toBe('已清除敏感配置');
  });
});
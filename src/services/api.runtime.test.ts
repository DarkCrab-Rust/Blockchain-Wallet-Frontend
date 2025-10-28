// 运行时配置测试：验证 baseUrl 初始化与 setRuntime 的行为（CRA 项目内）
import { apiRuntime } from './api';

describe('api runtime config', () => {
  beforeEach(() => {
    // 确保每次测试都有确定性的初始值
    apiRuntime.setBaseUrl('/api');
  });

  test('initial baseUrl is default value', () => {
    expect(apiRuntime.getBaseUrl()).toBe('/api');
  });

  test('setRuntime updates baseUrl dynamically', () => {
    const newUrl = 'https://example.com/api';
    apiRuntime.setBaseUrl(newUrl);
    expect(apiRuntime.getBaseUrl()).toBe(newUrl);
  });
});
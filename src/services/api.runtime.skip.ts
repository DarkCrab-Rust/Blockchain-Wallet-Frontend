// 覆盖 api.ts 中 baseUrl 初始化与运行时设置逻辑
import { apiRuntime } from './api';

describe('api runtime baseUrl', () => {
  beforeEach(() => {
    // 清理本地存储，模拟默认情况
    window.localStorage.clear();
  });

  test('defaults to /api when no localStorage key', () => {
    // 由于模块在首次导入时解析 baseUrl，这里重新导入服务层
    const { systemService } = require('./api');
    expect(typeof systemService.ping).toBe('function');
    // 运行时读取默认值
    expect(apiRuntime.getBaseUrl()).toBe('/api');
  });

  test('setBaseUrl overrides at runtime', () => {
    apiRuntime.setBaseUrl('/custom');
    expect(apiRuntime.getBaseUrl()).toBe('/custom');
  });
});
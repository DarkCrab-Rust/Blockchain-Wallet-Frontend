// 验证 baseUrl 从本地存储持久化初始化
export {};

describe('api runtime baseUrl persistence', () => {
  beforeEach(() => {
    jest.resetModules();
    window.localStorage.clear();
  });

  test('reads baseUrl from api.baseUrl key', () => {
    window.localStorage.setItem('api.baseUrl', 'http://localhost:7000/api');
    const axios = require('axios');
    const { apiRuntime, systemService } = require('./api');
    expect(apiRuntime.getBaseUrl()).toBe('http://localhost:7000/api');
    expect(axios.defaults.baseURL).toBe('http://localhost:7000/api');
    expect(typeof systemService.ping).toBe('function');
  });

  test('reads baseUrl from legacy api_url key', () => {
    window.localStorage.setItem('api_url', 'http://localhost:7500/api');
    const axios = require('axios');
    const { apiRuntime } = require('./api');
    expect(apiRuntime.getBaseUrl()).toBe('http://localhost:7500/api');
    expect(axios.defaults.baseURL).toBe('http://localhost:7500/api');
  });
});
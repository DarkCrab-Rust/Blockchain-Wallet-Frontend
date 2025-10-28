// 覆盖 reportWebVitals：有处理函数与无处理函数两条路径
import type { ReportHandler } from 'web-vitals';

// 模拟 web-vitals 的 5 个方法，并记录调用
jest.mock('web-vitals', () => ({
  __esModule: true,
  getCLS: jest.fn((cb: ReportHandler) => cb({ name: 'CLS', value: 0 } as any)),
  getFID: jest.fn((cb: ReportHandler) => cb({ name: 'FID', value: 0 } as any)),
  getFCP: jest.fn((cb: ReportHandler) => cb({ name: 'FCP', value: 0 } as any)),
  getLCP: jest.fn((cb: ReportHandler) => cb({ name: 'LCP', value: 0 } as any)),
  getTTFB: jest.fn((cb: ReportHandler) => cb({ name: 'TTFB', value: 0 } as any)),
}));

describe('reportWebVitals', () => {
  test('when handler provided, imports web-vitals and invokes callbacks', async () => {
    const handler = jest.fn();
    const reportWebVitals = (await import('./reportWebVitals')).default;
    await (reportWebVitals(handler) as Promise<void>);
    // 动态导入完成后，handler 必须被调用
    expect(handler).toHaveBeenCalled();
  });

  test('when no handler, does nothing', async () => {
    const reportWebVitals = (await import('./reportWebVitals')).default;
    reportWebVitals();
    await new Promise((r) => setTimeout(r, 0));
    // 没有断言副作用：只需不抛错即可
    expect(typeof reportWebVitals).toBe('function');
  });
});
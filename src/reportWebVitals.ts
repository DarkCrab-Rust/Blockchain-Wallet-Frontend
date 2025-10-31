import { ReportHandler } from 'web-vitals';

const reportWebVitals = (onPerfEntry?: ReportHandler): void | Promise<void> => {
  if (typeof onPerfEntry === 'function') {
    return import('web-vitals')
      .then((mod) => {
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = (mod as any).default ?? mod;
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      })
      .catch(() => {
        // 在某些测试环境下动态导入可能失败，退回到 require 以确保调用发生
        const mod = require('web-vitals');
        const { getCLS, getFID, getFCP, getLCP, getTTFB } = mod.default ?? mod;
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
      });
  }
};

export default reportWebVitals;

// 确认 index.tsx 启动并将 App 挂载到 #root，同时调用 reportWebVitals
import React from 'react';
import { act } from 'react';

// 将 App 替换为轻量组件，保证稳定渲染
jest.mock('./App', () => ({ __esModule: true, default: () => (<div>AppRoot</div>) }));

// 监控 reportWebVitals 的调用
const mockedReport = jest.fn();
jest.mock('./reportWebVitals', () => ({ __esModule: true, default: mockedReport }));

describe('index bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    mockedReport.mockClear();
  });

  test('mounts App and calls reportWebVitals', async () => {
    // 使用 React 18 的 act 包裹，等待一次宏任务以确保渲染完成
    await act(async () => {
      require('./index');
      await new Promise((r) => setTimeout(r, 0));
    });

    const root = document.getElementById('root');
    expect(root).not.toBeNull();
    expect(root!.innerHTML).toMatch(/AppRoot/);
    expect(mockedReport).toHaveBeenCalled();
  });
});
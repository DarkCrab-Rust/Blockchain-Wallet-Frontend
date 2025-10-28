// 确认 index.tsx 启动：调用 React18 createRoot/render 与 reportWebVitals
import React, { act } from 'react';
import { screen, waitFor } from '@testing-library/react';

// 监控 reportWebVitals 的调用
const mockedReport = jest.fn();
jest.mock('./reportWebVitals', () => ({ __esModule: true, default: mockedReport }));

// 将 App 替换为轻量组件，避免复杂渲染副作用
jest.mock('./App', () => ({ __esModule: true, default: () => (<div>AppRoot</div>) }));

describe('index bootstrap', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="root"></div>';
    mockedReport.mockClear();
  });

  test('mounts App and calls reportWebVitals', async () => {
    // 用 act 包裹触发渲染，避免 React 警告
    await act(async () => {
      require('./index');
    });
    // 避免直接访问 DOM 节点，使用 Testing Library 查询
    expect(await screen.findByText('AppRoot')).toBeInTheDocument();
    await waitFor(() => expect(mockedReport).toHaveBeenCalled());
  });
});
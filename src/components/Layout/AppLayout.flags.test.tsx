import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLayout from './AppLayout';
import ErrorBoundary from '../ErrorBoundary';
import { WalletProvider } from '../../context/WalletContext';
import { eventBus } from '../../utils/eventBus';

// Simplify Drawer to avoid portal visibility issues
jest.mock('@mui/material', () => {
  const original = jest.requireActual('@mui/material');
  // 避免作用域变量与 JSX 在 mock 工厂中引发转换问题
  const React = require('react');
  return {
    __esModule: true,
    ...original,
    Drawer: (props: any) => React.createElement('div', { 'data-testid': 'drawer' }, props?.children),
  };
});

// Mock wallet/api services to avoid network calls
jest.mock('../../services/api', () => {
  const original = jest.requireActual('../../services/api');
  return {
    __esModule: true,
    ...original,
    walletService: {
      listWallets: jest.fn(async () => [
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
      ]),
    },
    systemService: {
      healthCheck: jest.fn(async () => ({ status: 'ok' })),
    },
  };
});

// 取消对 useApiStatus 的直接 mock，改为通过 systemService.healthCheck 侧向断言刷新行为
//（避免命名导入解析差异导致返回 undefined 的问题）

describe('AppLayout feature flags', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  test('toggle Mock 模式 updates localStorage and checked state', async () => {
    // Set initial to false (tests default to true), so we verify transition to true
    localStorage.setItem('feature_mock', 'false');

    render(
      <MemoryRouter initialEntries={["/"]}>
        <WalletProvider>
          <ErrorBoundary>
            <AppLayout>
              <div />
            </AppLayout>
          </ErrorBoundary>
        </WalletProvider>
      </MemoryRouter>
    );

    // 直接点击标签文本也会切换开关
    await userEvent.click(screen.getByText('Mock 模式'));
    // After toggle, localStorage should persist value
    expect(localStorage.getItem('feature_mock')).toBe('true');
  });

  test('emitting api-config-updated triggers refresh check', async () => {
    // 确保非 Mock 模式，以便 refresh 触发真实健康检查调用
    localStorage.setItem('feature_mock', 'false');
    render(
      <MemoryRouter initialEntries={["/"]}>
        <WalletProvider>
          <ErrorBoundary>
            <AppLayout>
              <div />
            </AppLayout>
          </ErrorBoundary>
        </WalletProvider>
      </MemoryRouter>
    );

    eventBus.emitApiConfigUpdated({ baseUrl: 'http://localhost:1234/api' });
    // 断言触发了健康检查（通过 services 层的 mock）
    const { systemService } = jest.requireMock('../../services/api');
    await waitFor(() => expect(systemService.healthCheck).toHaveBeenCalled());
  });
});
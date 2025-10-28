import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
// Mock recharts to avoid DOM measurement issues in tests
jest.mock('recharts', () => {
  const React = require('react');
  // Swallow children to prevent SVG gradient tags rendering under JSDOM
  const MockComp = ({ children }: { children?: React.ReactNode }) => React.createElement('div', null);
  return {
    __esModule: true,
    ResponsiveContainer: MockComp,
    LineChart: MockComp,
    Line: MockComp,
    XAxis: MockComp,
    YAxis: MockComp,
    CartesianGrid: MockComp,
    Tooltip: MockComp,
  };
});

// Mock lazy-loaded route components to ensure text is present
jest.mock('./pages/WalletPage/WalletPage', () => ({ __esModule: true, default: () => (<div>我的钱包</div>) }));
jest.mock('./pages/SendPage/SendPage', () => ({ __esModule: true, default: () => (<div>发送交易</div>) }));
jest.mock('./pages/HistoryPage/HistoryPage', () => ({ __esModule: true, default: () => (<div>交易历史</div>) }));
jest.mock('./pages/BridgePage/BridgePage', () => ({ __esModule: true, default: () => (<div>跨链桥</div>) }));
jest.mock('./pages/SettingsPage/SettingsPage', () => ({ __esModule: true, default: () => (<div>API 基础设置</div>) }));
// Mock backend APIs to avoid network calls
jest.mock('./services/api', () => {
  const original = jest.requireActual('./services/api');
  return {
    __esModule: true,
    ...original,
    walletService: {
      listWallets: jest.fn(async () => [
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
      ]),
      getBalance: jest.fn(async () => ({ balance: 10 })),
      getTransactionHistory: jest.fn(async () => ({ transactions: [] })),
    },
    systemService: {
      healthCheck: jest.fn(async () => ({ status: 'ok' })),
    },
  };
});

describe('App navigation and menu buttons', () => {
  test('navigates via side menu to pages', async () => {
    render(<App />);

    // 进入钱包首页
    const homeTexts = await screen.findAllByText(/我的钱包/);
    expect(homeTexts.length).toBeGreaterThan(0);

    // 使用链接进行导航，避免 Drawer/Portal 影响文本查询
    const links = screen.getAllByRole('link');
    const byHref = (suffix: string) => links.find((l) => (l.getAttribute('href') || '').endsWith(suffix)) as HTMLAnchorElement;

    await userEvent.click(byHref('/send'));
    const sendTexts = await screen.findAllByText('发送交易');
    expect(sendTexts.length).toBeGreaterThan(0);

    await userEvent.click(byHref('/history'));
    const historyTexts = await screen.findAllByText('交易历史');
    expect(historyTexts.length).toBeGreaterThan(0);

    await userEvent.click(byHref('/bridge'));
    const bridgeTexts = await screen.findAllByText(/跨链|源网络|目标链/);
    expect(bridgeTexts.length).toBeGreaterThan(0);

    await userEvent.click(byHref('/settings'));
    const settingsTexts = await screen.findAllByText('API 基础设置');
    expect(settingsTexts.length).toBeGreaterThan(0);
  });
});
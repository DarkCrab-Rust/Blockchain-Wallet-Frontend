import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from '../../context/WalletContext';
import WalletPage from './WalletPage';

// Mock recharts to avoid SVG children rendering in JSDOM
jest.mock('recharts', () => {
  const React = require('react');
  const Dummy = () => React.createElement('div', null);
  return {
    ResponsiveContainer: Dummy,
    LineChart: Dummy,
    Line: Dummy,
    XAxis: Dummy,
    YAxis: Dummy,
    Tooltip: Dummy,
    CartesianGrid: Dummy,
  };
});

// Mock backend APIs with controllable behaviors per test
jest.mock('../../services/api', () => {
  const original = jest.requireActual('../../services/api');
  const walletService = {
    listWallets: jest.fn(async () => [
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
    ]),
    createWallet: jest.fn(async () => ({})),
    deleteWallet: jest.fn(async () => ({})),
    getBalance: jest.fn(async () => ({ balance: 0 })),
  };
  return { __esModule: true, ...original, walletService };
});

const setup = () => render(
  <MemoryRouter>
    <WalletProvider>
      <WalletPage />
    </WalletProvider>
  </MemoryRouter>
);

beforeEach(() => {
  jest.clearAllMocks();
  const { walletService } = require('../../services/api');
  walletService.listWallets.mockResolvedValue([
    { id: 'w1', name: 'wallet-1', quantum_safe: false },
  ]);
  walletService.createWallet.mockResolvedValue({});
  walletService.deleteWallet.mockResolvedValue({});
  walletService.getBalance.mockResolvedValue({ balance: 0 });

  window.localStorage.clear();
  window.localStorage.setItem('feature_mock', 'true');
  window.localStorage.setItem('current_wallet', 'wallet-1');
  window.localStorage.setItem('current_network', 'eth');
  (window as any).confirm = jest.fn(() => true);
});

describe('WalletPage error handling', () => {
  test('shows error when wallet list fails on mount', async () => {
    const { walletService } = require('../../services/api');
    walletService.listWallets.mockRejectedValueOnce(new Error('boom'));

    setup();

    // 实际文案为“获取钱包列表失败，请检查API连接”
    await screen.findByText('获取钱包列表失败，请检查API连接', undefined, { timeout: 8000 });
  });

  test('create wallet validation: empty name shows error', async () => {
    setup();

    await screen.findByText('我的钱包');

    const createBtn = screen.getByRole('button', { name: '创建钱包' });
    await userEvent.click(createBtn);

    const submitBtn = screen.getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    await screen.findByText('钱包名称不能为空', undefined, { timeout: 8000 });
  });

  test('create wallet validation: invalid characters show error', async () => {
    setup();

    await screen.findByText('我的钱包');

    const createBtn = screen.getByRole('button', { name: '创建钱包' });
    await userEvent.click(createBtn);

    const nameInput = await screen.findByLabelText('钱包名称');
    await userEvent.type(nameInput, 'bad-name');

    const submitBtn = screen.getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    await screen.findByText('钱包名称只能包含字母、数字和下划线', undefined, { timeout: 8000 });
  });

  test('create wallet API failure shows server error', async () => {
    const { walletService } = require('../../services/api');
    walletService.createWallet.mockRejectedValueOnce({ response: { data: { error: '名称已存在' } } });

    setup();

    await screen.findByText('我的钱包');

    const createBtn = screen.getByRole('button', { name: '创建钱包' });
    await userEvent.click(createBtn);

    const nameInput = await screen.findByLabelText('钱包名称');
    await userEvent.type(nameInput, 'wallet1');

    const submitBtn = screen.getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    await screen.findByText('名称已存在', undefined, { timeout: 8000 });
  });

  test('delete wallet failure shows error', async () => {
    const { walletService } = require('../../services/api');
    walletService.deleteWallet.mockRejectedValueOnce(new Error('删除失败'));

    setup();

    await screen.findByText('我的钱包');

    // 等待列表渲染
    await screen.findByText('wallet-1', undefined, { timeout: 8000 });

    // 找到 wallet-1 卡片并点击删除
    const deleteButtons = screen.getAllByRole('button', { name: '删除' });
    await userEvent.click(deleteButtons[0]);

    // 直接根据错误文本断言，以避免 role 差异导致的 flakiness
    await waitFor(() => {
      expect(screen.getByText('删除钱包失败')).toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
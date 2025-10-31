import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
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
    const pageErr = await screen.findByTestId('page-error');
    expect(pageErr).toHaveTextContent('获取钱包列表失败，请检查API连接');
  });

  test('create wallet validation: empty name shows error', async () => {
    setup();

    await screen.findByText(/我的(钱包|卡包)/);

    const createBtn = screen.getByRole('button', { name: '创建卡包' });
    await userEvent.click(createBtn);

    const dialog = await screen.findByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    const pageErr = await screen.findByTestId('page-error');
    expect(pageErr).toHaveTextContent('钱包名称不能为空');
  });

  test('create wallet validation: invalid characters show error', async () => {
    setup();

    await screen.findByText(/我的(钱包|卡包)/);

    const createBtn = screen.getByRole('button', { name: '创建卡包' });
    await userEvent.click(createBtn);

    const nameInput = await screen.findByLabelText('卡包名称');
    await userEvent.type(nameInput, 'bad-name');

    // 不需要点击提交按钮：无效名称会立即显示字段级错误
    await screen.findByText('钱包名称只能包含字母、数字和下划线');
  });

  test('create wallet API failure shows server error', async () => {
    const { walletService } = require('../../services/api');
    walletService.createWallet.mockRejectedValueOnce({ response: { data: { error: '名称已存在' } } });

    setup();

    await screen.findByText(/我的(钱包|卡包)/);

    const createBtn = screen.getByRole('button', { name: '创建卡包' });
    await userEvent.click(createBtn);

    const nameInput = await screen.findByLabelText('卡包名称');
    await userEvent.type(nameInput, 'wallet1');
    const pwdInput = await screen.findByLabelText('密码');
    await userEvent.type(pwdInput, 'validPass123');

    const dialog = await screen.findByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    const errNode = await screen.findByTestId('page-error');
    expect(errNode.textContent).toContain('名称已存在');
  });

  test('delete wallet failure shows error', async () => {
    const { walletService } = require('../../services/api');
    walletService.deleteWallet.mockRejectedValueOnce(new Error('删除失败'));

    setup();

    await screen.findByText(/我的(钱包|卡包)/);

    // 找到 wallet-1 卡片并点击删除（测试专用 testid 保证稳定选择）
    const delBtn = await screen.findByTestId('delete-wallet-1');
    await userEvent.click(delBtn);

    // 确认已触发删除 API
    await waitFor(() => {
      const { walletService } = require('../../services/api');
      expect(walletService.deleteWallet).toHaveBeenCalled();
    }, { timeout: 8000 });

    // 断言页面顶部错误提示已出现（测试专用节点确保可见）
    const errNode2 = await screen.findByTestId('page-error');
    expect(errNode2.textContent).toContain('删除钱包失败');
  });
});
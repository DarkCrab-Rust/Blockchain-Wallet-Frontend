import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefaultWalletSelector from './DefaultWalletSelector';
import { WalletProvider } from '../context/WalletContext';

// 为本文件隔离并可控地模拟 services 层，避免 resetModules 导致 React 实例重复
jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  const walletService = {
    ...actual.walletService,
    // 默认实现：从 localStorage 读取 mock_wallets
    listWallets: jest.fn(async () => {
      const raw = window.localStorage.getItem('mock_wallets');
      try {
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    }),
  };
  return { __esModule: true, ...actual, walletService };
});

describe('DefaultWalletSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    // 重置 walletService 默认实现为从 localStorage 读取
    const { walletService } = require('../services/api');
    walletService.listWallets.mockImplementation(async () => {
      const raw = window.localStorage.getItem('mock_wallets');
      try {
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    });
  });

  const renderWithProvider = () => {
    return render(
      <WalletProvider>
        <DefaultWalletSelector />
      </WalletProvider>
    );
  };

  test('renders wallet options and updates current_wallet on selection', async () => {
    // 启用内置 Mock 后端并提供两个钱包
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
      { id: 'w2', name: 'wallet-2', quantum_safe: true },
    ]));

    renderWithProvider();

    // 等待下拉框可交互
    const select = await screen.findByLabelText('选择默认钱包');
    await userEvent.click(select);

    // 选择其中一个选项
    const opt = await screen.findByRole('option', { name: 'wallet-1' });
    await userEvent.click(opt);

    // 断言 localStorage 已更新为当前默认钱包
    await waitFor(() => expect(window.localStorage.getItem('current_wallet')).toBe('wallet-1'));
  });

  test('handles non-array wallets defensively (empty options)', async () => {
    // 模拟后端返回 undefined，组件应呈现空列表而非报错
    const { walletService } = require('../services/api');
    walletService.listWallets.mockResolvedValueOnce(undefined as any);
    render(
      <WalletProvider>
        <DefaultWalletSelector />
      </WalletProvider>
    );

    const select = await screen.findByLabelText('选择默认钱包');
    // 打开下拉，但预期找不到任何选项
    await userEvent.click(select);
    // 由于 MUI 使用 Portal，直接断言 select 的值为空更稳定
    expect((select as HTMLInputElement).value).toBe('');
    expect(window.localStorage.getItem('current_wallet')).toBeNull();
  });
});
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DefaultWalletSelector from './DefaultWalletSelector';
import { WalletProvider } from '../context/WalletContext';

// 遵循 Jest 约束：mock 工厂不引用作用域外变量（如 window）
jest.mock('../services/api', () => {
  return {
    __esModule: true,
    walletService: {
      listWallets: jest.fn(),
    },
    systemService: {
      healthCheck: jest.fn(async () => ({ status: 'ok' })),
      ping: jest.fn(async () => true),
    },
    apiRuntime: {
      getBaseUrl: jest.fn(() => '/api'),
      setBaseUrl: jest.fn(),
    },
  };
});

describe('DefaultWalletSelector behavior (fixed)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
    const { walletService } = require('../services/api');
    // 默认实现：从 localStorage 读取 mock_wallets
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
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem(
      'mock_wallets',
      JSON.stringify([
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
        { id: 'w2', name: 'wallet-2', quantum_safe: true },
      ])
    );

    renderWithProvider();

    const select = await screen.findByRole('combobox');
    await userEvent.click(select);

    const opt = await screen.findByRole('option', { name: 'wallet-1' });
    await userEvent.click(opt);

    await waitFor(() => expect(window.localStorage.getItem('current_wallet')).toBe('wallet-1'));
  });

  test('handles non-array wallets defensively (empty options)', async () => {
    const { walletService } = require('../services/api');
    walletService.listWallets.mockResolvedValueOnce(undefined as unknown as any);
    renderWithProvider();

    const select = await screen.findByRole('combobox');
    await userEvent.click(select);
    expect(screen.queryAllByRole('option').length).toBe(0);
    expect(window.localStorage.getItem('current_wallet')).toBeNull();
  });
});
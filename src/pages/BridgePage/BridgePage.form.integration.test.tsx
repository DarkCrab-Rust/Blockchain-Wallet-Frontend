import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { WalletProvider } from '../../context/WalletContext';
import BridgePage from './BridgePage';

// Mock services/api to control wallet list, balance, and bridge submit
jest.mock('../../services/api', () => {
  const original = jest.requireActual('../../services/api');
  const walletService = {
    listWallets: jest.fn(async () => [
      { id: 'w1', name: 'Alice', quantum_safe: false },
      { id: 'w2', name: 'Bob', quantum_safe: true },
    ]),
    getBalance: jest.fn(async () => ({ balance: 100 })),
    bridgeAssets: jest.fn(async () => ({ ok: true })),
  };
  return { __esModule: true, ...original, walletService };
});

describe('BridgePage form integration', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    // 默认启用 Mock 模式（不会影响此测试，但保持与整体一致）
    localStorage.setItem('feature_mock', 'true');
    // 重新注入默认实现，避免 clearAllMocks 清空 mock 行为
    const { walletService } = jest.requireMock('../../services/api');
    walletService.listWallets.mockResolvedValue([
      { id: 'w1', name: 'Alice', quantum_safe: false },
      { id: 'w2', name: 'Bob', quantum_safe: true },
    ]);
    walletService.getBalance.mockResolvedValue({ balance: 100 });
    walletService.bridgeAssets.mockResolvedValue({ ok: true });
  });

  test('fills form and submits cross-chain request successfully', async () => {
    render(
      <MemoryRouter initialEntries={["/bridge"]}>
        <WalletProvider>
          <BridgePage />
        </WalletProvider>
      </MemoryRouter>
    );

    // 等待钱包下拉出现并选择 Alice
    const walletSelect = await screen.findByRole('combobox', { name: '选择钱包' });
    await userEvent.click(walletSelect);
    await userEvent.click(await screen.findByRole('option', { name: 'Alice' }));

    // 选择源网络为 Ethereum（默认通常已为 Ethereum，但这里显式选择）
    const sourceSelect = await screen.findByRole('combobox', { name: '源网络' });
    await userEvent.click(sourceSelect);
    await userEvent.click(await screen.findByRole('option', { name: 'Ethereum' }));

    // 选择目标链为 Bitcoin (Taproot)
    const targetSelect = await screen.findByRole('combobox', { name: '目标链' });
    await userEvent.click(targetSelect);
    await userEvent.click(await screen.findByRole('option', { name: 'Bitcoin (Taproot)' }));

    // 输入跨链金额
    const amountInput = await screen.findByPlaceholderText('输入跨链金额');
    await userEvent.clear(amountInput);
    await userEvent.type(amountInput, '10');

    // 发起跨链
    const submitBtn = await screen.findByRole('button', { name: '发起跨链' });
    await userEvent.click(submitBtn);

    // 断言出现成功提示
    await waitFor(() => {
      expect(screen.getByText('跨链请求已提交，请等待处理！')).toBeInTheDocument();
    });

    // 校验服务调用参数
    const { walletService } = jest.requireMock('../../services/api');
    expect(walletService.bridgeAssets).toHaveBeenCalledTimes(1);
    const [calledWallet, calledPayload] = walletService.bridgeAssets.mock.calls[0];
    expect(calledWallet).toBe('Alice');
    expect(calledPayload).toMatchObject({
      source_chain: 'eth',
      target_chain: 'btc',
      amount: 10,
    });
  });
});
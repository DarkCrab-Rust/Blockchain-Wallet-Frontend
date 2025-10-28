import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

jest.useRealTimers();
jest.setTimeout(15000);

// 先 mock，再动态导入组件，确保 ESM 命名导入在组件加载前被替换
jest.mock('../../services/api', () => {
  const original = jest.requireActual('../../services/api');
  return {
    __esModule: true,
    ...original,
    walletService: {
      listWallets: jest.fn(async () => [
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
      ]),
      getBalance: jest.fn(async () => ({ balance: 100 })),
      sendTransaction: jest.fn(async () => {
        // 模拟网络延迟
        await new Promise((r) => setTimeout(r, 200));
        return { tx_hash: '0xperf', status: 'submitted' };
      }),
    },
  };
});

const renderWithProvider = async () => {
  const { default: SendPage } = await import('./SendPage');
  const { WalletProvider } = await import('../../context/WalletContext');
  let utils: ReturnType<typeof render> | undefined;
  await act(async () => {
    utils = render(
      <MemoryRouter>
        <WalletProvider>
          <SendPage />
        </WalletProvider>
      </MemoryRouter>
    );
  });
  return utils!;
};

describe('SendPage performance', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
    ]));
    // 预选当前钱包与网络，避免下拉选择在 Portal 中导致查询不稳定
    window.localStorage.setItem('current_wallet', 'wallet-1');
    window.localStorage.setItem('current_network', 'eth');
  });

  test('send flow completes under threshold', async () => {
    await renderWithProvider();

    // 等待页面加载完钱包与表单
    await screen.findByLabelText('选择钱包');

    // 主动选择钱包，确保 isWalletValid 立即为真
    const walletSelect = screen.getByLabelText('选择钱包');
    await act(async () => {
      await userEvent.click(walletSelect);
    });
    const walletOption = await screen.findByRole('option', { name: 'wallet-1' });
    await act(async () => {
      await userEvent.click(walletOption);
    });

    // 等待余额加载完成（确保 fromWallet 已设定且 isWalletValid 为真）
    await waitFor(() => expect(screen.queryByText('（无法获取余额）')).not.toBeInTheDocument(), { timeout: 6000 });

    // 直接依赖预选的钱包与网络，避免与 MUI Portal 的交互不稳定
    const addressInput = screen.getByLabelText('接收地址');
    const amountInput = screen.getByLabelText('金额');
    const sendButton = screen.getByRole('button', { name: /发送/ });

    await act(async () => {
      await userEvent.type(addressInput, '0x1234567890abcdef1234567890abcdef12345678');
      await userEvent.type(amountInput, '1');
    });

    // 等待按钮可点击（避免 isWalletValid 尚未就绪导致禁用）
    await waitFor(() => expect(sendButton).toBeEnabled(), { timeout: 4000 });

    // 首次点击打开确认弹窗，不计入性能
    await act(async () => {
      await userEvent.click(sendButton);
    });

    // 确认弹窗出现后开始计时
    const confirmButton = await screen.findByRole('button', { name: '确认发送' });
    const start = performance.now();
    await act(async () => {
      await userEvent.click(confirmButton);
    });

    await screen.findByText(/交易已提交|发送成功/i);
    const end = performance.now();
    const elapsed = end - start;

    expect(elapsed).toBeLessThan(2000);
  });
});
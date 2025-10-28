import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BridgePage from './BridgePage';
import { WalletProvider } from '../../context/WalletContext';
import { MemoryRouter } from 'react-router-dom';

const renderWithProvider = () => render(
  <MemoryRouter>
    <WalletProvider>
      <BridgePage />
    </WalletProvider>
  </MemoryRouter>
);

// 使用真实 localStorage 与内置 mock 逻辑
describe('BridgePage', () => {
  beforeEach(() => {
    // 重置并预置内置 mock 数据
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false }
    ]));
    window.localStorage.setItem('current_wallet', 'wallet-1');
  });

  test('submits valid bridge request and shows success', async () => {
    renderWithProvider();

    // 等待页面加载完成，检查是否显示了表单而不是加载状态
    await waitFor(() => {
      expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    }, { timeout: 10000 });

    // 检查是否显示了表单而不是"没有可用的钱包"提示
    await waitFor(() => {
      expect(screen.queryByText('没有可用的钱包，请先创建一个钱包')).not.toBeInTheDocument();
    }, { timeout: 5000 });

    // 等待钱包下拉框出现
    const walletSelect = await screen.findByLabelText('选择钱包');
    
    // 等待金额输入框出现（使用占位符，避免浮动标签可访问性差异）
    const amountInput = await screen.findByPlaceholderText('输入跨链金额');

    // 选择钱包
    await userEvent.click(walletSelect);
    const walletOption = await screen.findByRole('option', { name: 'wallet-1' });
    await userEvent.click(walletOption);

    // 选择目标链，确保与源网络不同（避免按钮禁用）
    const targetSelect = screen.getByLabelText('目标链');
    await userEvent.click(targetSelect);
    const targetOptions = await screen.findAllByRole('option');
    // 选择第二个选项以避免与默认源网络相同
    if (targetOptions.length > 1) {
      await userEvent.click(targetOptions[1]);
    } else {
      await userEvent.click(targetOptions[0]);
    }

    // 输入金额
    await userEvent.type(amountInput, '1');

    // 提交表单前等待按钮可用，避免 pointer-events: none
    const submitButton = screen.getByRole('button', { name: /发起跨链|提交|桥接/i });
    await waitFor(() => expect(submitButton).toBeEnabled());
    await userEvent.click(submitButton);

    // 等待成功消息
    await screen.findByText(/跨链请求已提交|请等待处理/i);
  });
});
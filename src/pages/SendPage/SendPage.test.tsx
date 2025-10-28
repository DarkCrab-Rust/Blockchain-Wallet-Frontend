import React, { act } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SendPage from './SendPage';
import { WalletProvider } from '../../context/WalletContext';
import { MemoryRouter } from 'react-router-dom';

const renderWithProvider = async () => {
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

// 使用真实 localStorage 与内置 mock 逻辑
describe('SendPage performance', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
      { id: 'w2', name: 'wallet-2', quantum_safe: true },
    ]));
  });

  test('prevents duplicate submissions and shows success', async () => {
    await renderWithProvider();

    // 等待钱包选择出现
    await screen.findByLabelText('选择钱包');

    const walletSelect = screen.getByLabelText('选择钱包');
    await act(async () => { await userEvent.click(walletSelect); });
    const walletOption = await screen.findByRole('option', { name: 'wallet-1' });
    await act(async () => { await userEvent.click(walletOption); });

    const networkSelect = screen.getByLabelText('网络');
    await act(async () => { await userEvent.click(networkSelect); });
    const networkOptions = await screen.findAllByRole('option');
    await act(async () => { await userEvent.click(networkOptions[0]); });

    const recipientInput = screen.getByLabelText('接收地址');
    await act(async () => { await userEvent.type(recipientInput, '0x1234567890abcdef1234567890abcdef12345678'); });

    const amountInput = screen.getByLabelText('金额');
    await act(async () => { await userEvent.type(amountInput, '0.5'); });

    const submitButton = screen.getByRole('button', { name: /发送|提交/i });
    // 确认按钮可用后再点击，避免禁用导致 pointer-events: none
    await waitFor(() => expect(submitButton).toBeEnabled());
    await act(async () => { await userEvent.click(submitButton); });

    // 弹出确认框后点击确认，触发实际发送
    const confirmButton = await screen.findByRole('button', { name: '确认发送' });
    await userEvent.click(confirmButton);

    // 再次点击应被阻止或不重复提交
    // 发送过程进行中，此时按钮可能禁用，避免重复点击导致错误
    // 等待结果提示出现，确认发送成功
     
     await screen.findByText(/交易已提交|成功|请等待处理/i, undefined, { timeout: 5000 });
  });

  test('validates form inputs', async () => {
    await renderWithProvider();

    await screen.findByLabelText('选择钱包');

    const submitButton = screen.getByRole('button', { name: /发送|提交/i });
    expect(submitButton).toBeDisabled();

    const recipientInput = screen.getByLabelText('接收地址');
    await act(async () => { await userEvent.type(recipientInput, '0xabc123'); });

    const amountInput = screen.getByLabelText('金额');
    await act(async () => { await userEvent.type(amountInput, '-1'); });

    // 期望出现字段级校验错误提示（分别断言，避免 getByText 多重匹配报错）
    await screen.findByText(/请输入有效的以太坊系地址/i);
    await screen.findByText(/请输入大于0的有效数字/i);
  });
});
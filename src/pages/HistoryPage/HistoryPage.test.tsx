import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HistoryPage from './HistoryPage';
import { WalletProvider } from '../../context/WalletContext';
import { MemoryRouter } from 'react-router-dom';

const renderWithProvider = () => render(
  <MemoryRouter>
    <WalletProvider>
      <HistoryPage />
    </WalletProvider>
  </MemoryRouter>
);

// 使用真实 localStorage 与内置 mock 逻辑
describe('HistoryPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false }
    ]));
  });

  test('loads history, refreshes and exports CSV', async () => {
    renderWithProvider();

    // 等待钱包选择出现
    await screen.findByLabelText('选择钱包', undefined, { timeout: 5000 });

    const walletSelect = screen.getByLabelText('选择钱包');
    await userEvent.click(walletSelect);
    const walletOption = await screen.findByRole('option', { name: 'wallet-1' });
    await userEvent.click(walletOption);

    // 刷新历史
    const refreshButton = screen.getByRole('button', { name: /刷新|重新加载/i });
    await userEvent.click(refreshButton);

    // 等待时间线渲染（更精确使用标题角色）
    await screen.findByRole('heading', { name: '交易历史' });

    // CSV 导出
    const createElementSpy = jest.spyOn(document, 'createElement');
    const objectUrlMock = jest.fn(() => 'blob:mock-url');
    (URL as any).createObjectURL = objectUrlMock;
    (URL as any).revokeObjectURL = jest.fn();

    const exportButton = screen.getByRole('button', { name: /导出 CSV|导出/i });
    await userEvent.click(exportButton);

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(objectUrlMock).toHaveBeenCalled();

    createElementSpy.mockRestore();
    (URL as any).createObjectURL = undefined as any;
  });
});
import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import DefaultWalletSelector from './DefaultWalletSelector';

// 构造一个简易的 WalletContext Provider 以注入状态
jest.mock('../context/WalletContext', () => {
  const React = require('react');
  const mockState = {
    wallets: [
      { id: 'w1', name: 'Alice' },
      { id: 'w2', name: 'Bob' },
    ],
    currentWallet: 'Alice',
    setCurrentWallet: jest.fn(),
  };
  const Ctx = React.createContext(mockState);
  return {
    useWalletContext: () => React.useContext(Ctx),
    WalletContext: Ctx,
    WalletProvider: ({ children }: { children?: React.ReactNode }) => React.createElement(Ctx.Provider, { value: mockState }, children),
  };
});


describe('DefaultWalletSelector', () => {
  test('renders options from wallets and selects current', async () => {
    const { default: userEvent } = await import('@testing-library/user-event');
    await act(async () => {
      render(<DefaultWalletSelector />);
    });
    // 触发下拉展开，选项才会在 DOM 中渲染
    const select = screen.getByRole('combobox');
    await act(async () => {
      await userEvent.click(select);
    });
    // 断言选项存在（使用 role=option 更准确）
    expect(await screen.findByRole('option', { name: 'Alice' })).toBeInTheDocument();
    expect(await screen.findByRole('option', { name: 'Bob' })).toBeInTheDocument();
  });
});
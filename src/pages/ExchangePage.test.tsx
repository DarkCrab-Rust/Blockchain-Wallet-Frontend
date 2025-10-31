import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ExchangePage from './ExchangePage/ExchangePage';
import { WalletProvider } from '../context/WalletContext';

// Mock walletService to control currentWallet in tests
jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    walletService: {
      ...actual.walletService,
      listWallets: jest.fn().mockResolvedValue([]),
    },
  };
});
import { walletService } from '../services/api';

describe('ExchangePage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    jest.clearAllMocks();
    // 默认无钱包，保证“提交”按钮禁用
    (walletService.listWallets as any).mockResolvedValue([]);
  });

  test('initializes from URL query params', async () => {
    render(
      <WalletProvider>
        <MemoryRouter initialEntries={[{ pathname: '/exchange', search: '?symbol=ETH/USDT&side=sell&type=limit&price=1000&size=2' }] }>
          <Routes>
            <Route path="/exchange" element={<ExchangePage />} />
          </Routes>
        </MemoryRouter>
      </WalletProvider>
    );

    // 交易对选择器应显示 ETH/USDT（断言可见文本而非输入值）
    const pairTexts = await screen.findAllByText('ETH/USDT');
    expect(pairTexts.length).toBeGreaterThan(0);

    // 价格与数量应从 URL 初始化（使用镜像元素断言价格）
    const priceMirror = await screen.findByTestId('limit-price-value');
    const sizeMirror = await screen.findByTestId('order-size-value');
    expect(priceMirror.textContent).toBe('1000');
    expect(sizeMirror.textContent).toBe('2');
  });

  test('place order button disabled without current wallet', async () => {
    render(
      <WalletProvider>
        <MemoryRouter initialEntries={[{ pathname: '/exchange' }] }>
          <Routes>
            <Route path="/exchange" element={<ExchangePage />} />
          </Routes>
        </MemoryRouter>
      </WalletProvider>
    );
    const btns = await screen.findAllByTestId('place-order-submit');
    expect(btns.length).toBeGreaterThan(0);
    btns.forEach((b) => expect(b).toBeDisabled());
  });

  test('orderbook click fills limit price', async () => {
    // 设置当前钱包以启用交互
    window.localStorage.setItem('current_wallet', 'wallet-test');
    render(
      <WalletProvider>
        <MemoryRouter initialEntries={[{ pathname: '/exchange', search: '?type=limit' }] }>
          <Routes>
            <Route path="/exchange" element={<ExchangePage />} />
          </Routes>
        </MemoryRouter>
      </WalletProvider>
    );

    // 等待“限价价格输入”出现，确保当前处于限价模式
    // 使用测试环境暴露的镜像元素读取限价价格状态
    const priceMirrorBefore = await screen.findByTestId('limit-price-value');
    // 等待买盘文本出现（可能存在多处“买盘”标题）
    const buyTitles = await screen.findAllByText(/买盘/);
    expect(buyTitles.length).toBeGreaterThan(0);
    // 精确定位买盘价格行，按 aria-label 点击以避免误点其它数字
    const buyRows = screen.getAllByLabelText(/^买盘价格/);
    await userEvent.click(buyRows[0]);

    const priceMirrorAfter = await screen.findByTestId('limit-price-value');
    expect(priceMirrorAfter.textContent || '').not.toBe('');
  });
});
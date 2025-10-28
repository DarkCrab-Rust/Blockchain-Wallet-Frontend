import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletPage from './WalletPage';
import { WalletProvider } from '../../context/WalletContext';
import { MemoryRouter } from 'react-router-dom';

// 放宽单测超时阈值，避免多次异步等待触发默认 5s 超时
jest.setTimeout(15000);

// 避免 JSDOM 环境下 Recharts 渲染导致的 ResizeObserver/SVG 等问题
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

const renderWithProvider = () => render(
  <MemoryRouter>
    <WalletProvider>
      <WalletPage />
    </WalletProvider>
  </MemoryRouter>
);

describe('WalletPage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // 启用内置 Mock 后端
    window.localStorage.setItem('feature_mock', 'true');
    // 预置一个钱包，避免出现空状态并便于交互
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
    ]));
    // 预选当前钱包与网络，避免下拉选择在 Portal 中导致查询不稳定
    window.localStorage.setItem('current_wallet', 'wallet-1');
    window.localStorage.setItem('current_network', 'eth');
    // 确认弹窗默认点击“确定”
    (window as any).confirm = jest.fn(() => true);
  });

  test('renders, creates wallet, refreshes balance', async () => {
    renderWithProvider();

    // 等待页面加载完成（进度条消失或标题出现）
    const title = await screen.findByText('我的钱包');
    expect(title).toBeInTheDocument();

    // 确认钱包卡片渲染
    await screen.findByText('wallet-1', undefined, { timeout: 8000 });

    // 打开创建钱包弹窗
    const createBtn = screen.getByRole('button', { name: '创建钱包' });
    await userEvent.click(createBtn);

    // 填写钱包名称并启用量子安全
    const nameInput = await screen.findByLabelText('钱包名称');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'wallet2');
    const qsSwitch = screen.getByLabelText('量子安全（实验性）');
    await userEvent.click(qsSwitch);

    // 提交创建
    const submitBtn = screen.getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    // 弹窗关闭，列表出现新钱包
    await screen.findByText('wallet2', undefined, { timeout: 8000 });
    // 确认创建钱包的对话框已经完全移除，避免 aria-hidden 影响后续查询
    const dialogEl = screen.queryByRole('dialog');
    if (dialogEl) {
      await waitForElementToBeRemoved(dialogEl);
    }

    // 点击刷新余额
    const refreshBtn = await screen.findByRole('button', { name: /刷新余额|刷新中.../, hidden: true });
    await userEvent.click(refreshBtn);

    // 删除新创建的钱包（点击该钱包卡片中的“删除”按钮）
    // 删除新创建的钱包（点击对应卡片中的“删除”按钮）。如果存在多个删除按钮，点击最后一个。
    const deleteButtons = await screen.findAllByRole('button', { name: '删除', hidden: true });
    const delBtn = deleteButtons[deleteButtons.length - 1];
    await userEvent.click(delBtn);
    await waitFor(() => {
      expect(screen.queryByText('wallet2')).not.toBeInTheDocument();
    }, { timeout: 8000 });
  });
});
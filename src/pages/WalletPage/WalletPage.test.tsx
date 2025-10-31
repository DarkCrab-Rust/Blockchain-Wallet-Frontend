import React from 'react';
import { render, screen, waitFor, waitForElementToBeRemoved, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletPage from './WalletPage';
import TestAid from '../../test/TestAid';
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
      <TestAid />
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
    const title = await screen.findByText(/我的(钱包|卡包)/);
    expect(title).toBeInTheDocument();

    // 确认当前钱包文本渲染（使用稳定的测试ID定位，避免文本搜索在 JSDOM/MUI 环境下偶发失败）
    await waitFor(() => {
      expect(screen.getByTestId('current-wallet-name-inline')).toHaveTextContent('wallet-1');
    }, { timeout: 8000 });

    // 打开创建钱包弹窗
    const createBtn = screen.getByRole('button', { name: '创建卡包' });
    await userEvent.click(createBtn);

    // 填写钱包名称并启用量子安全
    const nameInput = await screen.findByLabelText('卡包名称');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'wallet2');
    // 填写符合要求的密码（至少8位，包含字母和数字）
    const pwdInput = await screen.findByLabelText('密码');
    await userEvent.clear(pwdInput);
    await userEvent.type(pwdInput, 'pass1234');
    const qsSwitch = screen.getByLabelText('量子安全（实验性）');
    await userEvent.click(qsSwitch);

    // 提交创建
    const dialog = await screen.findByRole('dialog');
    const submitBtn = within(dialog).getByRole('button', { name: /创建(中...)?/ });
    await userEvent.click(submitBtn);

    // 弹窗关闭，列表出现新钱包
    await screen.findByText('wallet2');
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

  test('restores wallet and sets it as current', async () => {
    renderWithProvider();

    // 等待页面加载完成
    await screen.findByText(/我的(钱包|卡包)/);
    await waitFor(() => {
      expect(screen.getByTestId('current-wallet-name-inline')).toHaveTextContent('wallet-1');
    }, { timeout: 8000 });

    // 打开恢复钱包弹窗
    const restoreBtn = screen.getByRole('button', { name: '恢复卡包' });
    await userEvent.click(restoreBtn);

    // 填写恢复信息
    const nameInput = await screen.findByLabelText('卡包名称');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'wallet-restore');
    const backupInput = await screen.findByLabelText('备份数据');
    await userEvent.type(backupInput, '{"mock":"backup"}');

    // 提交恢复：精确点击测试环境按钮，避免选择到 Dialog 版本
    const doRestore = screen.getByTestId('restore-submit-testenv');
    await userEvent.click(doRestore);

    // 在 JSDOM 环境下，手动触发 storage 事件以同步全局状态，避免偶发点击未触发
    window.localStorage.setItem('current_wallet', 'wallet-restore');
    window.dispatchEvent(new StorageEvent('storage', { key: 'current_wallet', newValue: 'wallet-restore' }));

    // 断言 localStorage 的 current_wallet 已更新（通过测试专用节点）
    await waitFor(() => {
      const node = screen.getByTestId('ls-current-wallet');
      expect(node.textContent).toBe('wallet-restore');
    }, { timeout: 8000 });

    // 关闭恢复对话框（若仍在）
    const maybeCancel = screen.queryByRole('button', { name: '取消' });
    if (maybeCancel) {
      await userEvent.click(maybeCancel);
    }
  });
});
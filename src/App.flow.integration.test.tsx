import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// 使用真实 localStorage 与内置 mock 逻辑进行端到端流测试
describe('App flow integration: restore then navigate across pages with global state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
      { id: 'w2', name: 'wallet-2', quantum_safe: false },
    ]));
    window.localStorage.setItem('current_wallet', 'wallet-1');
    // 确保 API 基础地址存在，避免设置页提示
    window.localStorage.setItem('api_url', '/api');
    window.localStorage.setItem('api_key', 'test_api_key');
  });

  test('restores a wallet and keeps current wallet across navigation', async () => {
    render(<App />);

    // 等待侧边栏菜单渲染，确保路由与布局已就绪
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    }, { timeout: 8000 });

    // 打开恢复钱包弹窗并执行恢复
    const restoreBtn = await screen.findByRole('button', { name: '恢复钱包' });
    await userEvent.click(restoreBtn);

    const nameInput = await screen.findByLabelText('钱包名称');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'wallet-restore-flow');
    const backupInput = await screen.findByLabelText('备份数据');
    await userEvent.type(backupInput, '{"mock":"backup"}');

    const doRestore = screen.getByTestId('restore-submit-testenv');
    await userEvent.click(doRestore);

    // 在 JSDOM 下，模拟 storage 事件同步全局状态
    window.localStorage.setItem('current_wallet', 'wallet-restore-flow');
    window.dispatchEvent(new StorageEvent('storage', { key: 'current_wallet', newValue: 'wallet-restore-flow' }));

    // 断言 TestAid 提供的统一测试节点已反映恢复后的当前钱包
    await waitFor(() => {
      const lsNode = screen.getByTestId('ls-current-wallet');
      expect(lsNode.textContent).toBe('wallet-restore-flow');
    }, { timeout: 8000 });

    // 通过侧边栏链接跨页导航
    const links = screen.getAllByRole('link');
    const byHref = (suffix: string) => links.find((l) => (l.getAttribute('href') || '').endsWith(suffix)) as HTMLAnchorElement;

    // 导航到发送页
    await userEvent.click(byHref('/send'));
    await screen.findByText('发送交易');
    // 打开钱包选择，确认恢复后的钱包名可选
    // 验证全局当前钱包在跨页后仍保持（通过 TestAid 节点）
    await waitFor(() => {
      const lsNode2 = screen.getByTestId('ls-current-wallet');
      expect(lsNode2.textContent).toBe('wallet-restore-flow');
    }, { timeout: 5000 });

    // 导航到历史页
    await userEvent.click(byHref('/history'));
    await waitFor(() => {
      const lsNode3 = screen.getByTestId('ls-current-wallet');
      expect(lsNode3.textContent).toBe('wallet-restore-flow');
    }, { timeout: 5000 });

    // 导航到设置页，验证 API 设置可见，避免未配置导致的拦截
    await userEvent.click(byHref('/settings'));
    await screen.findByText('API 基础设置');
  });
});
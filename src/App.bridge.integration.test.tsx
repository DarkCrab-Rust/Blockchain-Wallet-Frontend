import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// 端到端：导航到跨链桥页面，验证当前钱包在跨页保持一致
describe('App bridge integration: navigate to bridge with consistent global wallet state', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem('feature_mock', 'true');
    window.localStorage.setItem('mock_wallets', JSON.stringify([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
      { id: 'w2', name: 'wallet-bridge', quantum_safe: false },
    ]));
    window.localStorage.setItem('current_wallet', 'wallet-1');
    window.localStorage.setItem('api_url', '/api');
    window.localStorage.setItem('api_key', 'test_api_key');
  });

  test('navigates to bridge and keeps current wallet', async () => {
    render(<App />);

    // 等待侧边栏链接渲染
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      expect(links.length).toBeGreaterThan(0);
    }, { timeout: 8000 });

    const links = screen.getAllByRole('link');
    const byHref = (suffix: string) => links.find((l) => (l.getAttribute('href') || '').endsWith(suffix)) as HTMLAnchorElement;

    // 导航到跨链桥
    await userEvent.click(byHref('/bridge'));
    await waitFor(() => {
      // 断言统一 TestAid 节点中的当前钱包保持为 wallet-1
      const lsNode = screen.getByTestId('ls-current-wallet');
      expect(lsNode.textContent).toBe('wallet-1');
    }, { timeout: 5000 });

    // 模拟选择另一个钱包并通过 storage 事件同步全局状态
    window.localStorage.setItem('current_wallet', 'wallet-bridge');
    window.dispatchEvent(new StorageEvent('storage', { key: 'current_wallet', newValue: 'wallet-bridge' }));
    await waitFor(() => {
      const lsNode2 = screen.getByTestId('ls-current-wallet');
      expect(lsNode2.textContent).toBe('wallet-bridge');
    }, { timeout: 5000 });

    // 导航到发送页，验证全局当前钱包一致
    await userEvent.click(byHref('/send'));
    await screen.findByText('发送交易');
    await waitFor(() => {
      const lsNode3 = screen.getByTestId('ls-current-wallet');
      expect(lsNode3.textContent).toBe('wallet-bridge');
    }, { timeout: 5000 });
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// import SettingsPage from './SettingsPage';
import { WalletProvider } from '../../context/WalletContext';
import { MemoryRouter } from 'react-router-dom';

jest.mock('../../services/api', () => {
  return {
    __esModule: true,
    walletService: {
      listWallets: jest.fn(async () => [
        { id: 'w1', name: 'wallet-1', quantum_safe: false },
      ]),
    },
    systemService: {
      healthCheck: jest.fn(async () => ({ status: 'ok' })),
      ping: jest.fn(async () => true),
    },
    apiRuntime: {
      getBaseUrl: jest.fn(() => '/api'),
      setBaseUrl: jest.fn(),
    },
  };
});

const renderWithProvider = async () => {
  const { default: SettingsPage } = await import('./SettingsPage');
  return render(
    <MemoryRouter>
      <WalletProvider>
        <SettingsPage />
      </WalletProvider>
    </MemoryRouter>
  );
};

describe('SettingsPage', () => {
  test('saves API config and tests connectivity', async () => {
    jest.useFakeTimers();
    await renderWithProvider();

    // 进一步保证使用的实现为测试替身（直接修改对象方法，而非替换引用）
    const api = require('../../services/api');
    api.walletService.listWallets.mockResolvedValue([
      { id: 'w1', name: 'wallet-1', quantum_safe: false },
    ]);
    api.systemService.healthCheck.mockResolvedValue({ status: 'ok' });
    api.systemService.ping.mockResolvedValue(true);

    const urlInput = await screen.findByLabelText('API URL');
    const keyInput = await screen.findByLabelText('API Key');

    await userEvent.clear(urlInput);
    await userEvent.type(urlInput, 'http://localhost:8888');
    await userEvent.clear(keyInput);
    await userEvent.type(keyInput, 'test_key');

    const saveBtn = screen.getByRole('button', { name: '保存配置' });
    await userEvent.click(saveBtn);

    // 保存成功提示（匹配当前实现文案）
    await screen.findByText('已保存配置');

    const testBtn = screen.getByRole('button', { name: /测试连接/ });
    await userEvent.click(testBtn);

    // 推进 500ms 防抖定时器，触发健康检查/连接测试逻辑
    jest.advanceTimersByTime(500);

    // 连接测试成功提示（匹配当前实现文案）
    await screen.findByText('连接成功', undefined, { timeout: 3000 });
  });
});
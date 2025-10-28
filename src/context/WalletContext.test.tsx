import React, { act } from 'react';
import { render, waitFor } from '@testing-library/react';
import { WalletProvider, useWalletContext } from './WalletContext';
import * as networksModule from '../utils/networks';
import { walletService } from '../services/api';

// Mock the networks module
jest.mock('../utils/networks');
const mockedGetAvailableNetworks = networksModule.getAvailableNetworks as jest.MockedFunction<typeof networksModule.getAvailableNetworks>;

// Mock the API service
jest.mock('../services/api', () => {
  const actual = jest.requireActual('../services/api');
  return {
    ...actual,
    walletService: {
      ...actual.walletService,
      listWallets: jest.fn(),
    },
  };
});

const mockedList = walletService.listWallets as jest.MockedFunction<any>;

type Ctx = ReturnType<typeof useWalletContext>;
const Harness = React.forwardRef<Ctx, {}>((props, ref) => {
  const ctx = useWalletContext();
  React.useImperativeHandle(ref, () => ctx);
  return null;
});

const mount = (ref: React.RefObject<Ctx>) => render(<WalletProvider><Harness ref={ref} /></WalletProvider>);

describe('WalletContext', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
    mockedGetAvailableNetworks.mockReturnValue([
      { id: 'eth', name: 'Ethereum' },
      { id: 'btc', name: 'Bitcoin' },
    ]);
  });

  test('setCurrentWallet saves and removes localStorage', async () => {
    mockedList.mockResolvedValueOnce([{ id: '1', name: 'a', quantum_safe: false }]);
    const ref = React.createRef<Ctx>();
    mount(ref);
    await waitFor(() => expect(ref.current!.wallets.length).toBe(1));

    act(() => {
      ref.current!.setCurrentWallet('a');
    });
    expect(localStorage.getItem('current_wallet')).toBe('a');
    act(() => {
      ref.current!.setCurrentWallet(null);
    });
    expect(localStorage.getItem('current_wallet')).toBeNull();
  });

  test('ensureValidNetwork resets to first available when invalid', async () => {
    localStorage.setItem('current_network', 'doge');
    mockedList.mockResolvedValueOnce([{ id: '1', name: 'a', quantum_safe: false }]);
    const ref = React.createRef<Ctx>();
    mount(ref);
    await waitFor(() => expect(ref.current!.wallets.length).toBe(1));
    await waitFor(() => expect(ref.current!.currentNetwork).toBe('eth'));
    act(() => {
      ref.current!.setCurrentNetwork('btc');
    });
    expect(localStorage.getItem('current_network')).toBe('btc');
  });

  test('refreshWallets sets wallets and default currentWallet', async () => {
    mockedList.mockResolvedValueOnce([
      { id: '1', name: 'a', quantum_safe: false },
      { id: '2', name: 'b', quantum_safe: true },
    ]);
    const ref = React.createRef<Ctx>();
    mount(ref);
    await waitFor(() => expect(ref.current!.wallets.length).toBe(2));
    expect(ref.current!.currentWallet).toBe('a');
  });

  test('refreshWallets error is warned once', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    mockedList.mockRejectedValueOnce(new Error('fail'));
    const ref = React.createRef<Ctx>();
    mount(ref);
    await waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    warn.mockRestore();
  });

  test('concurrent refresh prevents duplicate calls', async () => {
    // Promise that we resolve manually to keep first call in-flight
    let resolveFn: Function = () => {};
    const pending = new Promise<any>((resolve) => { resolveFn = resolve; });
    mockedList.mockImplementationOnce(() => pending);

    const ref = React.createRef<Ctx>();
    mount(ref);
    // trigger first refresh (initial effect already called it)
    // Try another concurrent refresh
    await ref.current!.refreshWallets();
    expect(mockedList).toHaveBeenCalledTimes(1);
    resolveFn([{ id: '1', name: 'a', quantum_safe: false }]);
    await waitFor(() => expect(ref.current!.wallets.length).toBe(1));
  });

  test('storage event updates current wallet and network', async () => {
    mockedList.mockResolvedValueOnce([{ id: '1', name: 'a', quantum_safe: false }]);
    const ref = React.createRef<Ctx>();
    mount(ref);
    await waitFor(() => expect(ref.current!.wallets.length).toBe(1));

    window.dispatchEvent(new StorageEvent('storage', { key: 'current_wallet', newValue: 'x' }));
    expect(ref.current!.currentWallet).toBe('x');

    window.dispatchEvent(new StorageEvent('storage', { key: 'current_network', newValue: 'eth' }));
    expect(ref.current!.currentNetwork).toBe('eth');
  });

  test('useWalletContext outside provider throws', () => {
    const Bad = () => {
      useWalletContext();
      return null;
    };
    expect(() => render(<Bad />)).toThrow('useWalletContext must be used within WalletProvider');
  });
});
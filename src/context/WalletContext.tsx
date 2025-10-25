import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { walletService } from '../services/api';
import { Wallet } from '../types';
import { safeLocalStorage } from '../utils/safeLocalStorage';

interface WalletContextValue {
  wallets: Wallet[];
  currentWallet: string | null;
  setCurrentWallet: (name: string | null) => void;
  refreshWallets: () => Promise<void>;
  // 新增：全局网络选择
  currentNetwork: string;
  setCurrentNetwork: (net: string) => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [currentWallet, setCurrentWalletState] = useState<string | null>(() => {
    return safeLocalStorage.getItem('current_wallet');
  });

  const setCurrentWallet = (name: string | null) => {
    setCurrentWalletState(name);
    if (name) {
      safeLocalStorage.setItem('current_wallet', name);
    } else {
      safeLocalStorage.removeItem('current_wallet');
    }
  };

  // 新增：全局网络状态，同步 localStorage
  const [currentNetwork, setCurrentNetworkState] = useState<string>(() => {
    return safeLocalStorage.getItem('current_network') || 'eth';
  });
  const setCurrentNetwork = (net: string) => {
    setCurrentNetworkState(net);
    if (net) {
      safeLocalStorage.setItem('current_network', net);
    } else {
      safeLocalStorage.removeItem('current_network');
    }
  };

  // 在刷新钱包列表处加入性能计时
  const refreshWallets = useCallback(async () => {
    console.time('refreshWallets');
    const data = await walletService.listWallets();
    setWallets(data);
    // 如果没有当前钱包但列表有项，默认选第一个
    if (!currentWallet && data.length > 0) {
      setCurrentWallet(data[0].name);
    }
    console.timeEnd('refreshWallets');
  }, [currentWallet]);

  useEffect(() => {
    refreshWallets().catch((e) => console.error('加载钱包列表失败:', e));
  }, [refreshWallets]);

  // 添加跨标签 localStorage 同步 current_wallet / current_network
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'current_wallet') {
        // 更新全局状态为最新选择的钱包名
        setCurrentWallet(e.newValue || null);
      }
      if (e.key === 'current_network') {
        setCurrentNetwork(e.newValue || 'eth');
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <WalletContext.Provider value={{ wallets, currentWallet, setCurrentWallet, refreshWallets, currentNetwork, setCurrentNetwork }}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWalletContext = (): WalletContextValue => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWalletContext must be used within WalletProvider');
  return ctx;
};
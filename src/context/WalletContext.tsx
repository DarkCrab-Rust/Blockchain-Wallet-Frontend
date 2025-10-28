import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { walletService } from '../services/api';
import { Wallet } from '../types';
import { safeLocalStorage } from '../utils/safeLocalStorage';
import { getAvailableNetworks } from '../utils/networks';
import { FEATURE_KEYS } from '../utils/featureFlags';

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

  // 新增：全局网络状态，同步 localStorage（默认选首个可用网络）
  const [currentNetwork, setCurrentNetworkState] = useState<string>(() => {
    const stored = safeLocalStorage.getItem('current_network');
    const nets = getAvailableNetworks() || [];
    return stored || (nets[0]?.id || 'eth');
  });
  const setCurrentNetwork = (net: string) => {
    setCurrentNetworkState(net);
    if (net) {
      safeLocalStorage.setItem('current_network', net);
    } else {
      safeLocalStorage.removeItem('current_network');
    }
  };

  const ensureValidNetwork = React.useCallback(() => {
    const nets = getAvailableNetworks() || [];
    if (nets.length === 0) {
      setCurrentNetwork('eth');
      return;
    }
    if (!nets.some((n) => n.id === currentNetwork)) {
      setCurrentNetwork(nets[0]?.id || 'eth');
    }
  }, [currentNetwork]);

  const refreshInFlight = useRef<boolean>(false);
  const refreshCounter = useRef<number>(0);
  const errorLoggedRef = useRef<boolean>(false);

  // 在刷新钱包列表处加入性能计时，并发防护
  const refreshWallets = useCallback(async () => {
    if (refreshInFlight.current) {
      return; // 防止并发重复刷新导致计时重复
    }
    refreshInFlight.current = true;
    const label = `refreshWallets#${++refreshCounter.current}`;
    console.time(label);
    try {
      const data = await walletService.listWallets();
      const items = Array.isArray(data) ? data : [];
      setWallets(items);
      // 使用函数式更新确保获取最新的 currentWallet 状态
      setCurrentWalletState(prevCurrentWallet => {
        // 如果没有当前钱包但列表有项，默认选第一个
        if (!prevCurrentWallet && items.length > 0) {
          const defaultWallet = items[0].name;
          safeLocalStorage.setItem('current_wallet', defaultWallet);
          return defaultWallet;
        }
        return prevCurrentWallet;
      });
    } catch (e) {
      if (!errorLoggedRef.current) {
        console.warn('加载钱包列表失败（已忽略）:', e);
        errorLoggedRef.current = true;
      }
    } finally {
      console.timeEnd(label);
      refreshInFlight.current = false;
    }
  }, []);

  // 首次加载触发刷新，避免严格模式下重复并发
  useEffect(() => {
    let mounted = true;
    if (mounted) {
      refreshWallets().catch((e) => {
        if (!errorLoggedRef.current) {
          console.warn('加载钱包列表失败（已忽略）:', e);
          errorLoggedRef.current = true;
        }
      });
      // 首次挂载后校验当前网络是否仍然有效
      ensureValidNetwork();
    }
    return () => { mounted = false; };
  }, [refreshWallets, ensureValidNetwork]);

  // 添加跨标签 localStorage 同步 current_wallet / current_network
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'current_wallet') {
        flushSync(() => {
          setCurrentWallet(e.newValue || null);
        });
      }
      if (e.key === 'current_network') {
        const nets = getAvailableNetworks() || [];
        flushSync(() => {
          setCurrentNetwork(e.newValue || (nets[0]?.id || 'eth'));
        });
      }
      const k = e.key || '';
      if (k === FEATURE_KEYS.solana || k === FEATURE_KEYS.btc || k === FEATURE_KEYS.ledger || k === FEATURE_KEYS.trezor) {
        // 特性开关变化可能影响可用网络
        ensureValidNetwork();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [ensureValidNetwork]);

  // 当 currentNetwork 变化时确保其在可用网络列表中
  useEffect(() => {
    ensureValidNetwork();
  }, [currentNetwork, ensureValidNetwork]);
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
import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { HardwareSession, SupportedNetwork, SignTxRequest, SignMsgRequest } from '../services/hardware';
import hardwareWalletService from '../services/hardware';
import { safeLocalStorage } from '../utils/safeLocalStorage';

interface HardwareContextValue {
  ledgerSession: HardwareSession | null;
  trezorSession: HardwareSession | null;
  hwNetwork: SupportedNetwork;
  setHwNetwork: (net: SupportedNetwork) => void;
  addresses: string[];
  busy: boolean;
  error: string | null;
  connect: (type: 'ledger' | 'trezor') => Promise<void>;
  disconnect: (type: 'ledger' | 'trezor') => Promise<void>;
  listAddresses: (count?: number) => Promise<void>;
  signTransaction: (req: SignTxRequest) => Promise<string>;
  signMessage: (req: SignMsgRequest) => Promise<string>;
}

const HardwareContext = createContext<HardwareContextValue | null>(null);

export const HardwareProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ledgerSession, setLedgerSession] = useState<HardwareSession | null>(null);
  const [trezorSession, setTrezorSession] = useState<HardwareSession | null>(null);
  const [hwNetwork, setHwNetworkState] = useState<SupportedNetwork>(() => {
    const saved = safeLocalStorage.getItem('hw_network') as SupportedNetwork | null;
    return saved || 'btc';
  });
  const [addresses, setAddresses] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setHwNetwork = useCallback((net: SupportedNetwork) => {
    setHwNetworkState(net);
    safeLocalStorage.setItem('hw_network', net);
  }, []);

  const connect = useCallback(async (type: 'ledger' | 'trezor') => {
    try {
      setBusy(true);
      setError(null);
      const session = await hardwareWalletService.connect(type);
      if (type === 'ledger') setLedgerSession(session);
      else setTrezorSession(session);
      safeLocalStorage.setItem('hw_last_type', type);
    } catch (e: any) {
      setError(e?.message || '连接硬件失败');
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(async (type: 'ledger' | 'trezor') => {
    try {
      setBusy(true);
      setError(null);
      const session = type === 'ledger' ? ledgerSession : trezorSession;
      if (session) {
        await hardwareWalletService.disconnect(session);
        if (type === 'ledger') setLedgerSession(null);
        else setTrezorSession(null);
        setAddresses([]);
      }
    } catch (e: any) {
      setError(e?.message || '断开失败');
    } finally {
      setBusy(false);
    }
  }, [ledgerSession, trezorSession]);

  const listAddresses = useCallback(async (count = 5) => {
    try {
      setBusy(true);
      setError(null);
      const session = ledgerSession || trezorSession;
      if (!session) {
        setError('请先连接 Ledger 或 Trezor');
        return;
      }
      const addrs = await hardwareWalletService.listAddresses(session, hwNetwork, count);
      setAddresses(addrs);
    } catch (e: any) {
      setError(e?.message || '获取地址失败');
    } finally {
      setBusy(false);
    }
  }, [ledgerSession, trezorSession, hwNetwork]);

  const signTransaction = useCallback(async (req: SignTxRequest) => {
    const session = ledgerSession || trezorSession;
    if (!session) throw new Error('尚未连接硬件钱包');
    return hardwareWalletService.signTransaction(session, req);
  }, [ledgerSession, trezorSession]);

  const signMessage = useCallback(async (req: SignMsgRequest) => {
    const session = ledgerSession || trezorSession;
    if (!session) throw new Error('尚未连接硬件钱包');
    return hardwareWalletService.signMessage(session, req);
  }, [ledgerSession, trezorSession]);

  const value = useMemo<HardwareContextValue>(() => ({
    ledgerSession,
    trezorSession,
    hwNetwork,
    setHwNetwork,
    addresses,
    busy,
    error,
    connect,
    disconnect,
    listAddresses,
    signTransaction,
    signMessage,
  }), [
    ledgerSession,
    trezorSession,
    hwNetwork,
    addresses,
    busy,
    error,
    setHwNetwork,
    connect,
    disconnect,
    listAddresses,
    signTransaction,
    signMessage,
  ]);

  return (
    <HardwareContext.Provider value={value}>{children}</HardwareContext.Provider>
  );
};

export const useHardwareContext = (): HardwareContextValue => {
  const ctx = useContext(HardwareContext);
  if (!ctx) throw new Error('useHardwareContext must be used within HardwareProvider');
  return ctx;
};
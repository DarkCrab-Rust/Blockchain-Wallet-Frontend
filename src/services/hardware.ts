// Placeholder hardware wallet service for Ledger/Trezor integration
// This scaffolds the frontend interfaces; actual device support will be wired later.

import { getFeatureFlags } from '../utils/featureFlags';

export type HardwareWalletType = 'ledger' | 'trezor';
export type SupportedNetwork = 'eth' | 'solana' | 'polygon' | 'bsc' | 'btc';

export interface HardwareSession {
  type: HardwareWalletType;
  connected: boolean;
  accounts?: string[];
}

export interface SignTxRequest {
  network: SupportedNetwork;
  rawTx: any; // network-specific raw transaction payload
  path?: string; // optional derivation path (e.g., m/44'/60'/0'/0/0)
}

export interface SignMsgRequest {
  network: SupportedNetwork;
  message: string | Uint8Array;
  path?: string;
}

function ensureEnabled(type: HardwareWalletType) {
  const flags = getFeatureFlags();
  if (type === 'ledger' && !flags.enableLedger) {
    throw new Error('Ledger integration not enabled');
  }
  if (type === 'trezor' && !flags.enableTrezor) {
    throw new Error('Trezor integration not enabled');
  }
}

async function mockDelay(ms = 300) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export const hardwareWalletService = {
  async connect(type: HardwareWalletType): Promise<HardwareSession> {
    ensureEnabled(type);
    // TODO: replace with real transport (WebUSB/WebHID/U2F or Bridge)
    await mockDelay();
    return { type, connected: true, accounts: [] };
  },

  async listAddresses(session: HardwareSession, network: SupportedNetwork, count = 5): Promise<string[]> {
    ensureEnabled(session.type);
    await mockDelay();
    // TODO: use network-specific derivation paths
    const base = network === 'btc' ? 'bc1p' : network === 'solana' ? '' : '0x';
    const res = Array.from({ length: count }).map((_, i) => `${base}mock_${network}_${i}`);
    session.accounts = res;
    return res;
  },

  async signTransaction(session: HardwareSession, req: SignTxRequest): Promise<string> {
    ensureEnabled(session.type);
    await mockDelay();
    // TODO: implement real signing via app APIs for each chain
    return `signed_tx_${req.network}_${session.type}`;
  },

  async signMessage(session: HardwareSession, req: SignMsgRequest): Promise<string> {
    ensureEnabled(session.type);
    await mockDelay();
    // TODO: implement real message signing
    return `signed_msg_${req.network}_${session.type}`;
  },

  async disconnect(session: HardwareSession): Promise<void> {
    await mockDelay();
    session.connected = false;
  },
};

export default hardwareWalletService;
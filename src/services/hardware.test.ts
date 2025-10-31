import hardwareWalletService, { hardwareWalletService as svc } from './hardware';

jest.mock('../utils/featureFlags', () => ({
  getFeatureFlags: jest.fn(() => ({ enableLedger: true, enableTrezor: true })),
}));

const { getFeatureFlags } = jest.requireMock('../utils/featureFlags');

describe('services/hardware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getFeatureFlags as jest.Mock).mockReturnValue({ enableLedger: true, enableTrezor: true });
  });

  test('connect returns connected session (ledger)', async () => {
    const s = await svc.connect('ledger');
    expect(s.connected).toBe(true);
    expect(s.type).toBe('ledger');
  });

  test('listAddresses populates accounts for ETH with 0x prefix', async () => {
    const s = await svc.connect('trezor');
    const addrs = await svc.listAddresses(s, 'eth', 3);
    expect(addrs.length).toBe(3);
    expect(addrs[0]).toMatch(/^0xmock_eth_/);
    expect(s.accounts).toEqual(addrs);
  });

  test('listAddresses BTC uses bc1p prefix', async () => {
    const s = await svc.connect('ledger');
    const btc = await svc.listAddresses(s, 'btc', 1);
    expect(btc[0]).toMatch(/^bc1pmock_btc_0$/);
  });

  test('signTransaction and signMessage return tagged strings', async () => {
    const s = await svc.connect('trezor');
    const tx = await svc.signTransaction(s, { network: 'polygon', rawTx: {} });
    expect(tx).toBe('signed_tx_polygon_trezor');
    const msg = await svc.signMessage(s, { network: 'bsc', message: 'hi' });
    expect(msg).toBe('signed_msg_bsc_trezor');
  });

  test('disconnect flips connected=false', async () => {
    const s = await svc.connect('ledger');
    await svc.disconnect(s);
    expect(s.connected).toBe(false);
  });

  test('throws when ledger disabled', async () => {
    (getFeatureFlags as jest.Mock).mockReturnValue({ enableLedger: false, enableTrezor: true });
    await expect(svc.connect('ledger')).rejects.toThrow('Ledger integration not enabled');
  });

  test('throws when trezor disabled', async () => {
    (getFeatureFlags as jest.Mock).mockReturnValue({ enableLedger: true, enableTrezor: false });
    await expect(svc.connect('trezor')).rejects.toThrow('Trezor integration not enabled');
  });
});
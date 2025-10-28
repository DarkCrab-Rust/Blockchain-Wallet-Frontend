import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from 'react';
import userEvent from '@testing-library/user-event';
import { HardwareProvider, useHardwareContext } from './HardwareContext';
import { setFeatureFlag } from '../utils/featureFlags';

jest.mock('../services/hardware', () => {
  const svc = {
    connect: jest.fn(async (type: 'ledger' | 'trezor') => ({ type, connected: true })),
    disconnect: jest.fn(async () => {}),
    listAddresses: jest.fn(async (_session: any, _net: string, count: number) => Array.from({ length: count }, (_, i) => `addr_${i}`)),
    signTransaction: jest.fn(async () => 'signed_tx'),
    signMessage: jest.fn(async () => 'signed_msg'),
  };
  return { __esModule: true, default: svc, hardwareWalletService: svc };
});

const HarnessUI: React.FC = () => {
  const ctx = useHardwareContext();
  const ctxRef = React.useRef(ctx);
  React.useEffect(() => { ctxRef.current = ctx; }, [ctx]);
  const [txResult, setTxResult] = React.useState('');
  const [msgResult, setMsgResult] = React.useState('');
  return (
    <div>
      <div data-testid="ledger">{ctx.ledgerSession ? 'yes' : 'no'}</div>
      <div data-testid="trezor">{ctx.trezorSession ? 'yes' : 'no'}</div>
      <div data-testid="addresses">{ctx.addresses.join(',')}</div>
      <div data-testid="error">{ctx.error || ''}</div>
      <div data-testid="network">{ctx.hwNetwork}</div>
      <div data-testid="tx-result">{txResult}</div>
      <div data-testid="msg-result">{msgResult}</div>
      <button onClick={() => ctxRef.current.connect('ledger')}>connect-ledger</button>
      <button onClick={() => ctxRef.current.connect('trezor')}>connect-trezor</button>
      <button onClick={() => ctxRef.current.disconnect('ledger')}>disconnect-ledger</button>
      <button onClick={() => ctxRef.current.listAddresses(3)}>list-3</button>
      <button onClick={() => ctxRef.current.listAddresses(4)}>list-4</button>
      <button onClick={async () => {
        if (!ctxRef.current.ledgerSession && !ctxRef.current.trezorSession) return;
        try { setTxResult(await ctxRef.current.signTransaction({ network: 'eth', rawTx: {} } as any)); } catch {}
      }}>sign-tx</button>
      <button onClick={async () => {
        if (!ctxRef.current.ledgerSession && !ctxRef.current.trezorSession) return;
        try { setMsgResult(await ctxRef.current.signMessage({ network: 'eth', message: 'hi' } as any)); } catch {}
      }}>sign-msg</button>
      <button onClick={() => ctxRef.current.setHwNetwork('eth')}>set-net-eth</button>
    </div>
  );
};

type Ctx = ReturnType<typeof useHardwareContext>;
const Harness = React.forwardRef<Ctx, {}>((_props, ref) => {
  const ctx = useHardwareContext();
  React.useImperativeHandle(ref, () => ({
    get ledgerSession() { return ctx.ledgerSession; },
    get trezorSession() { return ctx.trezorSession; },
    get hwNetwork() { return ctx.hwNetwork; },
    get addresses() { return ctx.addresses; },
    get error() { return ctx.error; },
    connect: async (t: 'ledger' | 'trezor') => ctx.connect(t),
    disconnect: async (t: 'ledger' | 'trezor') => ctx.disconnect(t),
    listAddresses: async (c?: number) => ctx.listAddresses(c),
    signTransaction: async (req: any) => ctx.signTransaction(req),
    signMessage: async (req: any) => ctx.signMessage(req),
    setHwNetwork: (n: any) => ctx.setHwNetwork(n),
  }) as Ctx);
  return null;
});

describe('HardwareContext', () => {
  beforeEach(() => {
    localStorage.clear();
    // Ensure feature flags allow hardware paths even if real service is used
    setFeatureFlag('ledger', true);
    setFeatureFlag('trezor', true);
    jest.clearAllMocks();
  });

  test('connect sets session and persists last type', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );
    await act(async () => {
      await userEvent.click(screen.getByText('connect-ledger'));
    });
    await waitFor(() => {
      expect(ref.current!.ledgerSession).not.toBeNull();
    });
    expect(localStorage.getItem('hw_last_type')).toBe('ledger');
  });

  test('disconnect clears session and addresses', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );

    await act(async () => {
      await userEvent.click(screen.getByText('connect-ledger'));
    });
    await waitFor(() => {
      expect(ref.current!.ledgerSession).not.toBeNull();
    });
    // 显式列出地址后再断开，避免依赖连接预填行为
    await act(async () => {
      await ref.current!.listAddresses(3);
    });
    await waitFor(() => {
      expect(screen.getByTestId('addresses').textContent).toBe('addr_0,addr_1,addr_2');
    });

    await act(async () => {
      await ref.current!.disconnect('ledger');
    });
    await waitFor(() => {
      expect(screen.getByTestId('ledger').textContent).toBe('no');
      expect(ref.current!.addresses).toEqual([]);
    });
  });

  test('listAddresses without session sets error', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );
    await act(async () => {
      await ref.current!.listAddresses(3);
    });
    await waitFor(() => {
      expect(ref.current!.error).toBe('请先连接 Ledger 或 Trezor');
    });
  });

  test('listAddresses populates addresses when connected', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );
    await act(async () => {
      await ref.current!.connect('ledger');
    });
    await waitFor(() => {
      expect(ref.current!.ledgerSession).not.toBeNull();
    });
    await act(async () => {
      await ref.current!.listAddresses(4);
    });
    await waitFor(() => {
      const text = screen.getByTestId('addresses').textContent || '';
      expect(text.includes('addr_')).toBe(true);
      expect(screen.getByTestId('error').textContent).toBe('');
    });
  });

  test('signTransaction and signMessage require session', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );

    let tx = '';
    let msg = '';
    await act(async () => {
      tx = await ref.current!.signTransaction({ network: 'eth', rawTx: {} } as any);
      msg = await ref.current!.signMessage({ network: 'eth', message: 'hi' } as any);
    });
    expect(tx).toBe('');
    expect(msg).toBe('');

    await act(async () => {
      await ref.current!.connect('ledger');
    });
    await waitFor(() => {
      expect(ref.current!.ledgerSession).not.toBeNull();
    });
    await act(async () => {
      tx = await ref.current!.signTransaction({ network: 'eth', rawTx: {} } as any);
      msg = await ref.current!.signMessage({ network: 'eth', message: 'hi' } as any);
    });
    expect(tx).toBe('signed_tx');
    expect(msg).toBe('signed_msg');
  });

  test('setHwNetwork persists to localStorage', async () => {
    const ref = React.createRef<Ctx>();
    render(
      <HardwareProvider>
        <Harness ref={ref} />
        <HarnessUI />
      </HardwareProvider>
    );
    expect(ref.current!.hwNetwork).toBe('btc');
    await act(async () => {
      ref.current!.setHwNetwork('eth');
    });
    expect(ref.current!.hwNetwork).toBe('eth');
    expect(localStorage.getItem('hw_network')).toBe('eth');
  });
});
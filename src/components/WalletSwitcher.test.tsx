import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WalletSwitcher from './WalletSwitcher';

describe('WalletSwitcher', () => {
  test('renders options and calls onChange when selecting', async () => {
    const wallets = [
      { id: 'w1', name: 'Alice', quantum_safe: false },
      { id: 'w2', name: 'Bob', quantum_safe: true },
    ];
    const onChange = jest.fn();
    render(<WalletSwitcher wallets={wallets as any} currentWallet={'Bob'} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    await userEvent.click(select);

    const alice = await screen.findByRole('option', { name: 'Alice' });
    await userEvent.click(alice);

    expect(onChange).toHaveBeenCalledWith('Alice');
  });

  test('empty wallets renders no options', async () => {
    const onChange = jest.fn();
    render(<WalletSwitcher wallets={[]} currentWallet={null} onChange={onChange} />);

    const select = screen.getByRole('combobox');
    await userEvent.click(select);

    expect(screen.queryAllByRole('option').length).toBe(0);
    expect(onChange).not.toHaveBeenCalled();
  });
});
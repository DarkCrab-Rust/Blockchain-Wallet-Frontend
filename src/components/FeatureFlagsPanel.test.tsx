import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeatureFlagsPanel from './FeatureFlagsPanel';

describe('FeatureFlagsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.localStorage.clear();
  });

  test('toggles Ledger flag and persists to localStorage', async () => {
    render(<FeatureFlagsPanel />);

    const ledgerSwitch = await screen.findByLabelText('启用 Ledger 集成');
    expect(ledgerSwitch).not.toBeChecked();

    await userEvent.click(ledgerSwitch);

    await waitFor(() => {
      expect(window.localStorage.getItem('feature_ledger')).toBe('true');
    });
    await waitFor(() => {
      expect(ledgerSwitch).toBeChecked();
    });

    await userEvent.click(ledgerSwitch);
    await waitFor(() => {
      expect(window.localStorage.getItem('feature_ledger')).toBe('false');
    });
    await waitFor(() => {
      expect(ledgerSwitch).not.toBeChecked();
    });
  });

  test('mock backend flag defaults to enabled and can be turned off', async () => {
    render(<FeatureFlagsPanel />);

    const mockSwitch = await screen.findByLabelText('使用 Mock 后端');
    expect(mockSwitch).toBeChecked();

    await userEvent.click(mockSwitch);
    await waitFor(() => {
      expect(window.localStorage.getItem('feature_mock')).toBe('false');
    });
    await waitFor(() => {
      expect(mockSwitch).not.toBeChecked();
    });
  });
});
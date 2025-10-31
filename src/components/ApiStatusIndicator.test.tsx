import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ApiStatusIndicator from './ApiStatusIndicator';

describe('ApiStatusIndicator', () => {
  const cases: Array<{status: any, label: string}> = [
    { status: 'ok', label: 'API 正常' },
    { status: 'checking', label: 'API 检查中' },
    { status: 'mock', label: 'API Mock' },
    { status: 'error', label: 'API 异常' },
  ];

  test.each(cases)('renders label for %s', ({ status, label }) => {
    render(<ApiStatusIndicator status={status} />);
    expect(screen.getByRole('status', { name: 'API 状态' })).toBeInTheDocument();
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  test('calls onRefresh when clicking refresh button', async () => {
    const onRefresh = jest.fn();
    render(<ApiStatusIndicator status={'ok'} onRefresh={onRefresh} />);
    await userEvent.click(screen.getByRole('button', { name: '立即重检' }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>正常内容</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('正常内容')).toBeInTheDocument();
  });

  test('shows fallback UI and triggers reload on click', async () => {
    const Thrower: React.FC = () => {
      throw new Error('boom');
    };

    const originalLocation = window.location;
    const reloadMock = jest.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...(originalLocation as any), reload: reloadMock } as any,
    });
    const removeSpy = jest.spyOn(Storage.prototype, 'removeItem');

    render(
      <ErrorBoundary>
        <Thrower />
      </ErrorBoundary>
    );

    const alert = await screen.findByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('页面出现错误')).toBeInTheDocument();

    const btn = screen.getByRole('button', { name: '刷新页面' });
    await userEvent.click(btn);

    expect(removeSpy).toHaveBeenCalledWith('feature_mock');
    expect(reloadMock).toHaveBeenCalledTimes(1);

    // restore original location to avoid side effects on other tests
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
  });
});
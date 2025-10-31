import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';
import { eventBus } from '../utils/eventBus';

describe('ErrorBoundary', () => {
  test('renders fallback UI and emits event on error', () => {
    const spy = jest.spyOn(eventBus, 'emitApiError');
    const Problem: React.FC = () => { throw new Error('boom'); };
    render(
      <ErrorBoundary>
        <Problem />
      </ErrorBoundary>
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({
      title: '界面异常',
      friendlyCategory: 'ui',
      severity: 'error',
    }));
  });
});
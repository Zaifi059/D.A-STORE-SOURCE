import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

function BrokenPage() {
  throw new Error('render failure');
}

describe('ErrorBoundary', () => {
  it('shows a recovery screen when a child throws during render', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ErrorBoundary><BrokenPage /></ErrorBoundary>);

    expect(screen.getByRole('alert')).toHaveTextContent('This page could not be displayed');
    expect(screen.getByRole('button', { name: 'Reload page' })).toBeInTheDocument();
    consoleError.mockRestore();
  });
});

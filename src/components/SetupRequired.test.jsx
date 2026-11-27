import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import SetupRequired from './SetupRequired';

describe('SetupRequired', () => {
  it('lists each missing variable by its exact name', () => {
    render(<SetupRequired missing={['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']} />);
    expect(screen.getByText('VITE_SUPABASE_URL')).toBeInTheDocument();
    expect(screen.getByText('VITE_SUPABASE_ANON_KEY')).toBeInTheDocument();
  });

  it('never shows key values, only names', () => {
    render(<SetupRequired missing={['VITE_SUPABASE_ANON_KEY']} />);
    expect(screen.queryByText(/eyJ/)).not.toBeInTheDocument();
  });
});

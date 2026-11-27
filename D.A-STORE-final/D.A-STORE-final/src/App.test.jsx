import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: null } }),
    },
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ then: (cb) => cb({ data: [], error: null }) }) }) }),
    }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }),
    removeChannel() {},
  },
}));

vi.mock('./hooks/useProducts', () => ({
  useProducts: () => ({ products: [], loading: false, error: '' }),
  useProduct: () => ({ product: null, loading: false, error: '' }),
}));

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <App />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('routes', () => {
  it('renders the About page', async () => {
    renderAt('/about');
    expect(await screen.findByText(/Dress better/i)).toBeInTheDocument();
  });

  it('renders the Contact page', async () => {
    renderAt('/contact');
    expect(await screen.findByText("Let's talk.")).toBeInTheDocument();
  });

  it('renders Collections with an empty state when there is no catalog', async () => {
    renderAt('/collections');
    expect(await screen.findByText('No collections yet.')).toBeInTheDocument();
  });

  it('renders Favorites with an empty state', async () => {
    renderAt('/favorites');
    expect(await screen.findByText(/Nothing saved yet/i)).toBeInTheDocument();
  });

  it('redirects unknown paths to home', async () => {
    renderAt('/does-not-exist');
    expect(await screen.findByText('The Collection')).toBeInTheDocument();
  });
});

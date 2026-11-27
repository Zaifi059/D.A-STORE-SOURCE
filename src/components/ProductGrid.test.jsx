import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { products } from '../test/fixtures';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';

const { refreshProducts } = vi.hoisted(() => ({ refreshProducts: vi.fn() }));
let productError = '';

vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({
    products: fixtureList,
    loading: false,
    error: productError,
    refresh: refreshProducts,
  }),
}));

let fixtureList = products;
import ProductGrid from './ProductGrid';

function renderAt(path, props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <CartProvider>
        <WishlistProvider>
          <ProductGrid {...props} />
        </WishlistProvider>
      </CartProvider>
    </MemoryRouter>
  );
}

describe('ProductGrid', () => {
  it('shows every product by default', () => {
    fixtureList = products;
    renderAt('/shop');
    expect(screen.getByText('Charcoal Suit')).toBeInTheDocument();
    expect(screen.getByText('Oxford Shirt')).toBeInTheDocument();
    expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
  });

  it('pre-filters from the ?category= URL parameter', () => {
    fixtureList = products;
    renderAt('/shop?category=Suits');
    expect(screen.getByText('Charcoal Suit')).toBeInTheDocument();
    expect(screen.queryByText('Oxford Shirt')).not.toBeInTheDocument();
  });

  it('filters by search query from ?q=', () => {
    fixtureList = products;
    renderAt('/shop?q=linen');
    expect(screen.getByText('Navy Blazer')).toBeInTheDocument();
    expect(screen.queryByText('Charcoal Suit')).not.toBeInTheDocument();
  });

  it('sorts newest first for the new-arrivals view', () => {
    fixtureList = products;
    renderAt('/new-arrivals', { sortBy: 'newest', title: 'New Arrivals' });
    const cards = document.querySelectorAll('article');
    expect(cards[0].textContent).toContain('Navy Blazer');
    expect(cards[cards.length - 1].textContent).toContain('Charcoal Suit');
  });

  it('switches category when a pill is clicked', () => {
    fixtureList = products;
    renderAt('/shop');
    fireEvent.click(screen.getByRole('button', { name: 'Shirts' }));
    expect(screen.queryByText('Charcoal Suit')).not.toBeInTheDocument();
    expect(screen.getByText('Oxford Shirt')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    fixtureList = products;
    renderAt('/shop?q=nothing-matches-this');
    expect(screen.getByText('No products found.')).toBeInTheDocument();
  });

  it('explains an expired session and lets the visitor retry loading products', () => {
    productError = 'JWT expired';
    refreshProducts.mockClear();
    renderAt('/shop');

    expect(screen.getByRole('alert')).toHaveTextContent(/saved sign-in has expired/i);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(refreshProducts).toHaveBeenCalledTimes(1);
    productError = '';
  });
});

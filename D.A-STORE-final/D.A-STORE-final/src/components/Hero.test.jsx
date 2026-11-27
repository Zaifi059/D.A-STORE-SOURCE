import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { products } from '../test/fixtures';
import { CartProvider } from '../context/CartContext';

let fixtureList = products;
vi.mock('../hooks/useProducts', () => ({
  useProducts: () => ({ products: fixtureList, loading: false, error: '' }),
}));

import Hero from './Hero';

const renderHero = () =>
  render(
    <MemoryRouter>
      <CartProvider>
        <Hero />
      </CartProvider>
    </MemoryRouter>
  );

describe('Hero', () => {
  it('spotlights the first in-stock product from live data', () => {
    // "Oxford Shirt" is out of stock, so the hero should skip it.
    fixtureList = products;
    renderHero();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Charcoal Suit');
  });

  it('renders nothing when there are no products', () => {
    fixtureList = [];
    const { container } = renderHero();
    expect(container).toBeEmptyDOMElement();
  });
});

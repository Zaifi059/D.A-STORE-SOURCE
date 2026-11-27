import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

function renderSidebar(path = '/dashboard', isAdmin = true) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminSidebar collapsed={false} mobileOpen={false} isAdmin={isAdmin} onCloseMobile={() => {}} />
    </MemoryRouter>
  );
}

describe('AdminSidebar', () => {
  it('uses the same navigation and highlights the selected admin module', () => {
    renderSidebar();

    expect(screen.getByRole('link', { name: /Overview/ })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: /Orders/ }));
    expect(screen.getByRole('link', { name: /Orders/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Suppliers')).toBeInTheDocument();
    expect(screen.getAllByText('Soon').length).toBeGreaterThan(0);
  });

  it('does not present admin-only modules as usable to a cashier', () => {
    renderSidebar('/pos', false);

    expect(screen.getByRole('link', { name: /Point of Sale/ })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Orders').closest('[aria-disabled="true"]')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Orders/ })).not.toBeInTheDocument();
  });
});

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const insert = vi.fn();
vi.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ insert }) },
}));

import ContactPage from './ContactPage';

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

describe('ContactPage', () => {
  beforeEach(() => {
    insert.mockReset();
    insert.mockResolvedValue({ error: null });
  });

  it('rejects an invalid email without calling the database', async () => {
    render(<MemoryRouter><ContactPage /></MemoryRouter>);
    fill('Name', 'Ali');
    fill('Email', 'not-an-email');
    fill('Message', 'Hello');
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('valid email');
    expect(insert).not.toHaveBeenCalled();
  });

  it('submits a trimmed message and shows confirmation', async () => {
    render(<MemoryRouter><ContactPage /></MemoryRouter>);
    fill('Name', '  Ali  ');
    fill('Email', 'ali@example.com');
    fill('Phone (optional)', '');
    fill('Message', 'Do you have size 42?');
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    await waitFor(() => expect(screen.getByText('Message sent')).toBeInTheDocument());
    expect(insert).toHaveBeenCalledWith({
      name: 'Ali',
      email: 'ali@example.com',
      phone: null,
      message: 'Do you have size 42?',
    });
  });

  it('surfaces database errors to the user', async () => {
    insert.mockResolvedValue({ error: { message: 'Network down' } });
    render(<MemoryRouter><ContactPage /></MemoryRouter>);
    fill('Name', 'Ali');
    fill('Email', 'ali@example.com');
    fill('Message', 'Hi');
    fireEvent.click(screen.getByRole('button', { name: /send message/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Network down');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refreshSession } = vi.hoisted(() => ({
  refreshSession: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: { auth: { refreshSession } },
}));

import { runProductQuery } from './useProducts';

describe('runProductQuery', () => {
  beforeEach(() => {
    refreshSession.mockReset();
  });

  it('refreshes an expired session and retries the product query once', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST301', message: 'JWT expired' } })
      .mockResolvedValueOnce({ data: [{ id: 'product-1' }], error: null });
    refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null });

    await expect(runProductQuery(query)).resolves.toEqual({
      data: [{ id: 'product-1' }],
      error: null,
    });
    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns the original result when no refreshable session exists', async () => {
    const expiredResult = { data: null, error: { code: 'PGRST301', message: 'JWT expired' } };
    const query = vi.fn().mockResolvedValue(expiredResult);
    refreshSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(runProductQuery(query)).resolves.toBe(expiredResult);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('surfaces a refresh failure instead of retrying with the expired token', async () => {
    const query = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'PGRST301', message: 'JWT expired' },
    });
    const refreshError = new Error('Refresh token is invalid');
    refreshSession.mockResolvedValue({ data: { session: null }, error: refreshError });

    await expect(runProductQuery(query)).resolves.toMatchObject({ error: refreshError });
    expect(query).toHaveBeenCalledTimes(1);
  });
});

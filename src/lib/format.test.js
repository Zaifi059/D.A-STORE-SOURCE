import { describe, expect, it } from 'vitest';
import { formatPKR } from './format';

describe('formatPKR', () => {
  it('prefixes amounts with Rs. and groups thousands', () => {
    expect(formatPKR(1500)).toMatch(/^Rs\. 1,500$/);
  });

  it('treats missing amounts as zero', () => {
    expect(formatPKR(undefined)).toMatch(/^Rs\. 0$/);
  });
});

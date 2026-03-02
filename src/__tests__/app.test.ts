import { describe, it, expect } from 'vitest';

describe('AI Dashboard', () => {
  it('should have correct environment', () => {
    expect(typeof window).toBe('object');
  });

  it('should have document available', () => {
    expect(document).toBeDefined();
  });
});

import { SecurityUtils } from '@/utils/security';

describe('SecurityUtils', () => {
  test('sanitizeInput removes tags and javascript protocol', () => {
    const input = '<script>javascript:alert(1)</script> Hello ';
    const out = SecurityUtils.sanitizeInput(input);
    expect(out).toBe('alert(1) Hello');
  });

  test('encrypt and decrypt roundtrip', () => {
    const key = 'testkey';
    const text = 'secret-text';
    const cipher = SecurityUtils.encrypt(text, key);
    expect(typeof cipher).toBe('string');
    const plain = SecurityUtils.decrypt(cipher, key);
    expect(plain).toBe(text);
  });

  test('generateSecureId returns correct length and characters', () => {
    const id = SecurityUtils.generateSecureId(12);
    expect(id).toHaveLength(12);
    expect(/^[A-Za-z0-9]+$/.test(id)).toBe(true);
  });
});


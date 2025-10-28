import { normalizeApiUrl } from './url';

describe('utils/url.normalizeApiUrl', () => {
  test('empty input returns null', () => {
    expect(normalizeApiUrl('')).toBeNull();
    // @ts-expect-error
    expect(normalizeApiUrl(undefined)).toBeNull();
  });

  test('relative /api is kept', () => {
    expect(normalizeApiUrl('/api')).toBe('/api');
  });

  test('relative path appends /api and trims trailing slash', () => {
    expect(normalizeApiUrl('/backend/')).toBe('/backend/api');
  });

  test('absolute URL appends /api when missing', () => {
    expect(normalizeApiUrl('http://localhost:3000')).toBe('http://localhost:3000/api');
  });

  test('absolute URL keeps existing /api and trims trailing slashes', () => {
    // 函数只移除结尾的斜杠，不会压缩中间的多斜杠
    expect(normalizeApiUrl('https://x.example.com/base///api///')).toBe('https://x.example.com/base///api');
  });

  test('invalid absolute URL returns null', () => {
    expect(normalizeApiUrl('http:/invalid')).toBeNull();
  });
});
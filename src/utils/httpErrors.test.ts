import { describeAxiosError } from './httpErrors';
import type { AxiosError, AxiosResponse } from 'axios';

function makeErr(
  partial: Partial<Omit<AxiosError, 'response'>> & { config?: any; response?: Partial<AxiosResponse> }
): AxiosError {
  const response = partial.response
    ? {
        status: (partial.response as any).status,
        data: (partial.response as any).data,
        statusText: (partial.response as any).statusText ?? '',
        headers: (partial.response as any).headers ?? {},
        config: (partial.response as any).config ?? {},
      }
    : undefined;

  return {
    name: 'AxiosError',
    message: partial.message || '',
    config: partial.config || { url: '/api/test' },
    code: partial.code as any,
    request: (partial as any).request,
    response: response as any,
    isAxiosError: true,
    toJSON: () => ({})
  } as AxiosError;
}

describe('utils/httpErrors.describeAxiosError', () => {
  test('timeout error returns warning with url', () => {
    const err = makeErr({ code: 'ECONNABORTED', config: { url: '/api/ping' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('请求超时');
    expect(d.severity).toBe('warning');
    expect(d.message).toContain('/api/ping');
  });

  test('network error without response returns error', () => {
    const err = makeErr({ message: 'Network Error', config: { url: '/api/x' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('网络错误或后端不可达');
    expect(d.severity).toBe('error');
    expect(d.message).toContain('/api/x');
  });

  test('401 unauthorized mapped to warning', () => {
    const err = makeErr({ response: { status: 401, data: {} }, config: { url: '/api/secure' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('未认证');
    expect(d.severity).toBe('warning');
  });

  test('403 forbidden mapped to error', () => {
    const err = makeErr({ response: { status: 403, data: {} }, config: { url: '/api/secure' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('禁止访问');
    expect(d.severity).toBe('error');
  });

  test('404 not found mapped to warning', () => {
    const err = makeErr({ response: { status: 404, data: {} }, config: { url: '/api/missing' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('接口不存在');
    expect(d.severity).toBe('warning');
  });

  test('5xx server error mapped to error', () => {
    const err = makeErr({ response: { status: 500, data: {} }, config: { url: '/api/fail' } });
    const d = describeAxiosError(err);
    expect(d.title).toBe('服务器错误');
    expect(d.severity).toBe('error');
  });

  test('other status uses raw message from response.data.message', () => {
    const err = makeErr({
      response: { status: 418, data: { message: 'I am a teapot' } },
      message: 'Short and stout',
      config: { url: '/api/tea' },
    });
    const d = describeAxiosError(err);
    expect(d.title).toBe('请求失败');
    expect(d.message).toContain('I am a teapot');
    expect(d.message).toContain('/api/tea');
  });
});
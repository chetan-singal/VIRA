import { afterEach, describe, expect, it, vi } from 'vitest';
import { api } from './client';

function reply(status, body) {
  const text = body === undefined ? '' : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, statusText: `HTTP ${status}`, text: async () => text };
}

afterEach(() => vi.unstubAllGlobals());

describe('api.postForm', () => {
  it('sends the FormData as the body and leaves Content-Type to the browser', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { hasLogo: true }));
    vi.stubGlobal('fetch', fetchMock);
    const form = new FormData();
    form.append('file', new File(['png'], 'logo.png', { type: 'image/png' }));

    const data = await api.postForm('/shop-profile/logo', form);

    expect(data).toEqual({ hasLogo: true });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/shop-profile/logo');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(form);
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('turns a refused upload into an ApiError that keeps its field error', async () => {
    const fieldErrors = [{ field: 'file', message: 'The logo must be a PNG or JPEG image.' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', fieldErrors })));

    await expect(api.postForm('/shop-profile/logo', new FormData())).rejects.toMatchObject({
      name: 'ApiError',
      status: 400,
      code: 'VALIDATION_FAILED',
      fieldErrors,
    });
  });
});
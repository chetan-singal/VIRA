import { afterEach, describe, expect, it, vi } from 'vitest';
import { partyApi, shopApi, supplierApi } from './endpoints';

function reply(status, body) {
  const text = body === undefined ? '' : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, statusText: `HTTP ${status}`, text: async () => text };
}

afterEach(() => vi.unstubAllGlobals());

describe('shop logo calls', () => {
  it('uploadLogo posts the file as the multipart field "file"', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { hasLogo: true }));
    vi.stubGlobal('fetch', fetchMock);

    await shopApi.uploadLogo(new File(['png'], 'logo.png', { type: 'image/png' }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/shop-profile/logo');
    expect(init.method).toBe('POST');
    expect(init.body.get('file').name).toBe('logo.png');
    expect(init.headers['Content-Type']).toBeUndefined();
  });

  it('removeLogo sends DELETE and logoUrl carries the version', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(204));
    vi.stubGlobal('fetch', fetchMock);

    expect(await shopApi.removeLogo()).toBeNull();

    expect(fetchMock.mock.calls[0][0]).toBe('/api/shop-profile/logo');
    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
    expect(shopApi.logoUrl(3)).toBe('/api/shop-profile/logo?v=3');
    expect(shopApi.logoUrl()).toBe('/api/shop-profile/logo?v=0');
  });
});

describe('summary calls', () => {
  it('go to the party and supplier summary endpoints', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, {}));
    vi.stubGlobal('fetch', fetchMock);

    await partyApi.summary();
    await supplierApi.summary();
    await supplierApi.summaryFor(7);

    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      '/api/parties/summary',
      '/api/suppliers/summary',
      '/api/suppliers/7/summary',
    ]);
  });
});
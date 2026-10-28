import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, ApiError, toQuery } from './client';

function reply(status, body) {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  return { ok: status >= 200 && status < 300, status, statusText: `HTTP ${status}`, text: async () => text };
}

afterEach(() => vi.unstubAllGlobals());

describe('toQuery', () => {
  it('drops empty values and keeps the rest in order', () => {
    expect(toQuery({ from: '2026-10-01', keyword: '', partyId: null, includeDeleted: true, page: 0 }))
      .toBe('?from=2026-10-01&includeDeleted=true&page=0');
    expect(toQuery({})).toBe('');
    expect(toQuery(undefined)).toBe('');
  });
});

describe('api', () => {
  it('GET parses JSON and sends the query string to /api', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { ok: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    const data = await api.get('/daybook', { query: { from: '2026-10-01', keyword: '' } });

    expect(data).toEqual({ ok: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe('/api/daybook?from=2026-10-01');
    expect(fetchMock.mock.calls[0][1].method).toBe('GET');
  });

  it('POST sends a JSON body with a Content-Type header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(201, { id: 5 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/parties', { name: 'Ramesh' });

    const init = fetchMock.mock.calls[0][1];
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.body).toBe('{"name":"Ramesh"}');
  });

  it('POST without a body sends no Content-Type (restore endpoints)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply(200, { id: 1 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.post('/bills/1/restore', undefined);

    expect(fetchMock.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('returns null for 204 No Content (every delete)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(204)));
    expect(await api.delete('/bills/1')).toBeNull();
  });

  it('returns plain text when the body is not JSON (GET /api/health)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(200, 'VIRA Backend is running')));
    expect(await api.get('/health')).toBe('VIRA Backend is running');
  });

  it('turns the backend error body into an ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(409, { code: 'PARTY_BALANCE_NOT_ZERO', message: 'Balance must be zero.', fieldErrors: [] })));

    await expect(api.delete('/parties/1')).rejects.toMatchObject({
      name: 'ApiError',
      status: 409,
      code: 'PARTY_BALANCE_NOT_ZERO',
      message: 'Balance must be zero.',
    });
  });

  it('keeps field errors from a validation failure', async () => {
    const fieldErrors = [{ field: 'amount', message: 'must be greater than 0' }];
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(400, { code: 'VALIDATION_FAILED', message: 'Check the highlighted fields.', fieldErrors })));

    await expect(api.post('/payment-vouchers', {})).rejects.toMatchObject({ status: 400, fieldErrors });
  });

  it('reports an unreachable backend as a network ApiError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const error = await api.get('/setup/status').catch((e) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.isNetwork).toBe(true);
  });

  it('lets aborted requests through untouched', async () => {
    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(abort));

    await expect(api.get('/dashboard')).rejects.toBe(abort);
  });

  it('falls back to a generic message for a 500 without a body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(reply(500)));

    await expect(api.get('/dashboard')).rejects.toMatchObject({ status: 500, code: 'HTTP_500' });
  });
});

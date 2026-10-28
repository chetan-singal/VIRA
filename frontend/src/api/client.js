import { API_BASE } from '../config';

/** One error shape for everything the backend (or the network) can throw at us. */
export class ApiError extends Error {
  constructor({ status = 0, code = 'UNKNOWN', message = 'Something went wrong.', fieldErrors = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }

  /** True when the request never reached the backend. */
  get isNetwork() {
    return this.status === 0;
  }
}

/** Builds "?a=1&b=2", dropping null, undefined and empty values. */
export function toQuery(params) {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.append(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function readBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text; // e.g. GET /api/health answers plain text
  }
}

async function request(method, path, { query, body, signal } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE}${path}${toQuery(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw error;
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      message: 'Cannot reach the VIRA backend. Make sure it is running, then try again.',
    });
  }

  const data = response.status === 204 ? null : await readBody(response);
  if (response.ok) return data;

  const json = data && typeof data === 'object' ? data : {};
  throw new ApiError({
    status: response.status,
    code: json.code || `HTTP_${response.status}`,
    message: json.message || (response.status >= 500 ? 'The backend hit an unexpected error. Check its log.' : response.statusText) || 'Request failed.',
    fieldErrors: Array.isArray(json.fieldErrors) ? json.fieldErrors : [],
  });
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  put: (path, body, opts) => request('PUT', path, { ...opts, body }),
  delete: (path, opts) => request('DELETE', path, opts),
};

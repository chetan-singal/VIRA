import { api } from './client';

/*
 * One thin function per backend endpoint. Rules:
 *  - the last argument is always an optional `opts` object ({ signal });
 *  - list functions take one `params` object that becomes the query string;
 *  - nothing here decides anything: the backend owns every rule and calculation.
 */

export const setupApi = {
  status: (opts) => api.get('/setup/status', opts),
  run: (body, opts) => api.post('/setup', body, opts),
};

export const shopApi = {
  get: (opts) => api.get('/shop-profile', opts),
  update: (body, opts) => api.put('/shop-profile', body, opts),
};

export const settingsApi = {
  get: (opts) => api.get('/settings', opts),
  update: (body, opts) => api.put('/settings', body, opts),
};

export const dashboardApi = {
  get: (params, opts) => api.get('/dashboard', { ...opts, query: params }),
};

export const daybookApi = {
  list: (params, opts) => api.get('/daybook', { ...opts, query: params }),
};

export const billApi = {
  get: (id, opts) => api.get(`/bills/${id}`, opts),
  create: (body, opts) => api.post('/bills', body, opts),
  update: (id, body, opts) => api.put(`/bills/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/bills/${id}`, opts),
  restore: (id, opts) => api.post(`/bills/${id}/restore`, undefined, opts),
};

export const voucherApi = {
  list: (params, opts) => api.get('/payment-vouchers', { ...opts, query: params }),
  get: (id, opts) => api.get(`/payment-vouchers/${id}`, opts),
  create: (body, opts) => api.post('/payment-vouchers', body, opts),
  update: (id, body, opts) => api.put(`/payment-vouchers/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/payment-vouchers/${id}`, opts),
  restore: (id, opts) => api.post(`/payment-vouchers/${id}/restore`, undefined, opts),
};

export const supplierPaymentApi = {
  list: (params, opts) => api.get('/supplier-payments', { ...opts, query: params }),
  get: (id, opts) => api.get(`/supplier-payments/${id}`, opts),
  create: (body, opts) => api.post('/supplier-payments', body, opts),
  update: (id, body, opts) => api.put(`/supplier-payments/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/supplier-payments/${id}`, opts),
  restore: (id, opts) => api.post(`/supplier-payments/${id}/restore`, undefined, opts),
};

export const partyApi = {
  list: (params, opts) => api.get('/parties', { ...opts, query: params }), // { q, deleted, page, size, sort }
  get: (id, opts) => api.get(`/parties/${id}`, opts),
  create: (body, opts) => api.post('/parties', body, opts),
  update: (id, body, opts) => api.put(`/parties/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/parties/${id}`, opts),
  restore: (id, opts) => api.post(`/parties/${id}/restore`, undefined, opts),
  itemRates: (id, opts) => api.get(`/parties/${id}/item-rates`, opts),
  balanceSummary: (id, opts) => api.get(`/parties/${id}/balance-summary`, opts),
};

export const supplierApi = {
  list: (params, opts) => api.get('/suppliers', { ...opts, query: params }),
  get: (id, opts) => api.get(`/suppliers/${id}`, opts),
  create: (body, opts) => api.post('/suppliers', body, opts),
  update: (id, body, opts) => api.put(`/suppliers/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/suppliers/${id}`, opts),
  restore: (id, opts) => api.post(`/suppliers/${id}/restore`, undefined, opts),
};

export const itemApi = {
  list: (params, opts) => api.get('/items', { ...opts, query: params }), // { q, type, categoryId, page, size, sort }
  get: (id, opts) => api.get(`/items/${id}`, opts),
  create: (body, opts) => api.post('/items', body, opts),
  update: (id, body, opts) => api.put(`/items/${id}`, body, opts),
  remove: (id, opts) => api.delete(`/items/${id}`, opts), // the one permanent delete
  rateOverrides: (id, opts) => api.get(`/items/${id}/rate-overrides`, opts),
  clearRateOverrides: (id, opts) => api.delete(`/items/${id}/rate-overrides`, opts),
};

export const categoryApi = {
  list: (opts) => api.get('/part-categories', opts),
  create: (name, opts) => api.post('/part-categories', { name }, opts),
};

export const bikeApi = {
  list: (opts) => api.get('/bikes', opts),
  create: (name, opts) => api.post('/bikes', { name }, opts),
};

export const pricingApi = {
  quote: (params, opts) => api.get('/pricing/quote', { ...opts, query: params }), // { itemId, customer, partyId }
  savePermanent: (body, opts) => api.post('/pricing/permanent-changes', body, opts),
};

export const partSearchApi = {
  search: (params, opts) => api.get('/part-search', { ...opts, query: params }), // { q, categoryId, bikeId, page, size }
};

export const maintenanceApi = {
  check: (opts) => api.get('/maintenance/recalculate-balances', opts),
  fixCash: (opts) => api.post('/maintenance/recalculate-balances/cash', undefined, opts),
  fixParty: (partyId, opts) => api.post(`/maintenance/recalculate-balances/parties/${partyId}`, undefined, opts),
};

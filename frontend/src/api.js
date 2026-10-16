const API_BASE = '/api';
const UNREACHABLE_STATUSES = new Set([0, 502, 503, 504]);

const fieldNameOf = (loc) => (Array.isArray(loc) && loc.length > 1 ? String(loc[loc.length - 1]) : '');

const makeError = (message, status, extra = {}) =>
  Object.assign(new Error(message), {
    status,
    unreachable: UNREACHABLE_STATUSES.has(status),
    fieldErrors: {},
    ...extra,
  });

const messageFor = (status, detail) => {
  if (typeof detail === 'string' && detail) return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const field = fieldNameOf(item?.loc).replace(/_/g, ' ');
        return field ? `${field}: ${item.msg}` : item?.msg;
      })
      .filter(Boolean)
      .join(' · ');
  }
  if (UNREACHABLE_STATUSES.has(status)) return 'The ClinicDesk API is not responding right now.';
  return `Request failed with status ${status}.`;
};

const errorFromResponse = (status, payload) => {
  const detail = payload?.detail;
  const fieldErrors = Array.isArray(detail)
    ? Object.fromEntries(
        detail.map((item) => [fieldNameOf(item?.loc), item?.msg]).filter(([field, msg]) => field && msg),
      )
    : {};
  return makeError(messageFor(status, detail), status, { fieldErrors });
};

const readJson = async (response) => {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (cause) {
    if (!response.ok) return null;
    throw makeError('The API returned an unexpected (non-JSON) response. Is /api routed to the backend?', 502, {
      cause,
    });
  }
};

const request = async (path, { method = 'GET', body } = {}) => {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    throw makeError('Cannot reach the ClinicDesk API. Check your connection and try again.', 0, { cause });
  }

  if (response.status === 204) return null;
  const payload = await readJson(response);
  if (!response.ok) throw errorFromResponse(response.status, payload);
  return payload;
};

const toQuery = (params = {}) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return entries.length ? `?${new URLSearchParams(entries).toString()}` : '';
};

export const api = {
  health: () => request('/health'),

  listDoctors: () => request('/doctors'),
  createDoctor: (data) => request('/doctors', { method: 'POST', body: data }),
  updateDoctor: (id, data) => request(`/doctors/${id}`, { method: 'PUT', body: data }),
  deleteDoctor: (id) => request(`/doctors/${id}`, { method: 'DELETE' }),

  listAppointments: (filters) => request(`/appointments${toQuery(filters)}`),
  createAppointment: (data) => request('/appointments', { method: 'POST', body: data }),
  updateAppointment: (id, data) => request(`/appointments/${id}`, { method: 'PUT', body: data }),
  deleteAppointment: (id) => request(`/appointments/${id}`, { method: 'DELETE' }),
  getStats: () => request('/appointments/stats'),
};

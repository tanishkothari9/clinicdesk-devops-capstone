export const STATUS_META = {
  scheduled: { label: 'Scheduled' },
  checked_in: { label: 'Checked in' },
  completed: { label: 'Completed' },
  cancelled: { label: 'Cancelled' },
  no_show: { label: 'No-show' },
};
export const STATUSES = Object.keys(STATUS_META);

export const VISIT_TYPES = {
  consultation: 'Consultation',
  follow_up: 'Follow-up',
  procedure: 'Procedure',
  emergency: 'Emergency',
};

export const statusLabel = (status) => STATUS_META[status]?.label ?? status;

const pad = (value) => String(value).padStart(2, '0');

export const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
export const toTimeValue = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
export const dateKeyOf = (iso) => (typeof iso === 'string' ? iso.slice(0, 10) : '');

const ISO_LOCAL = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

// Datetimes are naive local clinic time: read the wall-clock parts and ignore any offset.
export const parseLocal = (iso) => {
  const match = ISO_LOCAL.exec(iso ?? '');
  if (!match) return null;
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const shortDateFormat = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const longDateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export const formatTime = (iso) => {
  const date = parseLocal(iso);
  return date ? timeFormat.format(date) : '—';
};

export const formatLongDate = (date) => longDateFormat.format(date);

const shiftDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const dayLabel = (iso) => {
  const date = parseLocal(iso);
  if (!date) return '—';
  const key = toDateKey(date);
  const today = new Date();
  if (key === toDateKey(today)) return 'Today';
  if (key === toDateKey(shiftDays(today, 1))) return 'Tomorrow';
  if (key === toDateKey(shiftDays(today, -1))) return 'Yesterday';
  return shortDateFormat.format(date);
};

export const formatDuration = (minutes) => {
  const value = Number(minutes) || 0;
  if (value < 60) return `${value} min`;
  const rest = value % 60;
  return `${Math.floor(value / 60)} h${rest ? ` ${rest} min` : ''}`;
};

export const formatPercent = (ratio) => `${Math.round((Number(ratio) || 0) * 100)}%`;

export const greeting = (date) => {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const nextSlot = () => {
  const date = new Date();
  date.setSeconds(0, 0);
  date.setMinutes(date.getMinutes() < 30 ? 30 : 60);
  return date;
};

export const initials = (name = '') =>
  name
    .replace(/^dr\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');

export const avatarTone = (seed) => {
  const text = String(seed ?? '');
  const sum = [...text].reduce((total, char) => total + char.charCodeAt(0), 0);
  return sum % 6;
};

export const formatVersion = (version) => (/^\d/.test(version) ? `v${version}` : version);

export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

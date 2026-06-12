/**
 * MemoryVault — Date formatting and countdown utilities
 */

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Safely parse a date string or Date object into a Date instance.
 */
function parse(dateStr) {
  if (!dateStr) return null;
  const d = dateStr instanceof Date ? dateStr : new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * "June 12, 2026"
 */
export function formatLong(dateStr) {
  const d = parse(dateStr);
  if (!d) return '';
  return `${MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * "Jun 12, 2026"
 */
export function formatMedium(dateStr) {
  const d = parse(dateStr);
  if (!d) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * "Jun 12"
 */
export function formatShort(dateStr) {
  const d = parse(dateStr);
  if (!d) return '';
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Returns countdown object to a target date.
 * { days, hours, minutes, seconds, total }
 * `total` is the total remaining milliseconds (negative if past).
 */
export function getCountdown(targetDateStr) {
  const target = parse(targetDateStr);
  if (!target) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };

  const now = new Date();
  const total = target.getTime() - now.getTime();

  if (total <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total };
  }

  const seconds = Math.floor((total / 1000) % 60);
  const minutes = Math.floor((total / (1000 * 60)) % 60);
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
  const days = Math.floor(total / (1000 * 60 * 60 * 24));

  return { days, hours, minutes, seconds, total };
}

/**
 * Human-readable relative time: "in 3 months", "2 days ago", "just now"
 */
export function getRelativeTime(dateStr) {
  const d = parse(dateStr);
  if (!d) return '';

  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);
  const isFuture = diffMs > 0;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  let label = '';

  if (absDiff < minute) {
    return 'just now';
  } else if (absDiff < hour) {
    const n = Math.floor(absDiff / minute);
    label = `${n} minute${n !== 1 ? 's' : ''}`;
  } else if (absDiff < day) {
    const n = Math.floor(absDiff / hour);
    label = `${n} hour${n !== 1 ? 's' : ''}`;
  } else if (absDiff < month) {
    const n = Math.floor(absDiff / day);
    label = `${n} day${n !== 1 ? 's' : ''}`;
  } else if (absDiff < year) {
    const n = Math.floor(absDiff / month);
    label = `${n} month${n !== 1 ? 's' : ''}`;
  } else {
    const n = Math.floor(absDiff / year);
    label = `${n} year${n !== 1 ? 's' : ''}`;
  }

  return isFuture ? `in ${label}` : `${label} ago`;
}

/**
 * Add months to a date, clamping to end-of-month if necessary.
 */
export function addMonths(date, months) {
  const d = parse(date);
  if (!d) return new Date();
  const result = new Date(d);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);
  // Clamp: if the day overflowed (e.g. Jan 31 + 1 month = Mar 3), set to last day
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }
  return result;
}

/**
 * Add years to a date.
 */
export function addYears(date, years) {
  const d = parse(date);
  if (!d) return new Date();
  const result = new Date(d);
  result.setFullYear(result.getFullYear() + years);
  return result;
}

/**
 * Convert a Date to YYYY-MM-DD for <input type="date">
 */
export function toInputFormat(date) {
  const d = parse(date);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

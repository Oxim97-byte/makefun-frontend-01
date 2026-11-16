export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A dollar amount ('1000.00', 0.5, null) as '$1,000', '$0.50' or '—'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A deadline as a short UTC date. */
export function date(iso) {
  return `${new Date(iso).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/**
 * Time until a deadline: '2d 4h left', '35m left', or 'ended'.
 * A bounty past its deadline has stopped taking entries even when its
 * status still reads open, so the deadline — not the status — decides.
 */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  return `${minutes}m left`;
}

/** True while a bounty still takes entries: its deadline has not passed. */
export function stillOpen(bounty) {
  return new Date(bounty.deadline).getTime() > Date.now();
}

/** A win-rate micro value (950587) as '95.1%'. */
export function winRate(micro) {
  const n = Number(micro);
  if (!Number.isFinite(n)) return '—';
  return `${(n / 10000).toFixed(1)}%`;
}

/** Bytes as '12.4 KB'. */
export function size(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(1)} KB`;
}

/** A wallet address shortened to 'Edcz…LKuu'. */
export function shortWallet(address) {
  const s = String(address ?? '');
  return s.length > 12 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s || '—';
}

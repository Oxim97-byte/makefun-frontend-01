// make.fun's public API: read-only GET requests, open to any origin (CORS).
// Full API: https://make.fun/api/openapi.json
//
// Performance: every answer is cached in memory with its ETag. A repeat
// request inside the same minute sends If-None-Match and the API answers
// 304, so a re-render costs no download at all. Each view makes exactly
// one request for its own data; nothing is fetched twice.

const API = 'https://make.fun/api';
const cache = new Map(); // path -> { etag, at, body }
const TTL_MS = 60000; // the API's ETags are bound to the minute
let requests = 0; // requests actually sent on the wire
let saved = 0; // requests answered from cache instead

/** How many requests went out, and how many the cache saved. */
export function stats() {
  return { requests, saved };
}

async function get(path) {
  const now = Date.now();
  const hit = cache.get(path);
  if (hit && now - hit.at < TTL_MS) {
    saved += 1;
    return hit.body;
  }
  const headers = {};
  if (hit?.etag) headers['If-None-Match'] = hit.etag;
  requests += 1;
  const res = await fetch(API + path, { headers });
  if (res.status === 304 && hit) {
    hit.at = now;
    saved += 1;
    return hit.body;
  }
  const body = await res.json();
  cache.set(path, { etag: res.headers.get('ETag'), at: now, body });
  return body;
}

/** The open bounties: { items: [...] }. activity=times keeps the payload small. */
export const getBounties = () => get('/competitions?status=open&activity=times');

/** One bounty, by its slug. */
export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

/** A bounty's leaderboard: { entries: [...], columns: [...] }. */
export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

/** An account's public profile, by handle. */
export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

/** An avatar or entry image path from the API, as an absolute make.fun URL. */
export function imageUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://make.fun${path}`;
}

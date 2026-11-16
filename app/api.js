const API = 'https://make.fun/api';
const cache = new Map();
const TTL_MS = 60000;
let requests = 0;
let saved = 0;

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

export const getBounties = () => get('/competitions?status=open&activity=times');

export const getBounty = (slug) => get(`/competitions/${encodeURIComponent(slug)}`);

export const getLeaderboard = (slug) => get(`/competitions/${encodeURIComponent(slug)}/leaderboard`);

export const getProfile = (handle) => get(`/profiles/${encodeURIComponent(handle)}`);

export function imageUrl(path) {
  if (!path) return '';
  return path.startsWith('http') ? path : `https://make.fun${path}`;
}

// The four surfaces, each a function from API data to HTML.
// Every string from the API goes through esc(); every image the API
// points at loads from make.fun with crossorigin set before its src
// (make.fun's images send Cross-Origin-Resource-Policy: same-origin).

import { date, esc, money, shortWallet, size, stillOpen, timeLeft, winRate } from './format.js';
import { imageUrl } from './api.js';

/** The reward as it stands now: the prize plus entry fees paid into it. */
const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** Fee chip: '$0.50 fee' or 'Free'. */
const feeChip = (b) =>
  b.entryFeeUsd
    ? `<span class="chip fee">${money(b.entryFeeUsd)} fee</span>`
    : `<span class="chip free">Free</span>`;

/** Time-left chip: red under a day, green while open, grey when ended. */
const timeChip = (b) => {
  const ms = new Date(b.deadline).getTime() - Date.now();
  if (ms <= 0) return '<span class="chip closed">ended</span>';
  if (ms < 86400000) return `<span class="chip soon">${timeLeft(b.deadline)}</span>`;
  return `<span class="chip open">${timeLeft(b.deadline)}</span>`;
};

function totalPot(items) {
  return items.reduce((sum, b) => sum + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
}

function soonest(items) {
  const open = items.filter(stillOpen);
  if (!open.length) return null;
  return open.reduce((a, b) => (new Date(a.deadline) < new Date(b.deadline) ? a : b));
}

export function board(data) {
  // Still-open bounties first (soonest deadline), then ended ones at the
  // bottom: the API still lists a bounty as open past its deadline until
  // its results publish, so the deadline — not the status — decides.
  const items = [...(data.items ?? [])].sort(
    (a, b) => Number(stillOpen(b)) - Number(stillOpen(a)) || new Date(a.deadline) - new Date(b.deadline),
  );
  const openCount = items.filter(stillOpen).length;
  const next = soonest(items);
  const rows = items
    .map(
      (b) => `
      <tr data-title="${esc(`${b.title} ${b.slug} ${b.category ?? ''}`.toLowerCase())}">
        <td><a class="bounty-title" href="#/bounty/${encodeURIComponent(b.slug)}">${esc(b.title)}</a>
          <span class="bounty-cat">${esc(b.category ?? b.harnessKind ?? '')} · ${esc(b.slug)}</span></td>
        <td class="num"><span class="pot">${pot(b)}</span></td>
        <td class="num">${feeChip(b)}</td>
        <td class="num" data-deadline="${esc(b.deadline)}">${timeChip(b)}</td>
        <td class="num">${b.submissionCount ?? 0}</td>
      </tr>`,
    )
    .join('');
  return `
    <h1>Open bounties</h1>
    <p class="sub">Live from make.fun's public API — every pot, fee and deadline as it stands right now. Click a bounty for its rewards, rules and leaderboard.</p>
    <div class="hero">
      <div class="stat gold"><b>${money(totalPot(items))}</b><span>total live pots</span></div>
      <div class="stat"><b>${openCount} of ${items.length}</b><span>still taking entries</span></div>
      <div class="stat"><b>${next ? timeLeft(next.deadline) : '—'}</b><span>until the next deadline${next ? ` · ${esc(next.title)}` : ''}</span></div>
    </div>
    <input id="filter" class="search" type="search" placeholder="Filter bounties — try “chess”, “game”, “frontend”…" aria-label="Filter bounties">
    <table>
      <thead><tr><th>Bounty</th><th class="num">Pot</th><th class="num">Entry fee</th><th class="num">Closes in</th><th class="num">Entries</th></tr></thead>
      <tbody id="board-rows">${rows}</tbody>
    </table>
    <p class="sub" id="board-count"></p>`;
}

export function bounty(b) {
  const open = stillOpen(b);
  const rewards = (b.rewardsNow ?? [])
    .map(
      (r) => `
      <tr><td>${r.place === 1 ? '🥇' : r.place === 2 ? '🥈' : r.place === 3 ? '🥉' : `#${r.place}`}</td>
        <td class="num"><span class="pot">${money(r.amountUsd)}</span></td>
        <td class="num hide-m">${money(r.baseUsd)} prize + ${money(r.feeShareUsd)} fees</td></tr>`,
    )
    .join('');
  return `
    <a class="back" href="#/">← All bounties</a>
    <h1>${esc(b.title)}</h1>
    <p class="sub">${esc(b.summary ?? '')}</p>
    <p>${open ? '<span class="chip open">Open — taking entries</span>' : '<span class="chip closed">Closed — deadline passed</span>'}
       <span class="chip">${esc(b.harnessKind ?? '')}</span></p>
    <div class="stats4">
      <div class="stat gold"><b>${pot(b)}</b><span>live pot</span></div>
      <div class="stat"><b>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free'}</b><span>entry fee</span></div>
      <div class="stat"><b>${timeLeft(b.deadline)}</b><span>${date(b.deadline)}</span></div>
      <div class="stat"><b>${b.submissionCount ?? 0}</b><span>entries</span></div>
    </div>
    <div class="actions">
      <a class="btn" href="#/bounty/${encodeURIComponent(b.slug)}/leaderboard">Leaderboard →</a>
      <a class="btn ghost" href="https://make.fun/c/${encodeURIComponent(b.slug)}">Open on make.fun ↗</a>
    </div>
    ${rewards ? `<h2>Rewards — ${money(b.rewardAmount)} + entry fees</h2>
    <table><thead><tr><th>Place</th><th class="num">Wins now</th><th class="num hide-m">Split</th></tr></thead>
    <tbody>${rewards}</tbody></table>` : ''}
    <h2>What it asks for</h2>
    <div class="desc">${esc(b.description ?? '').slice(0, 4000)}</div>`;
}

export const LB_PAGE_SIZE = 25;

/** One page of leaderboard rows, for the pager in main.js. */
export function leaderboardRows(entries, page) {
  return entries
    .slice((page - 1) * LB_PAGE_SIZE, page * LB_PAGE_SIZE)
    .map((e) => {
      const rate = e.values?.judge;
      const low = e.values?.judge_low;
      const high = e.values?.judge_high;
      return `
      <tr>
        <td class="rank ${e.rank === 1 ? 'top1' : ''}">${e.rank}</td>
        <td><span class="who">
          ${e.image ? `<img crossorigin="anonymous" src="${esc(imageUrl(e.image))}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
          <span><a class="handle" href="#/u/${encodeURIComponent(e.handle)}">${esc(e.handle)}</a>
          <span class="entry-title">${esc(e.title ?? '')}</span></span>
        </span></td>
        <td class="num"><span class="rate">${winRate(rate)}</span>
          <span class="ratebar"><i style="width:${Math.min(100, Number(rate ?? 0) / 10000)}%"></i></span></td>
        <td class="num hide-m">${low != null && high != null ? `${winRate(low)}–${winRate(high)}` : '—'}</td>
        <td class="num hide-m">${size(e.values?.bytes)}</td>
      </tr>`;
    })
    .join('');
}

export function leaderboard(data) {
  const entries = data.entries ?? [];
  const title = data.competition?.title ?? 'Leaderboard';
  const phase = data.phase?.title ?? '';
  const pages = Math.max(1, Math.ceil(entries.length / LB_PAGE_SIZE));
  return `
    <a class="back" href="#/bounty/${encodeURIComponent(data.competition?.slug ?? '')}">← Back to bounty</a>
    <h1>${esc(title)} — leaderboard</h1>
    <p class="sub">${esc(phase)} · ${entries.length} judged entries · win rate with its 90% interval · size is the dossier in bytes.</p>
    <table>
      <thead><tr><th>#</th><th>Entry</th><th class="num">Win rate</th><th class="num hide-m">Interval</th><th class="num hide-m">Size</th></tr></thead>
      <tbody id="lb-rows">${leaderboardRows(entries, 1)}</tbody>
    </table>
    <div class="pager">
      <button id="lb-prev" disabled>← Prev</button>
      <span id="lb-page">Page 1 of ${pages}</span>
      <button id="lb-next" ${pages <= 1 ? 'disabled' : ''}>Next →</button>
    </div>`;
}

export function profile(p) {
  const r = p.record ?? {};
  const sols = (p.solutions ?? [])
    .map(
      (s) => `<li><span class="sol-title">${esc(s.title ?? s.competition_slug ?? 'Entry')}</span>
        <span class="sol-meta">${esc(s.competition_slug ?? '')}${s.place ? ` · placed #${s.place}` : ''}</span></li>`,
    )
    .join('');
  return `
    <a class="back" href="#/">← All bounties</a>
    <div class="profile">
      ${p.avatar || p.image ? `<img class="avatar" crossorigin="anonymous" src="${esc(imageUrl(p.avatar || p.image))}" alt="" onerror="this.style.display='none'">` : ''}
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="handle">@${esc(p.handle)} · joined ${date(p.joined_at)}</p>
        ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ''}
        ${p.wallet?.address ? `<p class="bio">Wallet <a href="${esc(p.wallet.explorer_url ?? '')}">${shortWallet(p.wallet.address)}</a></p>` : ''}
      </div>
    </div>
    <div class="hero">
      <div class="stat"><b>${r.competitions_entered ?? 0}</b><span>competitions entered</span></div>
      <div class="stat gold"><b>${r.competitions_won ?? 0}</b><span>won · ${r.podium_finishes ?? 0} podiums</span></div>
      <div class="stat"><b>${money(r.prize_usd)}</b><span>prize money</span></div>
    </div>
    <h2>Entries</h2>
    ${sols ? `<ul class="solutions">${sols}</ul>` : '<p class="sub">No entries yet.</p>'}`;
}

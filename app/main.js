// A make.fun frontend: board, bounty page, leaderboard and profile, on hash routes.
//
//   #/                              the board of open bounties
//   #/bounty/<slug>                 one bounty: rewards, dates, rules
//   #/bounty/<slug>/leaderboard     that bounty's leaderboard
//   #/u/<handle>                    an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is
// on screen, so a screenshot script knows when to capture. Time-left chips
// tick every 30 seconds by updating their text in place — the page is never
// rebuilt for a tick — and the leaderboard pager swaps only its rows.

import { getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { board, bounty, leaderboard, leaderboardRows, LB_PAGE_SIZE, profile } from './views.js';
import { timeLeft } from './format.js';

const app = document.getElementById('app');
let ticker = null;

function stopTicker() {
  if (ticker) clearInterval(ticker);
  ticker = null;
}

/** Board countdowns, refreshed in place without rebuilding the page. */
function startTicker() {
  stopTicker();
  ticker = setInterval(() => {
    for (const cell of app.querySelectorAll('[data-deadline]')) {
      const chip = cell.querySelector('.chip');
      if (chip) chip.textContent = timeLeft(cell.dataset.deadline);
    }
  }, 30000);
}

function fail(err) {
  app.innerHTML = `<p class="error">Could not load live data from make.fun (${err.message}). <a href="${location.hash || '#/'}">Try again</a>.</p>`;
}

function nav(route) {
  for (const a of document.querySelectorAll('[data-nav]')) {
    a.classList.toggle('on', a.dataset.nav === route);
  }
}

async function render() {
  window.__shotReady = false;
  stopTicker();
  const hash = location.hash || '#/';
  const lb = hash.match(/^#\/bounty\/([^/]+)\/leaderboard$/);
  const bp = hash.match(/^#\/bounty\/([^/]+)$/);
  const pf = hash.match(/^#\/u\/([^/]+)$/);
  try {
    if (lb) {
      const slug = decodeURIComponent(lb[1]);
      const data = await getLeaderboard(slug);
      document.title = `${data.competition?.title ?? slug} leaderboard | make.fun`;
      app.innerHTML = leaderboard(data);
      nav('bounty');
      const entries = data.entries ?? [];
      const pages = Math.max(1, Math.ceil(entries.length / LB_PAGE_SIZE));
      let page = 1;
      const rows = document.getElementById('lb-rows');
      const label = document.getElementById('lb-page');
      const prev = document.getElementById('lb-prev');
      const next = document.getElementById('lb-next');
      const paint = () => {
        rows.innerHTML = leaderboardRows(entries, page);
        label.textContent = `Page ${page} of ${pages}`;
        prev.disabled = page <= 1;
        next.disabled = page >= pages;
      };
      prev.addEventListener('click', () => { if (page > 1) { page -= 1; paint(); } });
      next.addEventListener('click', () => { if (page < pages) { page += 1; paint(); } });
    } else if (bp) {
      const slug = decodeURIComponent(bp[1]);
      const b = await getBounty(slug);
      document.title = `${b.title} | make.fun`;
      app.innerHTML = bounty(b);
      nav('bounty');
    } else if (pf) {
      const handle = decodeURIComponent(pf[1]);
      const p = await getProfile(handle);
      document.title = `${p.display_name ?? p.handle} | make.fun`;
      app.innerHTML = profile(p);
      nav('board');
    } else {
      const data = await getBounties();
      document.title = 'make.fun bounties';
      app.innerHTML = board(data);
      nav('board');
      const input = document.getElementById('filter');
      const rowsEl = document.getElementById('board-rows');
      const count = document.getElementById('board-count');
      const all = [...rowsEl.querySelectorAll('tr')];
      const apply = () => {
        const q = input.value.trim().toLowerCase();
        let shown = 0;
        for (const row of all) {
          const hit = !q || row.dataset.title.includes(q);
          row.style.display = hit ? '' : 'none';
          if (hit) shown += 1;
        }
        count.textContent = q ? `${shown} of ${all.length} bounties match “${input.value.trim()}”` : '';
      };
      input.addEventListener('input', apply);
      startTicker();
    }
  } catch (err) {
    fail(err);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

window.addEventListener('hashchange', render);
render();

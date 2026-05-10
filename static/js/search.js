import { S }                    from './state.js';
import { esc, cleanTitle } from './utils.js';
import { playFromList }         from './player.js';

const API = '';

/* ─── Entry points ─── */
export async function doSearch() {
  const q = document.getElementById('main-search-input').value.trim();
  if (!q) return;
  await runSearch(q, 'search-results-wrap');
}

export async function doMobileSearch() {
  const q = document.getElementById('mob-search-input').value.trim();
  if (!q) return;
  await runSearch(q, 'mob-results');
}

/* ─── Core search ─── */
let _lastResults = [];   // track last result set so auto-queue works

export async function runSearch(query, containerId) {
  const wrap = document.getElementById(containerId);
  const lb   = document.getElementById('loading-bar');

  wrap.innerHTML = `<div class="idle-state"><div style="font-family:var(--font-m);color:var(--muted);font-size:12px;letter-spacing:2px">SEARCHING…</div></div>`;
  if (lb) lb.classList.add('active');

  try {
    const res = await fetch(`${API}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    data.results.forEach(e => { e.title = cleanTitle(e.title, e.channel); });
    _lastResults = data.results || [];
    renderResults(_lastResults, wrap, 'search');
  } catch {
    wrap.innerHTML = `<div class="idle-state"><div class="idle-icon">⚠️</div><div class="idle-title">BACKEND OFFLINE</div><div class="idle-sub">Start your Flask server to search.</div></div>`;
  }

  if (lb) lb.classList.remove('active');
}

/* ─── Render helpers ─── */
export function renderResults(results, wrap, source = 'search') {
  if (!results.length) {
    wrap.innerHTML = `<div class="idle-state"><div class="idle-icon">😶</div><div class="idle-title">NO RESULTS</div><div class="idle-sub">Try a different search term.</div></div>`;
    return;
  }
  wrap.innerHTML = `
    <div style="margin-bottom:12px;font-family:var(--font-m);font-size:10px;color:var(--muted);letter-spacing:2px">${results.length} RESULTS</div>
    <ul class="results-list stagger">${results.map((r, i) => makeResultItem(r, i, results, source)).join('')}</ul>`;
}

export function makeResultItem(r, i, list = [], source = 'search') {
  const listJson = JSON.stringify(list).replace(/"/g, '&quot;');
  const trackJson = JSON.stringify(r).replace(/"/g, '&quot;');
  return `<li class="result-item" id="ri-${r.id}"
      onclick='window.__px7.playFromList(${JSON.stringify(r)}, ${JSON.stringify(list)}, "${source}")'>
    <span class="result-num">${i + 1}</span>
    <div class="result-thumb">${r.thumb
      ? `<img src="${r.thumb}" loading="lazy"/>`
      : `<div class="result-thumb-ph">${r.emoji || '🎵'}</div>`}</div>
    <div class="result-info">
      <div class="result-title">${esc(r.title)}</div>
      <div class="result-channel">${esc(r.channel || '')}</div>
    </div>
    <span class="result-dur">${r.duration || ''}</span>
    <button class="result-add" title="Add to queue"
        onclick="event.stopPropagation();window.__px7.addToQueue(event,${trackJson})">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
    </button>
  </li>`;
}

export function getLastResults() { return _lastResults; }
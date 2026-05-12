import { S }             from './state.js';
import { esc, cleanTitle } from './utils.js';
import { playFromList }   from './player.js';
import { addToQueue }     from './queue.js';

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
let _lastResults = [];

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

/* ─── Track registry ────────────────────────────────────────────────────────
 * Maps track id → { track, list, source } so click handlers never need to
 * round-trip through serialised HTML attributes. Eliminates the
 * special-character injection bug entirely.
 * -------------------------------------------------------------------------- */
const _trackRegistry = new Map();

function registerTrack(track, list, source) {
  _trackRegistry.set(track.id, { track, list, source });
}

/* ─── Render helpers ─── */
export function renderResults(results, wrap, source = 'search') {
  if (!results.length) {
    wrap.innerHTML = `<div class="idle-state"><div class="idle-icon">😶</div><div class="idle-title">NO RESULTS</div><div class="idle-sub">Try a different search term.</div></div>`;
    return;
  }

  results.forEach(r => registerTrack(r, results, source));

  const ul = document.createElement('ul');
  ul.className = 'results-list stagger';
  results.forEach((r, i) => ul.appendChild(makeResultItem(r, i, results, source)));

  wrap.innerHTML = `<div style="margin-bottom:12px;font-family:var(--font-m);font-size:10px;color:var(--muted);letter-spacing:2px">${results.length} RESULTS</div>`;
  wrap.appendChild(ul);

  // Single delegated listener — no inline onclick on individual items
  ul.addEventListener('click', e => {
    const addBtn = e.target.closest('.result-add');
    if (addBtn) {
      e.stopPropagation();
      const id  = addBtn.closest('.result-item')?.dataset.id;
      const reg = id && _trackRegistry.get(id);
      if (reg) addToQueue(e, reg.track);
      return;
    }
    const item = e.target.closest('.result-item');
    if (!item) return;
    const reg = _trackRegistry.get(item.dataset.id);
    if (reg) playFromList(reg.track, reg.list, reg.source);
  });
}

/**
 * Build a single result <li> using DOM APIs — no innerHTML with track data,
 * so special characters in titles/channels can never break click handlers.
 */
export function makeResultItem(r, i, list = [], source = 'search') {
  registerTrack(r, list, source);

  const li = document.createElement('li');
  li.className  = 'result-item';
  li.id         = 'ri-' + r.id;
  li.dataset.id = r.id;

  const numSpan = document.createElement('span');
  numSpan.className   = 'result-num';
  numSpan.textContent = i + 1;

  const thumbDiv = document.createElement('div');
  thumbDiv.className = 'result-thumb';
  if (r.thumb) {
    const img = document.createElement('img');
    img.src     = r.thumb;
    img.loading = 'lazy';
    thumbDiv.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className   = 'result-thumb-ph';
    ph.textContent = r.emoji || '🎵';
    thumbDiv.appendChild(ph);
  }

  const infoDiv = document.createElement('div');
  infoDiv.className = 'result-info';
  const titleDiv = document.createElement('div');
  titleDiv.className   = 'result-title';
  titleDiv.textContent = r.title;       // textContent — never interpreted as HTML
  const chanDiv = document.createElement('div');
  chanDiv.className   = 'result-channel';
  chanDiv.textContent = r.channel || '';
  infoDiv.appendChild(titleDiv);
  infoDiv.appendChild(chanDiv);

  const durSpan = document.createElement('span');
  durSpan.className   = 'result-dur';
  durSpan.textContent = r.duration || '';

  const addBtn = document.createElement('button');
  addBtn.className = 'result-add';
  addBtn.title     = 'Add to queue';
  addBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>`;

  li.appendChild(numSpan);
  li.appendChild(thumbDiv);
  li.appendChild(infoDiv);
  li.appendChild(durSpan);
  li.appendChild(addBtn);

  return li;
}

export function getLastResults() { return _lastResults; }
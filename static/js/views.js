import { S }               from './state.js';
import { esc }             from './utils.js';
import { playFromList }    from './player.js';
import { makeResultItem }  from './search.js';
import { doSearch }        from './search.js';

/* ─── View switching ─── */
export function setView(name, el) {
  document.querySelectorAll('[id^="view-"]').forEach(v => v.style.display = 'none');
  document.getElementById('view-' + name).style.display = 'block';

  document.querySelectorAll('[data-view]').forEach(n => n.classList.remove('active'));
  document.querySelectorAll(`[data-view="${name}"]`).forEach(n => n.classList.add('active'));

  if (name === 'liked')  renderLiked();
  if (name === 'recent') renderRecentPlayed();
  if (name === 'search') setTimeout(() => document.getElementById('main-search-input')?.focus(), 100);
}

/* ─── Home grids ─── */
export async function loadFeatured() {
  try {
    const res  = await fetch('/api/trending');
    const data = await res.json();
    renderGrid('featured-grid', data.results || [], 'featured');
  } catch (err) {
    console.error(err);
  }
}

export function renderGrid(id, tracks, source = 'featured') {
  document.getElementById(id).innerHTML = tracks.map(t => `
    <div class="card" onclick='window.__px7.playFromList(${JSON.stringify(t)}, ${JSON.stringify(tracks)}, "${source}")'>
      <div class="card-art">
        ${t.thumb
          ? `<img src="${t.thumb}" loading="lazy"/>`
          : `<div class="card-art-ph">${t.emoji || '🎵'}</div>`}
        <div class="card-play-overlay"><div class="card-play-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </div></div>
      </div>
      <div class="card-info">
        <div class="card-title">${esc(t.title)}</div>
        <div class="card-sub">${esc(t.channel)}</div>
      </div>
    </div>`).join('');
}

/* ─── Liked view ─── */
export function renderLiked() {
  const c = document.getElementById('liked-content');
  c.innerHTML = S.liked.length
    ? `<ul class="results-list stagger">${S.liked.map((r, i) => makeResultItem(r, i, S.liked, 'liked')).join('')}</ul>`
    : `<div class="idle-state fade-up">
        <div class="idle-icon">💛</div>
        <div class="idle-title">NO LIKES YET</div>
        <div class="idle-sub">Hit the heart on any track to save it here.</div>
      </div>`;
}

/* ─── Recent view ─── */
export function renderRecentPlayed() {
  const c = document.getElementById('recent-content');
  c.innerHTML = S.recent.length
    ? `<ul class="results-list stagger">${S.recent.map((r, i) => makeResultItem(r, i, S.recent, 'recent')).join('')}</ul>`
    : `<div class="idle-state fade-up">
        <div class="idle-icon">🕐</div>
        <div class="idle-title">NOTHING YET</div>
        <div class="idle-sub">Your listening history will show up here.</div>
      </div>`;
}

/* ─── Genre chips ─── */
export function filterGenre(el, genre) {
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  setView('search', document.querySelector('[data-view="search"]'));
  if (genre !== 'all') {
    document.getElementById('main-search-input').value = genre;
    doSearch();
  }
}

/* ─── Mobile search drawer ─── */
export function openMobileSearch() {
  document.getElementById('mobile-search').classList.add('open');
  setTimeout(() => document.getElementById('mob-search-input')?.focus(), 150);
}
export function closeMobileSearch() {
  document.getElementById('mobile-search').classList.remove('open');
}

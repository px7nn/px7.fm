import { S }              from './state.js';
import { playFromList }   from './player.js';
import { makeResultItem } from './search.js';
import { doSearch }       from './search.js';
import { addToQueue }     from './queue.js';

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

/**
 * Renders a card grid using DOM APIs so special characters in track titles /
 * channel names can never break click handlers or markup.
 */
export function renderGrid(id, tracks, source = 'featured') {
  const grid = document.getElementById(id);
  grid.innerHTML = '';
  tracks.forEach(t => grid.appendChild(_buildCard(t, tracks, source)));
}

function _buildCard(t, tracks, source) {
  const div = document.createElement('div');
  div.className = 'card';
  div.addEventListener('click', () => playFromList(t, tracks, source));

  const artDiv = document.createElement('div');
  artDiv.className = 'card-art';
  if (t.thumb) {
    const img = document.createElement('img');
    img.src     = t.thumb;
    img.loading = 'lazy';
    artDiv.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className   = 'card-art-ph';
    ph.textContent = t.emoji || '🎵';
    artDiv.appendChild(ph);
  }
  // Play overlay is static SVG — safe to use innerHTML here
  artDiv.innerHTML += `<div class="card-play-overlay"><div class="card-play-btn">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
  </div></div>`;

  const infoDiv = document.createElement('div');
  infoDiv.className = 'card-info';
  const titleDiv = document.createElement('div');
  titleDiv.className   = 'card-title';
  titleDiv.textContent = t.title;
  const subDiv = document.createElement('div');
  subDiv.className   = 'card-sub';
  subDiv.textContent = t.channel || '';
  infoDiv.appendChild(titleDiv);
  infoDiv.appendChild(subDiv);

  div.appendChild(artDiv);
  div.appendChild(infoDiv);
  return div;
}

/* ─── Liked view ─── */
export function renderLiked() {
  const c = document.getElementById('liked-content');
  c.innerHTML = '';
  if (!S.liked.length) {
    c.innerHTML = `<div class="idle-state fade-up">
      <div class="idle-icon">💛</div>
      <div class="idle-title">NO LIKES YET</div>
      <div class="idle-sub">Hit the heart on any track to save it here.</div>
    </div>`;
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'results-list stagger';
  S.liked.forEach((r, i) => ul.appendChild(makeResultItem(r, i, S.liked, 'liked')));
  _attachListListener(ul, S.liked, 'liked');
  c.appendChild(ul);
}

/* ─── Recent view ─── */
export function renderRecentPlayed() {
  const c = document.getElementById('recent-content');
  c.innerHTML = '';
  if (!S.recent.length) {
    c.innerHTML = `<div class="idle-state fade-up">
      <div class="idle-icon">🕐</div>
      <div class="idle-title">NOTHING YET</div>
      <div class="idle-sub">Your listening history will show up here.</div>
    </div>`;
    return;
  }
  const ul = document.createElement('ul');
  ul.className = 'results-list stagger';
  S.recent.forEach((r, i) => ul.appendChild(makeResultItem(r, i, S.recent, 'recent')));
  _attachListListener(ul, S.recent, 'recent');
  c.appendChild(ul);
}

/**
 * Delegated click listener for liked/recent lists.
 * The track registry in search.js already mapped id → track/list/source
 * when makeResultItem was called, so we look up from the list directly.
 */
function _attachListListener(ul, list, source) {
  ul.addEventListener('click', e => {
    const addBtn = e.target.closest('.result-add');
    if (addBtn) {
      e.stopPropagation();
      const id    = addBtn.closest('.result-item')?.dataset.id;
      const track = list.find(t => t.id === id);
      if (track) addToQueue(e, track);
      return;
    }
    const item  = e.target.closest('.result-item');
    if (!item) return;
    const track = list.find(t => t.id === item.dataset.id);
    if (track) playFromList(track, list, source);
  });
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
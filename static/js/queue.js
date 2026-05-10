import { S } from './state.js';
import { esc } from './utils.js';
import { showToast } from './utils.js';

/**
 * Replace the entire queue with a new list and optionally set the active index.
 * @param {Array}  list   - array of track objects
 * @param {number} [idx]  - index of the currently playing track (default 0)
 */
export function setQueue(list, idx = 0) {
  S.queue = [...list];
  S.qi    = idx;
  renderQueue();
}

export function addToQueue(e, track) {
  e.stopPropagation();
  S.queue.push(track);
  renderQueue();
  showToast('➕ Added to queue');
}

export function clearQueue() {
  S.queue = [];
  S.qi    = -1;
  renderQueue();
}

export function renderQueue() {
  const list = document.getElementById('queue-list');
  if (!S.queue.length) {
    list.innerHTML = `<li style="padding:12px 10px;font-size:12px;color:var(--muted2);text-align:center;font-family:var(--font-m);letter-spacing:1px">EMPTY</li>`;
    return;
  }
  list.innerHTML = S.queue.map((t, i) => `
    <li class="queue-item ${S.qi === i ? 'playing' : ''}"
        onclick="window.__px7.playQueueItem(${i})">
      <div class="queue-thumb">${t.thumb
        ? `<img src="${t.thumb}"/>`
        : `<div class="queue-thumb-ph">${t.emoji || '🎵'}</div>`}</div>
      <div class="queue-info">
        <div class="queue-name">${esc(t.title)}</div>
        <div class="queue-artist">${esc(t.channel || '')}</div>
      </div>
      <span class="queue-dur">${t.duration || ''}</span>
    </li>`).join('');
}

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
  if (e) e.stopPropagation();
  S.queue.push(track);
  renderQueue();
  showToast('➕ Added to queue');
}

export function clearQueue() {
  S.queue = [];
  S.qi    = -1;
  renderQueue();
}

/* ─── Drag state ─── */
let _dragIdx  = null;   // index being dragged
let _dragEl   = null;   // the li element being dragged
let _placeholder = null;

export function renderQueue() {
  const list = document.getElementById('queue-list');
  if (!S.queue.length) {
    list.innerHTML = `<li style="padding:12px 10px;font-size:12px;color:var(--muted2);text-align:center;font-family:var(--font-m);letter-spacing:1px">EMPTY</li>`;
    return;
  }

  list.innerHTML = S.queue.map((t, i) => `
    <li class="queue-item ${S.qi === i ? 'playing' : ''}"
        data-idx="${i}"
        draggable="true">
      <span class="queue-drag-handle" title="Drag to reorder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.35">
          <circle cx="9" cy="5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="5" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="12" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="9" cy="19" r="1.5" fill="currentColor" stroke="none"/>
          <circle cx="15" cy="19" r="1.5" fill="currentColor" stroke="none"/>
        </svg>
      </span>
      <div class="queue-thumb">${t.thumb
        ? `<img src="${t.thumb}"/>`
        : `<div class="queue-thumb-ph">${t.emoji || '🎵'}</div>`}</div>
      <div class="queue-info">
        <div class="queue-name">${esc(t.title)}</div>
        <div class="queue-artist">${esc(t.channel || '')}</div>
      </div>
      <span class="queue-dur">${t.duration || ''}</span>
    </li>`).join('');

  // ── Click to play ──
  list.querySelectorAll('.queue-item').forEach(li => {
    li.addEventListener('click', e => {
      if (e.target.closest('.queue-drag-handle')) return;
      const i = parseInt(li.dataset.idx, 10);
      window.__px7.playQueueItem(i);
    });
  });

  // ── Drag-to-reorder ──
  _initDrag(list);
}

function _initDrag(list) {
  let overEl = null;

  list.addEventListener('dragstart', e => {
    const li = e.target.closest('.queue-item');
    if (!li) return;
    _dragIdx = parseInt(li.dataset.idx, 10);
    _dragEl  = li;

    // Ghost: semi-transparent
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', _dragIdx);

    // Slight delay so the drag image captures before we dim
    requestAnimationFrame(() => li.classList.add('dragging'));
  });

  list.addEventListener('dragend', e => {
    if (_dragEl) _dragEl.classList.remove('dragging');
    list.querySelectorAll('.queue-item').forEach(li => li.classList.remove('drag-over-top', 'drag-over-bot'));
    _dragIdx = null;
    _dragEl  = null;
    overEl   = null;
  });

  list.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const li = e.target.closest('.queue-item');
    if (!li || li === _dragEl) return;

    // Clear previous indicators
    if (overEl && overEl !== li) {
      overEl.classList.remove('drag-over-top', 'drag-over-bot');
    }
    overEl = li;

    const rect   = li.getBoundingClientRect();
    const midY   = rect.top + rect.height / 2;
    const isTop  = e.clientY < midY;
    li.classList.toggle('drag-over-top', isTop);
    li.classList.toggle('drag-over-bot', !isTop);
  });

  list.addEventListener('dragleave', e => {
    const li = e.target.closest('.queue-item');
    if (li) li.classList.remove('drag-over-top', 'drag-over-bot');
  });

  list.addEventListener('drop', e => {
    e.preventDefault();
    const targetLi = e.target.closest('.queue-item');
    if (!targetLi || _dragIdx === null) return;

    targetLi.classList.remove('drag-over-top', 'drag-over-bot');

    let toIdx = parseInt(targetLi.dataset.idx, 10);

    // Determine drop position (above or below target)
    const rect  = targetLi.getBoundingClientRect();
    const midY  = rect.top + rect.height / 2;
    const after = e.clientY >= midY;
    if (after) toIdx += 1;

    // Don't do anything if dropped on itself or adjacent
    if (toIdx === _dragIdx || toIdx === _dragIdx + 1) return;

    // Reorder S.queue
    const moved = S.queue.splice(_dragIdx, 1)[0];
    const insertAt = toIdx > _dragIdx ? toIdx - 1 : toIdx;
    S.queue.splice(insertAt, 0, moved);

    // Update S.qi to follow the currently-playing track
    if (S.qi === _dragIdx) {
      S.qi = insertAt;
    } else {
      // Adjust qi if it was displaced
      if (_dragIdx < S.qi && insertAt >= S.qi) S.qi--;
      else if (_dragIdx > S.qi && insertAt <= S.qi) S.qi++;
    }

    renderQueue();
    showToast('↕️ Queue reordered');
  });

  // ── Touch drag support (mobile) ──
  _initTouchDrag(list);
}

/* ─── Touch-based drag reorder for mobile ─── */
function _initTouchDrag(list) {
  let touchDragIdx = null;
  let touchDragEl  = null;
  let ghost        = null;
  let startY       = 0;

  list.addEventListener('touchstart', e => {
    const handle = e.target.closest('.queue-drag-handle');
    if (!handle) return;
    const li = handle.closest('.queue-item');
    if (!li) return;

    touchDragIdx = parseInt(li.dataset.idx, 10);
    touchDragEl  = li;
    startY = e.touches[0].clientY;

    // Create visual ghost
    ghost = li.cloneNode(true);
    ghost.style.cssText = `
      position:fixed;left:${li.getBoundingClientRect().left}px;
      top:${li.getBoundingClientRect().top}px;
      width:${li.offsetWidth}px;opacity:0.75;
      background:var(--bg4);border-radius:8px;
      pointer-events:none;z-index:9999;transition:none;
    `;
    document.body.appendChild(ghost);
    li.style.opacity = '0.3';
  }, { passive: true });

  list.addEventListener('touchmove', e => {
    if (touchDragIdx === null || !ghost) return;
    e.preventDefault();

    const dy = e.touches[0].clientY - startY;
    ghost.style.top = (parseFloat(ghost.style.top) + dy) + 'px';
    startY = e.touches[0].clientY;

    // Highlight target
    list.querySelectorAll('.queue-item').forEach(li => li.classList.remove('drag-over-top', 'drag-over-bot'));
    const target = document.elementFromPoint(
      e.touches[0].clientX, e.touches[0].clientY
    )?.closest('.queue-item');
    if (target && target !== touchDragEl) {
      const rect = target.getBoundingClientRect();
      const isTop = e.touches[0].clientY < rect.top + rect.height / 2;
      target.classList.toggle('drag-over-top', isTop);
      target.classList.toggle('drag-over-bot', !isTop);
    }
  }, { passive: false });

  list.addEventListener('touchend', e => {
    if (touchDragIdx === null) return;

    if (ghost) { ghost.remove(); ghost = null; }
    if (touchDragEl) { touchDragEl.style.opacity = ''; touchDragEl = null; }

    list.querySelectorAll('.queue-item').forEach(li => li.classList.remove('drag-over-top', 'drag-over-bot'));

    const target = document.elementFromPoint(
      e.changedTouches[0].clientX, e.changedTouches[0].clientY
    )?.closest('.queue-item');

    if (target) {
      let toIdx = parseInt(target.dataset.idx, 10);
      const rect  = target.getBoundingClientRect();
      const after = e.changedTouches[0].clientY >= rect.top + rect.height / 2;
      if (after) toIdx += 1;

      if (toIdx !== touchDragIdx && toIdx !== touchDragIdx + 1) {
        const moved = S.queue.splice(touchDragIdx, 1)[0];
        const insertAt = toIdx > touchDragIdx ? toIdx - 1 : toIdx;
        S.queue.splice(insertAt, 0, moved);

        if (S.qi === touchDragIdx) S.qi = insertAt;
        else if (touchDragIdx < S.qi && insertAt >= S.qi) S.qi--;
        else if (touchDragIdx > S.qi && insertAt <= S.qi) S.qi++;

        renderQueue();
        showToast('↕️ Queue reordered');
      }
    }

    touchDragIdx = null;
  }, { passive: true });
}
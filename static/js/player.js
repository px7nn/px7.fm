import { setMediaMetadata, setMediaPlaybackState, updatePositionState } from './mediasession.js';
import { S, persistLiked, persistRecent } from './state.js';
import { fmt, showToast }                 from './utils.js';
import { setQueue, renderQueue }          from './queue.js';

const API = '';

/* ─── Loading state helpers ─── */
function setLoadingState(loading) {
  const btn = document.getElementById('play-btn');
  const art = document.getElementById('now-art');
  btn.classList.toggle('loading', loading);
  art.classList.toggle('loading', loading);
  if (loading) {
    document.getElementById('play-icon').style.display  = 'none';
    document.getElementById('pause-icon').style.display = 'none';
  }
}

/* ─── Public: play a track ─── */
export async function playTrack(track) {
  const audio = document.getElementById('audio-el');

  // ① Stop current playback INSTANTLY
  audio.pause();
  audio.src = '';

  // ② Update UI immediately — user sees feedback before any network call
  S.track   = track;
  S.playing = false;
  updateNowPlaying(track);
  setMediaMetadata(track);
  setMediaPlaybackState(false);
  setLoadingState(true);
  addToRecent(track);

  // ③ Highlight the clicked row right away
  document.querySelectorAll('.result-item').forEach(el => el.classList.remove('playing'));
  document.getElementById('ri-' + track.id)?.classList.add('playing');

  // ④ Fetch stream URL (slow part — spinner is already visible)
  try {
    const res = await fetch(`${API}/api/stream?id=${track.id}`);
    if (!res.ok) throw new Error('stream error');
    const data = await res.json();

    // Guard: user may have clicked a different track while this was loading
    if (S.track?.id !== track.id) return;

    audio.src = data.stream_url;
    await audio.play();
  } catch {
    if (S.track?.id === track.id) {
      setLoadingState(false);
      setPlayState(false);
      showToast('⚠️ Start your Flask backend to stream audio');
    }
  }
}

/* ─── Play from a list (auto-fills queue) ─── */
export function playFromList(track, list, source) {
  const idx = list.findIndex(t => t.id === track.id);
  S.queueSource = source;
  S.sourceList  = list;
  setQueue(list, idx === -1 ? 0 : idx);
  playTrack(track);
}

/* ─── Now-playing display ─── */
function updateNowPlaying(t) {
  document.getElementById('now-title').textContent   = t.title;
  document.getElementById('now-channel').textContent = t.channel || '';

  const art = document.getElementById('now-art');
  art.innerHTML = (t.thumb
    ? `<img src="${t.thumb}"/>`
    : `<div class="now-art-ph">${t.emoji || '🎵'}</div>`)
    + `<div class="art-spinner"></div>`;

  const liked = S.liked.some(x => x.id === t.id);
  document.getElementById('like-btn').classList.toggle('liked', liked);
  document.getElementById('like-icon').style.fill   = liked ? 'var(--accent)' : 'none';
  document.getElementById('like-icon').style.stroke = liked ? 'var(--accent)' : 'currentColor';
}

/* ─── Audio engine ─── */
export function initAudio() {
  const a = document.getElementById('audio-el');
  a.volume = S.vol;

  a.addEventListener('timeupdate', () => {
    if (!a.duration) return;
    const p = (a.currentTime / a.duration) * 100;
    document.getElementById('progress-fill').style.width = p + '%';
    document.getElementById('time-fill').style.width     = p + '%';
    document.getElementById('time-cur').textContent = fmt(a.currentTime);
    document.getElementById('time-dur').textContent = fmt(a.duration);
    updatePositionState();
  });

  // 'playing' fires when audio actually starts outputting — clear spinner here
  a.addEventListener('playing', () => { setLoadingState(false); setPlayState(true); });
  // 'waiting' fires when browser stalls mid-playback (rebuffering)
  a.addEventListener('waiting', () => setLoadingState(true));
  a.addEventListener('canplay', () => { if (!a.paused) setLoadingState(false); });
  a.addEventListener('ended',   () => { if (S.repeat) { a.currentTime = 0; a.play(); } else nextTrack(); });
  a.addEventListener('play',    () => setPlayState(true));
  a.addEventListener('pause',   () => setPlayState(false));

  initVolumeDrag();
}

function setPlayState(p) {
  S.playing = p;
  document.getElementById('play-icon').style.display  = p ? 'none'  : 'block';
  document.getElementById('pause-icon').style.display = p ? 'block' : 'none';
  setMediaPlaybackState(p);
}

/* ─── Draggable volume slider (mouse + touch) ─── */
function initVolumeDrag() {
  const bar = document.getElementById('vol-bar');
  let dragging = false;

  function applyVolume(clientX) {
    const rect = bar.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    S.vol = pct;
    document.getElementById('vol-fill').style.width = pct * 100 + '%';
    document.getElementById('audio-el').volume = pct;
  }

  bar.addEventListener('mousedown', e => { dragging = true; applyVolume(e.clientX); });
  document.addEventListener('mousemove', e => { if (dragging) applyVolume(e.clientX); });
  document.addEventListener('mouseup', () => { dragging = false; });

  bar.addEventListener('touchstart', e => { dragging = true; applyVolume(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchmove', e => { if (dragging) applyVolume(e.touches[0].clientX); }, { passive: true });
  document.addEventListener('touchend', () => { dragging = false; });
}

/* ─── Controls ─── */
export function togglePlay() {
  const a = document.getElementById('audio-el');
  if (!S.track) { showToast('Search for a track first'); return; }
  a.paused ? a.play() : a.pause();
}

export function seekBar(e) {
  const a = document.getElementById('audio-el');
  if (!a.duration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  a.currentTime = pct * a.duration;
}

export function setVolume(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  S.vol = pct;
  document.getElementById('vol-fill').style.width = pct * 100 + '%';
  document.getElementById('audio-el').volume = pct;
}

export function toggleMute() {
  const a = document.getElementById('audio-el');
  S.muted = !S.muted;
  a.muted = S.muted;
  document.getElementById('vol-icon').style.display  = S.muted ? 'none'  : 'block';
  document.getElementById('mute-icon').style.display = S.muted ? 'block' : 'none';
}

export function toggleShuffle() {
  S.shuffle = !S.shuffle;
  document.getElementById('shuffle-btn').classList.toggle('active', S.shuffle);
  showToast(S.shuffle ? '🔀 Shuffle On' : 'Shuffle Off');
}

export function toggleRepeat() {
  S.repeat = !S.repeat;
  document.getElementById('repeat-btn').classList.toggle('active', S.repeat);
  showToast(S.repeat ? '🔁 Repeat On' : 'Repeat Off');
}

export function prevTrack() {
  const a = document.getElementById('audio-el');
  if (a.currentTime > 3) { a.currentTime = 0; return; }
  if (S.qi > 0) { S.qi--; playTrack(S.queue[S.qi]); renderQueue(); }
}

export function nextTrack() {
  if (!S.queue.length) return;
  S.qi = S.shuffle
    ? Math.floor(Math.random() * S.queue.length)
    : Math.min(S.qi + 1, S.queue.length - 1);
  if (S.queue[S.qi]) { playTrack(S.queue[S.qi]); renderQueue(); }
}

export function playQueueItem(i) {
  S.qi = i;
  playTrack(S.queue[i]);
  renderQueue();
}

/* ─── Like ─── */
export function toggleLike() {
  if (!S.track) return;
  const t   = S.track;
  const idx = S.liked.findIndex(x => x.id === t.id);
  if (idx === -1) { S.liked.unshift(t); showToast('💛 Liked!'); }
  else            { S.liked.splice(idx, 1); showToast('Removed from liked'); }
  persistLiked();
  updateNowPlaying(t);
}

/* ─── Recent ─── */
function addToRecent(t) {
  S.recent = S.recent.filter(x => x.id !== t.id);
  S.recent.unshift(t);
  S.recent = S.recent.slice(0, 50);
  persistRecent();
  // Keep home grid in sync
  const grid = document.getElementById('recent-grid');
  if (grid) {
    import('./views.js').then(({ renderGrid }) => renderGrid('recent-grid', S.recent.slice(0, 8), 'recent'));
  }
}
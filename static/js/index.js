import { S }                                              from './state.js';
import { showToast }                                      from './utils.js';
import { initAudio, togglePlay, seekBar, setVolume,
         toggleMute, toggleShuffle, toggleRepeat,
         prevTrack, nextTrack, playQueueItem,
         toggleLike, playTrack, playFromList }            from './player.js';
import { addToQueue, clearQueue, renderQueue }            from './queue.js';
import { doSearch, doMobileSearch }                       from './search.js';
import { setView, loadFeatured, renderGrid,
         filterGenre, openMobileSearch,
         closeMobileSearch }                              from './views.js';

/* ─── Global bridge for inline onclick handlers ─────────────────────────── */
window.__px7 = {
  setView, filterGenre,
  doSearch, doMobileSearch, openMobileSearch, closeMobileSearch,
  togglePlay, seekBar, setVolume, toggleMute, toggleShuffle, toggleRepeat,
  prevTrack, nextTrack, playQueueItem, playTrack, playFromList,
  toggleLike, addToQueue, clearQueue,
};

/* ─── Init ─────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  loadFeatured();
  renderGrid('recent-grid', S.recent.slice(0, 8), 'recent');
  renderQueue();
  initAudio();

});
import { cleanTitle } from './utils.js';

const MS = navigator.mediaSession;

/**
 * Update the OS / browser "Now Playing" card.
 * Called by player.js after a track starts.
 * @param {{ title, channel, thumb }} track
 */
export function setMediaMetadata(track) {
  if (!MS) return;

  const artwork = track.thumb
    ? [
        { src: track.thumb,                                     sizes: '480x360', type: 'image/jpeg' },
        { src: track.thumb.replace('hqdefault', 'mqdefault'),   sizes: '320x180', type: 'image/jpeg' },
      ]
    : [];

  MS.metadata = new MediaMetadata({
    title:  cleanTitle(track.title, track.channel)   || 'Unknown Title',
    artist: track.channel || 'Unknown Artist',
    album:  'PX7.FM',
    artwork,
  });
}

/**
 * Sync the playback state badge on the notification card.
 * @param {boolean} playing
 */
export function setMediaPlaybackState(playing) {
  if (!MS) return;
  MS.playbackState = playing ? 'playing' : 'paused';
}

/**
 * Wire hardware / notification action buttons.
 * Call once during app init; the callbacks reach into the
 * existing __px7 global so this file stays dependency-light.
 */
export function initMediaSessionActions() {
  if (!MS) return;

  const act = (action, handler) => {
    try { MS.setActionHandler(action, handler); } catch (_) { /* unsupported */ }
  };

  act('play',         () => window.__px7?.togglePlay());
  act('pause',        () => window.__px7?.togglePlay());
  act('previoustrack',() => window.__px7?.prevTrack());
  act('nexttrack',    () => window.__px7?.nextTrack());
  act('stop', () => {
    const a = document.getElementById('audio-el');
    if (a) { a.pause(); a.currentTime = 0; }
    setMediaPlaybackState(false);
  });

  // Seekto / seekbackward / seekforward — only if audio element is reachable
  act('seekto', details => {
    const a = document.getElementById('audio-el');
    if (a && details.seekTime != null) a.currentTime = details.seekTime;
  });
  act('seekbackward', details => {
    const a = document.getElementById('audio-el');
    if (a) a.currentTime = Math.max(0, a.currentTime - (details.seekOffset ?? 10));
  });
  act('seekforward', details => {
    const a = document.getElementById('audio-el');
    if (a) a.currentTime = Math.min(a.duration || 0, a.currentTime + (details.seekOffset ?? 10));
  });
}

export function updatePositionState() {
  if (!MS?.setPositionState) return;
  const a = document.getElementById('audio-el');
  if (!a || !a.duration || !isFinite(a.duration)) return;
  try {
    MS.setPositionState({
      duration:     a.duration,
      playbackRate: a.playbackRate,
      position:     a.currentTime,
    });
  } catch (_) { /* some browsers throw if duration is 0 */ }
}
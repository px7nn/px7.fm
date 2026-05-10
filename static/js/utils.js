/** Format seconds → m:ss */
export function fmt(s) {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
}

/** HTML-escape a string */
export function esc(s = '') {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Toast notifications */
let _tt;
export function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_tt);
  _tt = setTimeout(() => t.classList.remove('show'), 2400);
}

/** Strip "Artist - " prefix from title if it matches channel name */
export function cleanTitle(title, channel) {
  if (!title || !channel) return title;
  const t = title.toLowerCase().trim();
  const c = channel.toLowerCase().trim();
  if (t.startsWith(c + ' - ')) return title.slice(channel.length + 3);
  return title;
}
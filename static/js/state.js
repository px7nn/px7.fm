export const S = {
  track:   null,
  queue:   [],
  qi:      -1,
  playing: false,
  shuffle: false,
  repeat:  false,
  muted:   false,
  vol:     0.75,

  /* source context for auto-queue */
  queueSource: null,   // 'search' | 'liked' | 'recent' | 'featured' | null
  sourceList:  [],     // the full list that was active when play started

  liked:  JSON.parse(localStorage.getItem('px7_liked')  || '[]'),
  recent: JSON.parse(localStorage.getItem('px7_recent') || '[]'),
};

export function persistLiked()  { localStorage.setItem('px7_liked',  JSON.stringify(S.liked));  }
export function persistRecent() { localStorage.setItem('px7_recent', JSON.stringify(S.recent)); }

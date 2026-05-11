# PX7.FM

> A self-contained desktop music streaming app for Windows — powered by YouTube, built with Flask + NeutralinoJS.

![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-yellow)
![License](https://img.shields.io/badge/license-GPLv3-green)

---

## What is PX7.FM?

PX7.FM is a **desktop music player** that streams audio directly from YouTube — no browser required, no ads, no account. It presents a modern streaming-player interface while remaining fully local and self-contained.

You get:
- **Full-text search** across YouTube's music catalogue
- **Genre-filtered trending** home feed
- **Queue management** with shuffle & repeat
- **Liked songs** and **recently played** history (persisted in localStorage)
- **A clean, responsive UI** that works at any window size — including a compact mobile-style layout

Under the hood it's a Flask HTTP server wrapped in a NeutralinoJS window, bundled into a single portable `PX7/` folder via PyInstaller.

> **Disclaimer:** PX7.FM is an independent open-source project and is not affiliated with, endorsed by, or connected to YouTube or Google in any way. Use responsibly and in accordance with YouTube's Terms of Service.

---

## Screenshots

_Screenshots / GIF demo coming soon._

---

## Why Flask + Neutralino?

Most desktop music apps built in Python reach for Electron — which ships a full Chromium runtime and adds 150–200MB to the binary. PX7 takes a leaner approach:

- **Flask** is the natural fit because the core logic is already Python (`yt-dlp`). A thin local REST server is all that's needed to bridge it to a browser-side UI — no IPC layer, no native bindings.
- **NeutralinoJS** wraps that server in a proper desktop window using the **system WebView** (Edge WebView2 on Windows, WebKit on macOS/Linux) rather than bundling its own browser engine. Unlike Electron apps, PX7 stays lightweight (~30MB) while still providing a native desktop experience.
- **PyInstaller `--onedir`** bundles the Python runtime and all dependencies alongside the Neutralino binary into one portable folder. No installer, no registry entries — unzip and run.

The tradeoff: you're dependent on the system WebView being present (it is by default on Windows 10+), and the frontend can't use Node.js APIs. For a music player, neither matters.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  PX7.exe                    │
│  (PyInstaller bundle — launcher.py entry)   │
└───────────────┬─────────────────────────────┘
                │ spawns
    ┌───────────▼──────────┐      ┌────────────────────────┐
    │   Flask backend      │◄────►│  NeutralinoJS window   │
    │   localhost:5000     │ HTTP │  native system WebView  │
    │                      │      │  loads http://127.0.0.1 │
    └───────────┬──────────┘      └────────────────────────┘
                │
    ┌───────────▼──────────┐
    │   yt-dlp             │
    │   (search / stream)  │
    └──────────────────────┘
```

### Layer breakdown

| Layer | Tech | Role |
|---|---|---|
| **Launcher** | `launcher.py` | Entry point. Starts Flask in a background thread, waits for it to be ready, then spawns the Neutralino window process. If Flask is already running (second launch), skips straight to the window. |
| **Backend** | Flask (`app.py`) | Thin REST API server. Three endpoints: `/api/search`, `/api/trending`, `/api/stream`. No database, no auth — purely local. |
| **API module** | `api/` package | Wraps `yt-dlp` for search and stream URL extraction. Handles title cleaning, duration formatting, and yt-dlp option configs. |
| **Frontend** | Vanilla JS (ES modules) + Jinja2 HTML | Single-page app served by Flask. Modular JS files handle state, player, queue, search, and views. |
| **Desktop shell** | NeutralinoJS `v6.7.0` | Lightweight native window using the system WebView (Edge WebView2 on Windows). Points to `http://127.0.0.1:5000/`. No Electron bloat. |
| **Build** | PyInstaller `--onedir` | Bundles Python runtime, all deps, and the Neutralino binary into a portable `PX7/` directory. |

---

## Project Structure

```
px7.fm/
├── launcher.py                  # Entry point — boots Flask + Neutralino
├── app.py                       # Flask app, route definitions
│
├── api/
│   ├── __init__.py              # yt-dlp options, shared helpers (clean_title, format_duration)
│   ├── search.py                # YouTube search via yt-dlp
│   ├── stream.py                # Stream URL extractor
│   └── trending.py              # Curated "trending" feed (randomised seed queries)
│
├── templates/
│   └── index.html               # Full SPA shell — layout, player bar, sidebar, views
│
├── static/
│   ├── css/
│   │   └── styles.css           # All styling — dark theme, responsive breakpoints
│   ├── js/
│   │   ├── index.js             # App init, global __px7 bridge
│   │   ├── state.js             # Single shared state object S + localStorage persistence
│   │   ├── player.js            # Audio engine, playback controls, like/recent logic
│   │   ├── queue.js             # Queue data + rendering
│   │   ├── search.js            # Search fetch + result rendering
│   │   ├── views.js             # View switching, home grids, genre chips, mobile drawer
│   │   └── utils.js             # fmt(), esc(), showToast(), cleanTitle()
│   └── images/icons/            # Favicons, Apple touch icon
│
└── neutralino/
    ├── neutralino.config.json   # Window config (1200×800, min 380×600, loads localhost:5000)
    ├── bin/
    │   └── neutralino-win_x64.exe
    └── resources/
        ├── js/neutralino.js     # Neutralino client runtime
        └── icons/PX7.ico
```

---

## API Endpoints

All endpoints are served by Flask on `http://127.0.0.1:5000`.

### `GET /api/search?q=<query>&limit=<n>`
Search YouTube for tracks matching `query`.

**Response**
```json
{
  "results": [
    {
      "id": "dQw4w9WgXcQ",
      "title": "Never Gonna Give You Up",
      "channel": "Rick Astley",
      "thumb": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
      "duration": "3:33"
    }
  ]
}
```

### `GET /api/trending`
Returns a curated list of tracks from randomised seed queries (lo-fi, indie, jazz, etc.), filtered to tracks ≤ 4 minutes.

**Response** — same shape as `/api/search`.

### `GET /api/stream?id=<youtube_video_id>`
Extracts a direct audio stream URL for the given video ID using yt-dlp.

**Response**
```json
{ "stream_url": "https://..." }
```
Returns `500` with `{ "error": "Could not extract stream" }` on failure.

### `HEAD /api/health`
Liveness check used internally by the launcher. Returns `200` when Flask is up.

---

## Frontend Modules

The frontend is pure vanilla JS using ES modules — no framework, no bundler.

| Module | Responsibility |
|---|---|
| `state.js` | Single source of truth (`S` object). Tracks current track, queue, playback flags, liked/recent lists. Persists liked & recent to `localStorage`. |
| `player.js` | Owns the `<audio>` element. Handles play/pause, seek, volume (drag + touch), mute, shuffle, repeat, prev/next, like toggle, and the loading spinner state. |
| `queue.js` | Queue array CRUD and DOM rendering. |
| `search.js` | Fetches `/api/search`, renders result rows, exposes `getLastResults()` for auto-queue. |
| `views.js` | SPA view switching, home featured/recent grids, liked/recent list views, genre chip filter, mobile search drawer. |
| `utils.js` | Tiny pure helpers: `fmt()` (seconds → m:ss), `esc()` (HTML escape), `showToast()`, `cleanTitle()`. |
| `index.js` | Bootstraps the app on `DOMContentLoaded`. Wires everything into `window.__px7` for inline `onclick` handlers. |

---

## Installation

**No Python or dependencies required** — just download and run.

1. Go to the [Releases](../../releases) page
2. Download `PX7-windows.zip` from the latest release
3. Extract the ZIP anywhere on your machine
4. Run `PX7.exe`

The app is fully portable. Nothing is written to the registry and no installer is needed. To uninstall, delete the folder.

> Requires Windows 10 or later (Edge WebView2 is included by default).

---

## Building from Source

### Prerequisites

- Python 3.10+
- `pip install pyinstaller yt-dlp flask requests`
- The `neutralino-win_x64.exe` binary in `neutralino/bin/`

### Build command (Windows)

```bash
pyinstaller \
  --onedir \
  --noconsole \
  --noupx \
  --name PX7 \
  --icon "neutralino/resources/icons/PX7.ico" \
  --add-data "templates;templates" \
  --add-data "static;static" \
  --add-binary "neutralino/bin/neutralino-win_x64.exe;neutralino/bin" \
  --add-data "neutralino/neutralino.config.json;neutralino" \
  --add-data "neutralino/resources;neutralino/resources" \
  --collect-all yt_dlp \
  --collect-all flask \
  --collect-all requests \
  launcher.py
```

Output will be in `dist/PX7/`. The entire folder is portable — copy it anywhere and run `PX7.exe`.

### Running in dev mode

```bash
python launcher.py
```

Flask will start on `http://127.0.0.1:5000` and the Neutralino window will open automatically. You can also open `http://127.0.0.1:5000` in any browser for a browser-based dev session.

---

## How Streaming Works

1. User clicks a track → frontend calls `/api/stream?id=<id>`
2. Flask passes the YouTube video URL to `yt-dlp` with `format: bestaudio/best` and `skip_download: True`
3. yt-dlp resolves the best available audio-only stream URL (from YouTube's CDN)
4. The URL is returned to the frontend and set as the `<audio>` element's `src`
5. The browser's native audio engine streams directly from YouTube's CDN

No audio data ever passes through the Flask server — it only resolves the URL.

---

## Known Limitations & Notes

- **Windows only** for now. macOS/Linux would need the appropriate Neutralino binary and adjusted path logic in `launcher.py`.
- **Stream URLs expire.** YouTube's CDN URLs are time-limited. If a track fails after sitting paused for a long time, re-clicking it will re-fetch a fresh URL.
- **Trending feed is seeded**, not live. The "trending" content is randomly picked from a small set of curated seed queries in `trending.py` — not a real trending API.
- **No downloads.** PX7 is a streaming player only.
- **yt-dlp currency.** YouTube frequently changes its extraction logic. If streams stop working, update yt-dlp: `pip install -U yt-dlp` and rebuild.

---

## Roadmap Ideas

- [ ] macOS & Linux builds (swap in the correct Neutralino binary)
- [ ] Live trending via YouTube Music API or RSS
- [ ] Playlist creation & persistence
- [ ] System media key support (via Neutralino native API)
- [ ] Album/artist page views
- [ ] Mini-player / always-on-top compact mode

---

## License

GPLv3 — you're free to use, modify, and distribute PX7.FM, but any derivative work must also be released under GPLv3 with source available. See [`LICENSE`](LICENSE) for the full terms.
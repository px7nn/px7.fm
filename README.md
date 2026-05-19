<a href="#"><img src="neutralino/resources/icons/PX7.png" alt="PX7 logo" title="PX7.FM" align="right" height="60px" /> </a>

# PX7.FM

> A self-contained desktop music streaming app for Windows, macOS, and Linux — and an installable PWA for Android & iOS — powered by YouTube, built with Flask + NeutralinoJS.

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-blue)
![Python](https://img.shields.io/badge/python-3.10%2B-yellow)
![PWA](https://img.shields.io/badge/PWA-installable-brightgreen)
![License](https://img.shields.io/badge/license-GPLv3-green)

---

## What is PX7.FM?

PX7.FM is a **music streaming player** that streams audio directly from YouTube — no browser tabs, no ads, no account. It runs as a native desktop app and as an installable Progressive Web App on your phone.

You get:
- **Full-text search** across YouTube's music catalogue
- **Genre-filtered trending** home feed
- **Queue management** with shuffle & repeat
- **Liked songs** and **recently played** history (persisted in localStorage)
- **A clean, responsive UI** that works at any window size — including a compact mobile-style layout
- **OS-level Now Playing card** with artwork, hardware button support, and lock-screen controls (via Web Media Session API)
- **Installable on Android & iOS** — appears on your home screen like a native app

Under the hood it's a Flask HTTP server wrapped in a NeutralinoJS window for desktop, and served as a PWA for mobile.

> **Disclaimer:** PX7.FM is an independent open-source project and is not affiliated with, endorsed by, or connected to YouTube or Google in any way. Use responsibly and in accordance with YouTube's Terms of Service.

---

## Screenshots

<div align="center">

<img width="749" height="486" alt="Image" src="https://github.com/user-attachments/assets/7e559324-dd9f-4c07-8f79-b94e2e136509" />

</div>

---

## Why Flask + Neutralino?

Most desktop music apps built in Python reach for Electron — which ships a full Chromium runtime and adds 150–200MB to the binary. PX7 takes a leaner approach:

- **Flask** is the natural fit because the core logic is already Python (`yt-dlp`). A thin local REST server is all that's needed to bridge it to a browser-side UI — no IPC layer, no native bindings.
- **NeutralinoJS** wraps that server in a proper desktop window using the **system WebView** (Edge WebView2 on Windows, WebKit on macOS/Linux) rather than bundling its own browser engine. Unlike Electron apps, PX7 stays lightweight (~30MB) while still providing a native desktop experience.
- **PyInstaller `--onedir`** bundles the Python runtime and all dependencies alongside the Neutralino binary into one portable folder. No installer, no registry entries — unzip and run.

The tradeoff: you're dependent on the system WebView being present (it is by default on Windows 10+ and most modern macOS/Linux systems), and the frontend can't use Node.js APIs. For a music player, neither matters.

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  PX7.exe                    │
│  (PyInstaller bundle — launcher.py entry)   │
└───────────────┬─────────────────────────────┘
                │ spawns
    ┌───────────▼──────────┐      ┌─────────────────────────┐
    │   Flask backend      │◄────►│  NeutralinoJS window    │
    │   localhost:5000     │ HTTP │  native system WebView  │
    │                      │      │  loads http://127.0.0.1 │
    └───────────┬──────────┘      └─────────────────────────┘
                │
    ┌───────────▼──────────┐
    │   yt-dlp             │
    │   (search / stream)  │
    └──────────────────────┘
```

### Layer breakdown

| Layer | Tech | Role |
|---|---|---|
| **Launcher** | `launcher.py` | Entry point. Detects the OS and selects the correct Neutralino binary. Starts Flask in a background thread, waits for it to be ready, then spawns the Neutralino window process. If Flask is already running (second launch), skips straight to the window. On non-Windows, sets the binary executable before spawning. |
| **Backend** | Flask (`app.py`) | Thin REST API server. Also runnable standalone (`python app.py`) to serve the PWA on the local network for mobile access. |
| **API module** | `api/` package | Wraps `yt-dlp` for search and stream URL extraction. Handles title cleaning, duration formatting, and yt-dlp option configs. |
| **Frontend** | Vanilla JS (ES modules) + Jinja2 HTML | Single-page app served by Flask. Modular JS files handle state, player, queue, search, and views. |
| **Media Session** | `mediasession.js` | Pushes track metadata and artwork to the OS Now Playing widget. Wires hardware prev/pause/next buttons and lock-screen controls. |
| **Desktop shell** | NeutralinoJS `v6.7.0` | Lightweight native window using the system WebView. Points to `http://127.0.0.1:5000/`. No Electron bloat. |
| **Build** | PyInstaller `--onedir` | Bundles Python runtime, all deps, and the platform-appropriate Neutralino binary into a portable `PX7/` directory. |

---

## Project Structure

```
px7.fm/
├── app.py                       # Flask app — also runnable standalone for PWA/mobile
├── launcher.py                  # Entry point — boots Flask + Neutralino
├── requirements.txt             # Python dependencies
├── CHANGELOG
├── LICENSE
│
├── .github/
│   └── workflows/
│       └── build.yml            # CI — builds for Windows, macOS, Linux on push to main
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
│   ├── site.webmanifest         # PWA manifest — name, icons, display mode
│   ├── css/
│   │   └── styles.css           # All styling — dark theme, responsive breakpoints
│   ├── js/
│   │   ├── index.js             # App init, global __px7 bridge
│   │   ├── state.js             # Single shared state object S + localStorage persistence
│   │   ├── player.js            # Audio engine, playback controls, like/recent logic
│   │   ├── queue.js             # Queue data + rendering
│   │   ├── search.js            # Search fetch + result rendering
│   │   ├── views.js             # View switching, home grids, genre chips, mobile drawer
│   │   ├── utils.js             # fmt(), esc(), showToast(), cleanTitle()
│   │   └── mediasession.js      # Web Media Session API — Now Playing card, hardware keys
│   └── images/icons/
│       ├── favicon.ico
│       ├── favicon.svg
│       ├── favicon-96x96.png
│       ├── apple-touch-icon.png
│       ├── web-app-manifest-192x192.png
│       └── web-app-manifest-512x512.png
│
└── neutralino/
    ├── neutralino.config.json   # Window config (1200×800, min 380×600, loads localhost:5000)
    ├── bin/
    │   ├── neutralino-win_x64.exe
    │   ├── neutralino-linux_x64
    │   └── neutralino-mac_universal
    └── resources/
        ├── js/neutralino.js     # Neutralino client runtime
        └── icons/
            ├── PX7.ico
            └── PX7.png
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
| `player.js` | Owns the `<audio>` element. Handles play/pause, seek, volume (drag + touch), mute, shuffle, repeat, prev/next, like toggle, loading spinner state, and Media Session sync. |
| `queue.js` | Queue array CRUD and DOM rendering. Supports drag-and-drop reordering. |
| `search.js` | Fetches `/api/search`, renders result rows, exposes `getLastResults()` for auto-queue. |
| `views.js` | SPA view switching, home featured/recent grids, liked/recent list views, genre chip filter, mobile search drawer. |
| `utils.js` | Tiny pure helpers: `fmt()` (seconds → m:ss), `esc()` (HTML escape), `showToast()`, `cleanTitle()`. |
| `mediasession.js` | Web Media Session API. Updates the OS Now Playing card with track metadata and artwork. Wires hardware prev/pause/next action handlers and seek support. |
| `index.js` | Bootstraps the app on `DOMContentLoaded`. Wires everything into `window.__px7` for inline `onclick` handlers. |

---

## Installation

### Desktop — Pre-built binary

**No Python or dependencies required** — just download and run.

1. Go to the [Releases](https://github.com/px7nn/px7.fm/releases) page
2. Download the ZIP for your platform (`PX7-windows`, `PX7-macos`, or `PX7-linux`) from the latest release
3. Extract the ZIP anywhere on your machine
4. Run the `PX7` executable inside the extracted folder

The app is fully portable. Nothing is written to the registry (Windows) and no installer is needed. To uninstall, delete the folder.

> **Windows:** Requires Windows 10 or later (Edge WebView2 is included by default).  
> **macOS / Linux:** Requires a system WebKit/WebView. Most modern desktop installations include this out of the box.

---

### Mobile — Android with Termux

No desktop needed — your Android phone runs both the server and the client.

**Step 1 — Install Termux**

Install [Termux from F-Droid](https://f-droid.org/packages/com.termux/). The Play Store version is outdated and no longer receives updates.

**Step 2 — Install dependencies**

```bash
pkg update && pkg upgrade -y
pkg install python ffmpeg git -y
pip install flask yt-dlp
```

> `ffmpeg` is required by yt-dlp for certain audio formats. Skipping it will cause silent stream failures on some tracks.

**Step 3 — Clone the repo**

```bash
git clone --depth 1 https://github.com/px7nn/px7.fm.git
cd px7.fm
```

Or copy the source folder to your phone over USB and `cd` into it.

**Step 4 — Start the server**

```bash
python app.py
```

**Step 5 — Open in Chrome**

Open Chrome on the same device and go to `http://127.0.0.1:5000`. Install to your home screen from the browser menu — the app will open full-screen with lock-screen playback controls.

**Keeping the server alive when the screen is off**

Android's battery optimiser kills background Termux sessions by default. Two things to do:

Go to **Settings → Apps → Termux → Battery** and set to **Unrestricted**.

Then run the server inside `tmux` so it survives Termux being backgrounded:

```bash
pkg install tmux -y
tmux new -s px7
python app.py
# Detach: Ctrl+B then D
# Reattach later: tmux attach -t px7
```

---

### Mobile — iOS

iOS does not support running a local Python server from any app in a way that's reliable enough to recommend. The best approach is to run the server on another device (desktop or Android/Termux) and access PX7 over Wi-Fi from Safari on your iPhone, then add it to your home screen.

---

## Building from Source

### Prerequisites

- Python 3.10+
- `requirements.txt` covers runtime deps; add PyInstaller for the build:
  ```bash
  pip install -r requirements.txt pyinstaller
  ```
- The appropriate Neutralino binary in `neutralino/bin/` for your target platform

### Build command — Windows

```batch
pyinstaller ^
  --onedir ^
  --noconsole ^
  --noupx ^
  --name PX7 ^
  --icon "neutralino/resources/icons/PX7.ico" ^
  --add-data "templates;templates" ^
  --add-data "static;static" ^
  --add-binary "neutralino/bin/neutralino-win_x64.exe;neutralino/bin" ^
  --add-data "neutralino/neutralino.config.json;neutralino" ^
  --add-data "neutralino/resources/icons/PX7.ico;neutralino/resources/icons" ^
  --collect-all yt_dlp ^
  --collect-all flask ^
  --collect-all requests ^
  launcher.py
```

### Build command — macOS / Linux

```bash
pyinstaller \
  --onedir \
  --noconsole \
  --noupx \
  --name PX7 \
  --icon "neutralino/resources/icons/PX7.png" \
  --add-data "templates:templates" \
  --add-data "static:static" \
  --add-binary "neutralino/bin/neutralino-mac_universal:neutralino/bin" \
  --add-data "neutralino/neutralino.config.json:neutralino" \
  --add-data "neutralino/resources/icons/PX7.png:neutralino/resources/icons" \
  --collect-all yt_dlp \
  --collect-all flask \
  --collect-all requests \
  launcher.py
```

Replace `neutralino-mac_universal` with `neutralino-linux_x64` on Linux.

Output will be in `dist/PX7/`. The entire folder is portable — copy it anywhere and run `PX7` (or `PX7.exe` on Windows).

### CI builds

The GitHub Actions workflow (`.github/workflows/build.yml`) builds for all three platforms automatically on every push to `main`, using Python 3.11. Artifacts are uploaded as `PX7-windows`, `PX7-macos`, and `PX7-linux`.

### Running in dev mode

```bash
python app.py          # server only — open http://127.0.0.1:5000 in any browser
python launcher.py     # full desktop experience — Flask + Neutralino window
```

---

## How Streaming Works

1. User clicks a track → frontend calls `/api/stream?id=<id>`
2. Flask passes the YouTube video URL to `yt-dlp` with `format: bestaudio/best` and `skip_download: True`
3. yt-dlp resolves the best available audio-only stream URL (from YouTube's CDN)
4. The URL is returned to the frontend and set as the `<audio>` element's `src`
5. The browser's native audio engine streams directly from YouTube's CDN
6. `mediasession.js` pushes track metadata and artwork to the OS Now Playing widget

No audio data ever passes through the Flask server — it only resolves the URL.

---

## Known Limitations & Notes

- **Stream URLs expire.** YouTube's CDN URLs are time-limited. If a track fails after sitting paused for a long time, re-clicking it will re-fetch a fresh URL.
- **Trending feed is seeded**, not live. The "trending" content is randomly picked from a small set of curated seed queries in `trending.py` — not a real trending API.
- **No downloads.** PX7 is a streaming player only.
- **yt-dlp currency.** YouTube frequently changes its extraction logic. If streams stop working, update yt-dlp: `pip install -U yt-dlp` and rebuild.
- **PWA on iOS requires Safari.** Chrome and Firefox on iOS cannot install PWAs due to Apple's browser restrictions.
- **Termux battery optimisation.** Android will kill the Termux session if battery optimisation is not disabled for Termux. See the Termux section above.

---

## Roadmap Ideas

- [ ] Live trending via YouTube Music API or RSS
- [ ] Playlist creation & persistence
- [ ] System media key support (via Neutralino native API)
- [ ] Album/artist page views
- [ ] Mini-player / always-on-top compact mode

---

## License

GPLv3 — you're free to use, modify, and distribute PX7.FM, but any derivative work must also be released under GPLv3 with source available. See [`LICENSE`](https://github.com/px7nn/px7.fm/blob/main/LICENSE) for the full terms.
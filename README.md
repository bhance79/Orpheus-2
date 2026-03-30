# Orpheus 2.0

**Orpheus 2.0** is a Spotify-powered playlist management and stats app built with Flask and React.
Log in with your Spotify account to manage playlists, explore your listening stats, and keep your library clean.

![Home Page](static/screenshots/home-view.PNG)

---

## Features

### Dashboard
- **Top Artists** — browse your most-listened artists across Last 4 Weeks, Last 6 Months, and All Time
- **Top Tracks** — see your top songs with album art and Spotify links
- **Top Genres** — visual breakdown of your genre distribution
- **Recently Played** — your last 30 tracks with total listening time

### Playlist Tools
- **View Playlists** — browse any playlist you own or follow, with track details (title, artist, album, explicit flag, added date)
- **Remove Duplicates** — detects and removes true duplicates even when names differ slightly (e.g. "Song Name – Remastered 2011" vs "Song Name")
- **Filter Sweep** — remove songs from Playlist A that appear in one or more reference playlists

### CrateDigger
- Recommendations feature — currently on pause while a replacement for Spotify's retired recommendations endpoint is designed

---

## Screenshots

**Log In**
![Log In](static/screenshots/log-in.PNG)

**Dashboard**
![Home Page](static/screenshots/home-view.PNG)

**Viewing Playlists**
![Tracks View](static/screenshots/playlists-view.PNG)

**Filter Sweep**
![Filter Sweep](static/screenshots/filter-sweep.PNG)

---

## Tech Stack

**Backend**
- Python 3.9+
- Flask — web framework
- Spotipy — Spotify Web API client
- python-dotenv — environment config

**Frontend**
- React 18
- Vite — build tool and dev server
- Tailwind CSS — styling
- React Router — client-side routing

---

## Spotify API Setup

1. Go to [Spotify for Developers](https://developer.spotify.com/dashboard/applications) and create a new app
2. Add a Redirect URI: `http://127.0.0.1:5000/callback`
3. Copy your **Client ID** and **Client Secret**

Create a `.env` file in the project root:

```env
SPOTIPY_CLIENT_ID=your_spotify_client_id
SPOTIPY_CLIENT_SECRET=your_spotify_client_secret
SPOTIPY_REDIRECT_URI=http://127.0.0.1:5000/callback
FLASK_SECRET_KEY=your_random_secret_key
```

---

## Installation

```bash
git clone https://github.com/bhance79/Orpheus-2.git
cd Orpheus-2
```

**Backend dependencies:**
```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

**Frontend dependencies:**
```bash
npm install
```

---

## Running the App

**Option 1 — Production build (Flask serves everything)**

```bash
npm run build       # builds React into static/dist/
python app.py       # starts Flask on http://127.0.0.1:5000
```

**Option 2 — Development (hot reload)**

Run both servers together:

```bash
python app.py       # Flask backend on :5000
npm run dev         # Vite dev server on :5173 (auto-detected by Flask)
```

Then open `http://127.0.0.1:5173` in your browser.

**Option 3 — Docker**

```bash
docker compose up --build
```

Serves the app on `http://localhost:5000`. Mounts `.spotipy_cache` so Spotify tokens persist between restarts.

```bash
docker compose down       # stop
docker compose down -v    # stop + clear cached tokens
```

---

## How Features Work

### Duplicate Detection

Duplicates are matched using canonicalization — minor differences in track names are ignored:

| Step | Input | Output |
|---|---|---|
| Lowercase | `Song Name (Live)` | `song name (live)` |
| Remove brackets | `song name (live)` | `song name` |
| Remove suffixes | `song name – Remastered 2011` | `song name` |
| Remove feat. | `song name feat. Drake` | `song name` |
| Normalize artists | `["Drake", "21 Savage"]` | `21 savage & drake` |

Final match key: `"song name\|\|21 savage & drake"` — first occurrence is kept, all others removed.

### Filter Sweep

1. Select **Playlist A** (must be owned by you)
2. Select one or more **Playlist B** reference playlists (or Recently Played)
3. Any track in Playlist A that also appears in any Playlist B is removed

---

## Permissions

Spotify scopes requested:

```
playlist-read-private
playlist-read-collaborative
playlist-modify-private
playlist-modify-public
user-read-recently-played
user-top-read
```

> If you see "Insufficient client scope" errors, log out and log back in — this happens when your token predates a scope being added.

---

## Project Structure

```
app.py                  # Flask app — blueprint registration + entrypoint
utils.py                # Pure Python helpers
spotify_client.py       # Spotify OAuth, pagination, playlist/genre helpers
routes/
  auth.py               # /login, /callback, /logout
  playlists.py          # Playlist API, duplicates, filter sweep
  stats.py              # User stats, search, artist/album details
  recommendations.py    # Recommendations
  misc.py               # Static files, diagnostics, catch-all
frontend/
  pages/                # React page components
  components/
    layout/             # Layout, navigation
    overlays/           # Modals and popups
    ui/                 # Reusable UI primitives
    stats/              # Dashboard stats components
  hooks/                # Custom React hooks
```

---

## License

MIT License © 2025 Ivan Rodriguez Ruelas

import re
import time
from collections import Counter
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple

import spotipy
import requests
from flask import session
from spotipy.oauth2 import SpotifyOAuth
from spotipy.exceptions import SpotifyException
from spotipy.cache_handler import MemoryCacheHandler

from utils import getenv_stripped, normalize, safe_get

# ---------- Constants ----------
DOTENV_PATH = Path(__file__).with_name(".env")

RECENT_ID = "__recent__"

SCOPES = " ".join([
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-recently-played",
    "user-top-read",
])

TIME_RANGE_LABELS = {
    "short_term": "Last 4 Weeks",
    "medium_term": "Last 6 Months",
    "long_term": "All Time",
}
TIME_RANGE_KEYS: Tuple[str, ...] = tuple(TIME_RANGE_LABELS.keys())

# ---------- Spotify OAuth ----------
def sp_oauth() -> SpotifyOAuth:
    cid = getenv_stripped("SPOTIPY_CLIENT_ID")
    csec = getenv_stripped("SPOTIPY_CLIENT_SECRET")
    redir = getenv_stripped("SPOTIPY_REDIRECT_URI")
    missing = [k for k, v in {
        "SPOTIPY_CLIENT_ID": cid,
        "SPOTIPY_CLIENT_SECRET": csec,
        "SPOTIPY_REDIRECT_URI": redir,
    }.items() if not v]
    if missing:
        raise RuntimeError(f"Missing env vars: {', '.join(missing)}. Check your .env or /diag.")

    return SpotifyOAuth(
        client_id=cid,
        client_secret=csec,
        redirect_uri=redir,
        scope=SCOPES,
        cache_handler=MemoryCacheHandler(),
        open_browser=False,
        show_dialog=True,
    )


def get_sp() -> spotipy.Spotify:
    token_info = session.get("token_info")
    if not token_info:
        raise RuntimeError("Not authenticated. Click 'Login with Spotify'.")

    oauth = sp_oauth()
    if token_info.get("refresh_token") and oauth.is_token_expired(token_info):
        token_info = oauth.refresh_access_token(token_info["refresh_token"])
        session["token_info"] = token_info

    if not token_info.get("access_token"):
        raise RuntimeError("Missing access token. Please log in again.")
    return spotipy.Spotify(auth=token_info["access_token"])


# ---------- Pagination ----------
def paginate(fetch_page_fn, limit: int = 50) -> Iterable[Dict[str, Any]]:
    offset = 0
    while True:
        try:
            page = fetch_page_fn(offset, limit) or {}
        except SpotifyException as e:
            if e.http_status == 429:
                retry_after = int(safe_get(getattr(e, "headers", {}), "Retry-After", 2))
                time.sleep(retry_after)
                continue
            raise
        items = safe_get(page, "items", []) or []
        for it in items:
            if isinstance(it, dict):
                yield it
        if not safe_get(page, "next"):
            break
        offset += limit


def chunked(seq: Iterable[str], size: int = 50) -> Iterable[List[str]]:
    seq_list = list(seq or [])
    for i in range(0, len(seq_list), size):
        yield seq_list[i:i + size]


def chunks(seq: List[str], size: int = 100):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


# ---------- Track / Artist helpers ----------
def canonical_title(name: Optional[str]) -> str:
    s = (name or "").lower()
    s = re.sub(r'\s*[\(\[\{].*?[\)\]\}]', '', s)
    s = re.sub(r'\s*-\s*(remaster(?:ed)?(?: \d{4})?|single version|album version|radio edit|live.*)$', '', s)
    s = re.sub(r'\s+feat\..*$', '', s)
    s = re.sub(r'[^a-z0-9]+', ' ', s)
    return ' '.join(s.split())


def canonical_artists(artists: Optional[List[Dict[str, Any]]]) -> str:
    names = []
    for a in (artists or []):
        n = (a or {}).get("name", "")
        n = re.sub(r'[^a-z0-9]+', ' ', n.lower())
        n = ' '.join(n.split())
        if n:
            names.append(n)
    if not names:
        return ''
    return ' & '.join(sorted(set(names)))


# ---------- Playlist helpers ----------
def get_recent_track_uris(sp: spotipy.Spotify, limit: int = 50) -> List[str]:
    data = sp.current_user_recently_played(limit=limit) or {}
    items = data.get("items", []) or []
    uris: List[str] = []
    for it in items:
        tr = (it or {}).get("track") or {}
        uri = tr.get("uri")
        if uri:
            uris.append(uri)
    return uris


def get_reference_uris(sp: spotipy.Spotify, playlist_id: str) -> List[str]:
    if playlist_id == RECENT_ID:
        return get_recent_track_uris(sp, limit=50)
    return get_all_track_uris(sp, playlist_id)


def playlist_items_with_positions(sp: spotipy.Spotify, playlist_id: str) -> List[Dict[str, Any]]:
    items: List[Dict[str, Any]] = []
    offset = 0
    limit = 100
    while True:
        page = sp.playlist_items(playlist_id, limit=limit, offset=offset) or {}
        batch = page.get("items", []) or []
        if not batch:
            break
        items.extend(batch)
        if not page.get("next"):
            break
        offset += limit
    return items


def get_all_track_uris(sp: spotipy.Spotify, playlist_id: str) -> List[str]:
    uris: List[str] = []
    for it in paginate(lambda o, l: sp.playlist_items(playlist_id, limit=l, offset=o)):
        if not isinstance(it, dict):
            continue
        track = safe_get(it, "track")
        uri = safe_get(track, "uri")
        if uri:
            uris.append(uri)
    return uris


def current_user_id(sp: spotipy.Spotify) -> str:
    me = sp.me() or {}
    return safe_get(me, "id") or ""


def user_owns_playlist(sp: spotipy.Spotify, playlist_id: str) -> bool:
    pl = sp.playlist(playlist_id)
    owner = safe_get(pl, "owner", {})
    return normalize(safe_get(owner, "id")) == normalize(current_user_id(sp))


def list_owned_playlists(sp: spotipy.Spotify) -> List[Dict[str, Any]]:
    me_id = normalize(current_user_id(sp))
    return [pl for pl in paginate(lambda o, l: sp.current_user_playlists(limit=l, offset=o))
            if normalize(safe_get(safe_get(pl, "owner", {}), "id")) == me_id]


def list_all_playlists(sp: spotipy.Spotify) -> List[Dict[str, Any]]:
    return list(paginate(lambda o, l: sp.current_user_playlists(limit=l, offset=o)))


# ---------- Genre / stats helpers ----------
def summarize_genres(top_artists: Dict[str, List[Dict[str, Any]]], range_key: str = "short_term", limit: int = 10) -> List[Dict[str, Any]]:
    artists = top_artists.get(range_key) if isinstance(top_artists, dict) else []
    counter = Counter()
    for artist in artists or []:
        for genre in (artist.get("genres") or []):
            name = (genre or "").strip()
            if name:
                counter[name] += 1
    total = sum(counter.values())
    if not total:
        return []
    genres = []
    for genre_name, count in counter.most_common(limit):
        genres.append({
            "genre": genre_name.title(),
            "count": count,
            "percentage": round((count / total) * 100, 1),
        })
    return genres


def summarize_genres_from_tracks(top_tracks: Dict[str, List[Dict[str, Any]]], artist_genres: Dict[str, List[str]],
                                  range_key: str = "short_term", limit: int = 10) -> List[Dict[str, Any]]:
    tracks = top_tracks.get(range_key) if isinstance(top_tracks, dict) else []
    counter = Counter()
    for track in tracks or []:
        for artist_id in (track.get("artist_ids") or []):
            for genre in artist_genres.get(artist_id, []):
                name = (genre or "").strip()
                if name:
                    counter[name] += 1
    total = sum(counter.values())
    if not total:
        return []
    genres = []
    for genre_name, count in counter.most_common(limit):
        genres.append({
            "genre": genre_name.title(),
            "count": count,
            "percentage": round((count / total) * 100, 1),
        })
    return genres


def build_artist_genre_lookup(sp: spotipy.Spotify, top_artists: Dict[str, List[Dict[str, Any]]],
                               extra_artist_ids: Iterable[str]) -> Dict[str, List[str]]:
    """Create a lookup of artist_id -> genres using cached data from top_artists and additional Spotify lookups."""
    genre_map: Dict[str, List[str]] = {}
    for artists in (top_artists or {}).values():
        for artist in artists or []:
            aid = artist.get("id")
            if aid and aid not in genre_map:
                genre_map[aid] = artist.get("genres") or []

    missing_ids = {aid for aid in (extra_artist_ids or []) if aid and aid not in genre_map}
    for chunk in chunked(missing_ids, 50):
        if not chunk:
            continue
        resp = sp.artists(chunk) or {}
        for artist in (resp.get("artists") or []):
            aid = artist.get("id")
            if aid:
                genre_map[aid] = artist.get("genres") or []
    return genre_map


# ---------- Dev server check ----------
def vite_running() -> bool:
    """Check whether Vite dev server is running."""
    try:
        requests.get("http://127.0.0.1:5173/__vite_ping", timeout=0.3)
        return True
    except Exception:
        return False

# app.py
import os
import re
import time
import base64
from collections import Counter
from typing import Dict, Any, Iterable, List, Optional, Tuple
from pathlib import Path

from flask import Flask, redirect, request, session, url_for, render_template, flash, jsonify
from dotenv import load_dotenv
import requests
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from spotipy.exceptions import SpotifyException
from spotipy.cache_handler import CacheFileHandler

# ---------- Load .env ----------
DOTENV_PATH = Path(__file__).with_name(".env")
load_dotenv(DOTENV_PATH, override=True)

def getenv_stripped(key: str) -> Optional[str]:
    v = os.getenv(key)
    return v.strip() if isinstance(v, str) else v

def normalize(s: Optional[str]) -> str:
    return (s or "").strip().lower()

def safe_get(d: Any, key: str, default=None):
    return d.get(key, default) if isinstance(d, dict) else default

# ---------- Flask ----------
app = Flask(__name__, static_folder='static/dist', static_url_path='')
app.secret_key = getenv_stripped("FLASK_SECRET_KEY") or "dev-key-change-me"

RECENT_ID = "__recent__"  # synthetic id for Recently Played

# READ + WRITE scopes (Filter Sweep + Recently Played + Top Artists/Tracks)
SCOPES = " ".join([
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-private",
    "playlist-modify-public",
    "user-read-recently-played",
    "user-top-read",  # For top artists and tracks
])

TIME_RANGE_LABELS = {
    "short_term": "Last 4 Weeks",
    "medium_term": "Last 6 Months",
    "long_term": "All Time",
}
TIME_RANGE_KEYS: Tuple[str, ...] = tuple(TIME_RANGE_LABELS.keys())

def summarize_genres(top_artists: Dict[str, List[Dict[str, Any]]], range_key: str = "short_term", limit: int = 10) -> List[Dict[str, Any]]:
    """
    Build a ranked list of genres based on the artists returned for a specific time range.
    """
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


def chunked(seq: Iterable[str], size: int = 50) -> Iterable[List[str]]:
    seq_list = list(seq or [])
    for i in range(0, len(seq_list), size):
        yield seq_list[i:i + size]


def build_artist_genre_lookup(sp: spotipy.Spotify, top_artists: Dict[str, List[Dict[str, Any]]],
                              extra_artist_ids: Iterable[str]) -> Dict[str, List[str]]:
    """
    Create a lookup of artist_id -> genres using cached data from top_artists and additional Spotify lookups.
    """
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

    # Use a cache handler if you like, but we primarily store tokens in session.
    return SpotifyOAuth(
        client_id=cid,
        client_secret=csec,
        redirect_uri=redir,
        scope=SCOPES,
        cache_handler=CacheFileHandler(cache_path=".spotipy_cache"),
        open_browser=False,
        show_dialog=True,   # helps force re-consent when scopes change
    )

def get_sp() -> spotipy.Spotify:
    token_info = session.get("token_info")
    if not token_info:
        raise RuntimeError("Not authenticated. Click 'Login with Spotify'.")

    oauth = sp_oauth()
    # Refresh if expired
    if token_info.get("refresh_token") and oauth.is_token_expired(token_info):
        token_info = oauth.refresh_access_token(token_info["refresh_token"])
        session["token_info"] = token_info

    if not token_info.get("access_token"):
        raise RuntimeError("Missing access token. Please log in again.")
    return spotipy.Spotify(auth=token_info["access_token"])

# ---------- Helpers ----------
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

def canonical_title(name: Optional[str]) -> str:
    s = (name or "").lower()
    s = re.sub(r'\s*[\(\[\{].*?[\)\]\}]', '', s)  # remove bracketed parts
    s = re.sub(r'\s*-\s*(remaster(?:ed)?(?: \d{4})?|single version|album version|radio edit|live.*)$', '', s)
    s = re.sub(r'\s+feat\..*$', '', s)            # drop 'feat. ...'
    s = re.sub(r'[^a-z0-9]+', ' ', s)             # normalize punctuation/whitespace
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

def chunks(seq: List[str], size: int = 100):
    for i in range(0, len(seq), size):
        yield seq[i:i+size]

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

def vite_running() -> bool:
    """Check whether Vite dev server is running."""
    try:
        # __vite_ping is a built-in endpoint for dev server health
        requests.get("http://127.0.0.1:5173/__vite_ping", timeout=0.3)
        return True
    except Exception:
        return False

# ---------- Routes ----------
@app.route("/")
def index():
    # Serve React app
    return app.send_static_file("index.html")

@app.route("/login")
def login():
    try:
        oauth = sp_oauth()
        return redirect(oauth.get_authorize_url())
    except Exception as e:
        return f"OAuth setup error: {e}", 500

@app.route("/callback")
def callback():
    code = request.args.get("code")
    error = request.args.get("error")
    if error:
        return f"Authorization failed: {error}"

    try:
        oauth = sp_oauth()
        token_info = oauth.get_access_token(code)
    except Exception as e:
        return f"Token exchange failed: {e}"

    session["token_info"] = token_info

    # Fetch user profile (name + photo)
    try:
        sp = get_sp()
        user = sp.current_user()
        session["user_name"] = user.get("display_name", "User")
        images = user.get("images", [])
        session["user_image"] = images[0]["url"] if images else None
    except Exception:
        pass  # not fatal

    # --- AUTO-DETECT DEV OR PROD ---
    if vite_running():
        # Vite dev server running → go to dev hot reload UI
        return redirect("http://127.0.0.1:5173/")
    else:
        # No Vite dev server → use production build
        return redirect(url_for("index"))


@app.route("/select", methods=["POST"])
def select():
    if "token_info" not in session:
        return redirect(url_for("index"))

    playlist_id = request.form.get("playlist_id")
    if not playlist_id:
        flash("Please select a playlist.")
        return redirect(url_for("index"))

    try:
        sp = get_sp()
        playlist = sp.playlist(playlist_id)
        items = list(paginate(lambda o, l: sp.playlist_items(playlist_id, limit=l, offset=o)))
        rows: List[Dict[str, Any]] = []
        for it in items:
            if not isinstance(it, dict):
                continue
            track = safe_get(it, "track", {})
            if not isinstance(track, dict):
                continue
            rows.append({
                "name": safe_get(track, "name"),
                "artists": ", ".join(safe_get(a, "name", "") for a in (safe_get(track, "artists", []) or [])),
                "album": safe_get(safe_get(track, "album", {}), "name"),
                "added_at": safe_get(it, "added_at"),
                "url": safe_get(safe_get(track, "external_urls", {}), "spotify"),
                "explicit": safe_get(track, "explicit"),
                "duration_ms": safe_get(track, "duration_ms"),
            })
        return render_template("playlist.html", playlist=playlist, tracks=rows)
    except Exception as e:
        flash(f"Failed to load playlist: {e}")
        return redirect(url_for("index"))

# --- Check duplicates (API) - PREVIEW only, doesn't remove ---
@app.route("/api/check-duplicates/<playlist_id>", methods=["GET"])
def api_check_duplicates(playlist_id):
    """
    Check for duplicate songs without removing them.
    Returns: { ok, has_duplicates, duplicate_count, duplicates: [...] }
    """
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Ensure ownership
        try:
            if not user_owns_playlist(sp, playlist_id):
                return jsonify({"ok": False, "error": "playlist_not_owned"}), 403
        except Exception:
            return jsonify({"ok": False, "error": "ownership_check_failed"}), 400

        items = playlist_items_with_positions(sp, playlist_id)

        # Group by canonical (title + artists)
        groups: Dict[str, List[Tuple[int, str, str, str]]] = {}
        for idx, it in enumerate(items):
            tr = (it or {}).get("track") or {}
            if not tr:
                continue
            uri = tr.get("uri")
            name = tr.get("name") or ""
            artists_list = tr.get("artists") or []
            if not uri:
                continue
            key = canonical_title(name) + "||" + canonical_artists(artists_list)
            groups.setdefault(key, []).append((
                idx, uri, name, ", ".join(a.get("name", "") for a in artists_list)
            ))

        # Find duplicates
        duplicates = []
        total_duplicates = 0
        for key, occurrences in groups.items():
            if len(occurrences) <= 1:
                continue
            occurrences.sort(key=lambda t: t[0])
            keep = occurrences[0]
            dups = occurrences[1:]
            total_duplicates += len(dups)
            duplicates.append({
                "track_name": keep[2],
                "artists": keep[3],
                "total_occurrences": len(occurrences),
                "duplicates_to_remove": len(dups),
            })

        pl = sp.playlist(playlist_id)
        return jsonify({
            "ok": True,
            "has_duplicates": len(duplicates) > 0,
            "duplicate_count": total_duplicates,
            "playlist_name": pl.get("name", ""),
            "duplicates": duplicates
        })

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Remove duplicates (API) ---
@app.route("/api/remove-duplicates/<playlist_id>", methods=["POST"])
def api_remove_duplicates(playlist_id):
    """
    Remove duplicate songs (canonical title + artist set).
    Keeps the earliest occurrence; removes others by specific positions.
    Returns: { ok, removed_count, playlist_name, details }
    """
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Ensure ownership
        try:
            if not user_owns_playlist(sp, playlist_id):
                return jsonify({"ok": False, "error": "playlist_not_owned"}), 403
        except Exception:
            return jsonify({"ok": False, "error": "ownership_check_failed"}), 400

        items = playlist_items_with_positions(sp, playlist_id)

        # Group by canonical (title + artists)
        groups: Dict[str, List[Tuple[int, str, str, str]]] = {}
        for idx, it in enumerate(items):
            tr = (it or {}).get("track") or {}
            if not tr:
                continue
            uri = tr.get("uri")
            name = tr.get("name") or ""
            artists_list = tr.get("artists") or []
            if not uri:
                continue
            key = canonical_title(name) + "||" + canonical_artists(artists_list)
            groups.setdefault(key, []).append((
                idx, uri, name, ", ".join(a.get("name", "") for a in artists_list)
            ))

        # Choose removals: keep earliest (lowest idx), remove rest
        removal_map: Dict[str, List[int]] = {}
        details = []
        for key, occurrences in groups.items():
            if len(occurrences) <= 1:
                continue
            occurrences.sort(key=lambda t: t[0])
            keep = occurrences[0]
            dups = occurrences[1:]
            for pos, uri, name, artists_str in dups:
                removal_map.setdefault(uri, []).append(pos)
            details.append({
                "keep": {"position": keep[0], "name": keep[2], "artists": keep[3]},
                "removed": [{"position": p, "uri": u, "name": n, "artists": a}
                            for (p, u, n, a) in dups]
            })

        if not removal_map:
            pl = sp.playlist(playlist_id)
            return jsonify({"ok": True, "removed_count": 0, "playlist_name": pl.get("name", ""), "details": []})

        payload = [{"uri": uri, "positions": sorted(pos_list)} for uri, pos_list in removal_map.items()]
        removed_count = sum(len(p["positions"]) for p in payload)

        # API allows up to 100 entries per call
        for batch_start in range(0, len(payload), 100):
            batch = payload[batch_start:batch_start+100]
            sp.playlist_remove_specific_occurrences_of_items(playlist_id, batch)

        pl = sp.playlist(playlist_id)
        return jsonify({"ok": True, "removed_count": removed_count, "playlist_name": pl.get("name", ""), "details": details})

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# Frontend expects /remove-duplicates/<id>, so provide an alias:
@app.route("/remove-duplicates/<playlist_id>", methods=["POST"])
def remove_duplicates_alias(playlist_id):
    return api_remove_duplicates(playlist_id)

# --- Playlist API (JSON for inline view) ---
@app.route("/api/playlist/<playlist_id>")
def api_playlist(playlist_id):
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Support pagination for large playlists
        limit = request.args.get('limit', type=int)
        offset = request.args.get('offset', default=0, type=int)

        if playlist_id == RECENT_ID:
            me = sp.me() or {}
            try:
                recent = sp.current_user_recently_played(limit=50) or {}
            except SpotifyException as e:
                if e.http_status == 403:
                    return jsonify({"ok": False, "error": "recently_played_missing_scope"}), 403
                raise

            items = recent.get("items", []) or []
            rows = []
            for it in items:
                tr = (it or {}).get("track") or {}
                if not tr:
                    continue
                album = tr.get("album") or {}
                images = album.get("images") or []
                rows.append({
                    "id": tr.get("id"),
                    "name": tr.get("name"),
                    "artists": ", ".join(a.get("name", "") for a in (tr.get("artists") or [])),
                    "album": album.get("name"),
                    "added_at": it.get("played_at"),
                    "url": (tr.get("external_urls") or {}).get("spotify"),
                    "explicit": tr.get("explicit"),
                    "duration_ms": tr.get("duration_ms"),
                    "cover": images[0].get("url") if images else None,
                })

            return jsonify({
                "ok": True,
                "playlist": {
                    "id": RECENT_ID,
                    "name": "Recently Played",
                    "owner": me.get("display_name") or me.get("id") or "You",
                    "total": len(rows),
                    "url": None,
                    "image": None,  # no cover for Recently Played
                },
                "tracks": rows,
            })

        # Normal playlist
        pl = sp.playlist(playlist_id)
        imgs = pl.get("images") or []
        img_url = imgs[0].get("url") if imgs else None
        total_tracks = (pl.get("tracks") or {}).get("total", 0)

        # If limit is specified, fetch only that many tracks
        if limit is not None:
            result = sp.playlist_items(playlist_id, limit=min(limit, 100), offset=offset)
            items = result.get("items", [])
            has_more = (offset + len(items)) < total_tracks
        else:
            # Fetch all tracks (original behavior)
            items = list(paginate(lambda o, l: sp.playlist_items(playlist_id, limit=l, offset=o)))
            has_more = False

        rows = []
        for it in items:
            tr = (it or {}).get("track") or {}
            if not tr:
                continue
            album = tr.get("album") or {}
            images = album.get("images") or []
            rows.append({
                "id": tr.get("id"),
                "name": tr.get("name"),
                "artists": ", ".join(a.get("name", "") for a in (tr.get("artists") or [])),
                "album": album.get("name"),
                "added_at": it.get("added_at"),
                "url": (tr.get("external_urls") or {}).get("spotify"),
                "explicit": tr.get("explicit"),
                "duration_ms": tr.get("duration_ms"),
                "cover": images[0].get("url") if images else None,
            })

        return jsonify({
            "ok": True,
            "playlist": {
                "id": pl.get("id"),
                "name": pl.get("name"),
                "owner": (pl.get("owner") or {}).get("display_name") or (pl.get("owner") or {}).get("id"),
                "total": total_tracks,
                "url": (pl.get("external_urls") or {}).get("spotify"),
                "image": img_url,
            },
            "tracks": rows,
            "has_more": has_more,
            "offset": offset,
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

# --- Filter Sweep ---
@app.route("/filter-sweep", methods=["POST"])
def filter_sweep():
    """Remove from Playlist A any tracks that appear in one or more reference playlists B."""
    if "token_info" not in session:
        return redirect(url_for("index"))

    playlist_a = request.form.get("playlist_a_id")
    playlist_b_list = request.form.getlist("playlist_b_id")  # multiple values
    if not playlist_a or not playlist_b_list:
        flash("Select Playlist A (owned) and at least one Playlist B (reference).")
        return redirect(url_for("index"))
    if playlist_a in playlist_b_list:
        flash("Playlist A cannot also be in the reference list.")
        return redirect(url_for("index"))

    try:
        sp = get_sp()

        # Ensure A is owned by current user
        if not user_owns_playlist(sp, playlist_a):
            flash("Playlist A must be owned by you.")
            return redirect(url_for("index"))

        # Fetch A (for name + sanity)
        playlist_a_obj = sp.playlist(playlist_a)
        playlist_a_name = (playlist_a_obj or {}).get("name", "Playlist A")

        # Collect URIs
        a_uris = set(get_all_track_uris(sp, playlist_a))
        if not a_uris:
            flash(f"“{playlist_a_name}” has no tracks.")
            return redirect(url_for("index"))

        # Merge B reference URIs
        ref_uris = set()
        for pid in playlist_b_list:
            ref_uris.update(get_reference_uris(sp, pid))

        to_remove = list(a_uris.intersection(ref_uris))
        if not to_remove:
            flash(f"No overlap found. Nothing to remove from “{playlist_a_name}”.")
            return redirect(url_for("index"))

        removed = 0
        for batch in chunks(to_remove, 100):
            sp.playlist_remove_all_occurrences_of_items(playlist_a, batch)
            removed += len(batch)

        flash(f"Filter Sweep complete, removed {removed} track(s) from “{playlist_a_name}”.")
        return redirect(url_for("index"))

    except SpotifyException as e:
        flash(f"Spotify error: {e}")
        return redirect(url_for("index"))
    except Exception as e:
        flash(f"Filter Sweep failed: {e}")
        return redirect(url_for("index"))

@app.route("/api/playlists")
def api_playlists():
    """
    Get user's playlists
    Returns: { ok, playlists, owned_playlists }
    """
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()
        owned = list_owned_playlists(sp)
        all_pl = list_all_playlists(sp)

        # Inject synthetic "Recently Played" into general list
        me = sp.me() or {}
        recent_entry = {
            "id": RECENT_ID,
            "name": "Recently Played",
            "owner": {"id": (me.get("id") or "me"), "display_name": me.get("display_name") or "You"},
        }
        all_pl.append(recent_entry)

        # A–Z sort
        owned.sort(key=lambda p: (p.get("name") or "").lower())
        all_pl.sort(key=lambda p: (p.get("name") or "").lower())

        return jsonify({
            "ok": True,
            "playlists": all_pl,
            "owned_playlists": owned
        })
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/user-stats")
def api_user_stats():
    """
    Get user statistics: top artists, top tracks, recently played
    Returns: { ok, top_artists, top_tracks, recently_played }
    """
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Get user profile
        user = sp.current_user()
        user_name = user.get("display_name", "User")
        user_images = user.get("images", [])
        user_image = user_images[0].get("url") if user_images else None

        def format_artist(artist: Dict[str, Any]) -> Dict[str, Any]:
            images = artist.get("images") or []
            name = artist.get("name") or "Unknown Artist"
            genres = (artist.get("genres") or [])[:3]
            followers_raw = artist.get("followers") or {}
            followers_total = followers_raw.get("total") if isinstance(followers_raw, dict) else None
            popularity = artist.get("popularity")
            primary_genre = genres[0] if genres else None

            bio_parts = []
            if primary_genre:
                bio_parts.append(f"{name} is a {primary_genre} artist")
            else:
                bio_parts.append(f"{name} is an artist")
            if isinstance(followers_total, int) and followers_total > 0:
                bio_parts.append(f"followed by {followers_total:,} Spotify listeners")
            if isinstance(popularity, int):
                bio_parts.append(f"with a popularity score of {popularity}/100")
            biography = ", ".join(bio_parts).strip()
            if biography and not biography.endswith("."):
                biography += "."

            return {
                "id": artist.get("id"),
                "name": name,
                "url": (artist.get("external_urls") or {}).get("spotify"),
                "image": images[0].get("url") if images else None,
                "genres": genres,
                "followers": followers_total,
                "popularity": popularity,
                "bio": biography,
            }

        def format_track(track: Dict[str, Any]) -> Dict[str, Any]:
            artists = track.get("artists") or []
            artist_ids = [a.get("id") for a in artists if a.get("id")]
            album = track.get("album") or {}
            album_images = album.get("images") or []
            release_date = album.get("release_date") or ""
            release_year = release_date[:4] if isinstance(release_date, str) else None
            return {
                "name": track.get("name"),
                "artists": ", ".join(a.get("name", "") for a in artists),
                "url": (track.get("external_urls") or {}).get("spotify"),
                "album": album.get("name"),
                "album_year": release_year,
                "album_id": album.get("id"),
                "cover": album_images[0].get("url") if album_images else None,
                "artist_ids": artist_ids,
            }

        top_artists: Dict[str, List[Dict[str, Any]]] = {}
        for range_key in TIME_RANGE_KEYS:
            data = sp.current_user_top_artists(limit=50, time_range=range_key) or {}
            items = data.get("items") or []
            top_artists[range_key] = [format_artist(artist) for artist in items if isinstance(artist, dict)]

        top_tracks: Dict[str, List[Dict[str, Any]]] = {}
        track_artist_ids: List[str] = []
        for range_key in TIME_RANGE_KEYS:
            data = sp.current_user_top_tracks(limit=50, time_range=range_key) or {}
            items = data.get("items") or []
            formatted_tracks = [format_track(track) for track in items if isinstance(track, dict)]
            top_tracks[range_key] = formatted_tracks
            for t in formatted_tracks:
                track_artist_ids.extend(t.get("artist_ids") or [])

        artist_genre_lookup = build_artist_genre_lookup(sp, top_artists, track_artist_ids)

        top_genres = {
            "artists": {range_key: summarize_genres(top_artists, range_key) for range_key in TIME_RANGE_KEYS},
            "tracks": {range_key: summarize_genres_from_tracks(top_tracks, artist_genre_lookup, range_key) for range_key in TIME_RANGE_KEYS},
        }

        # Recently Played (last 30)
        recent_data = sp.current_user_recently_played(limit=30) or {}
        recently_played = []
        recent_total_ms = 0
        for item in (recent_data.get('items') or []):
            track = item.get('track') or {}
            artists = track.get('artists') or []
            duration_ms = track.get('duration_ms')
            if isinstance(duration_ms, (int, float)):
                recent_total_ms += duration_ms
            recently_played.append({
                'name': track.get('name'),
                'artists': ', '.join(a.get('name', '') for a in artists),
                'url': (track.get('external_urls') or {}).get('spotify'),
                'played_at': item.get('played_at'),
                'duration_ms': duration_ms,
            })
        recent_minutes = round(recent_total_ms / 60000) if recent_total_ms else None

        return jsonify({
            "ok": True,
            "user": {
                "name": user_name,
                "image": user_image,
            },
            "top_artists": top_artists,
            "top_tracks": top_tracks,
            "recently_played": recently_played,
            "range_labels": TIME_RANGE_LABELS,
            "top_genres": top_genres,
            "recent_minutes_listened": recent_minutes,
        })

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

@app.route("/api/search")
def api_search():
    """Search for tracks and albums."""
    token_info = session.get("token_info")
    if not token_info:
        return jsonify({"ok": False, "error": "not_logged_in"}), 401

    sp = spotipy.Spotify(auth=token_info.get("access_token"))

    query = request.args.get("q", "").strip()
    search_type = request.args.get("type", "track,album")
    limit = min(int(request.args.get("limit", 5)), 20)

    if not query:
        return jsonify({"ok": True, "results": []})

    try:
        results = sp.search(q=query, type=search_type, limit=limit)
        items = []

        # Process tracks
        if "tracks" in results:
            for track in results["tracks"]["items"]:
                album_info = track.get("album") or {}
                album_images = album_info.get("images") or []
                release_date = album_info.get("release_date") or ""
                release_year = release_date[:4] if isinstance(release_date, str) else None
                items.append({
                    "type": "track",
                    "name": track.get("name"),
                    "artist": ", ".join(a.get("name") for a in (track.get("artists") or []) if a.get("name")),
                    "image": album_images[0]["url"] if album_images else None,
                    "id": track.get("id"),
                    "uri": track.get("uri"),
                    "album": album_info.get("name"),
                    "album_id": album_info.get("id"),
                    "album_year": release_year
                })

        # Process albums
        if "albums" in results:
            for album in results["albums"]["items"]:
                album_images = album.get("images") or []
                release_date = album.get("release_date") or ""
                release_year = release_date[:4] if isinstance(release_date, str) else None
                items.append({
                    "type": "album",
                    "name": album.get("name"),
                    "artist": ", ".join(a.get("name") for a in (album.get("artists") or []) if a.get("name")),
                    "image": album_images[0]["url"] if album_images else None,
                    "id": album.get("id"),
                    "uri": album.get("uri"),
                    "album": album.get("name"),
                    "album_id": album.get("id"),
                    "album_year": release_year
                })

        return jsonify({"ok": True, "results": items})

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@app.route("/api/artists/<artist_id>")
def api_artist_details(artist_id: str):
    if not artist_id:
        return jsonify({"ok": False, "error": "missing_artist_id"}), 400

    try:
        sp = get_sp()
    except RuntimeError as err:
        return jsonify({"ok": False, "error": str(err)}), 401

    try:
        artist = sp.artist(artist_id) or {}
    except SpotifyException as err:
        status = err.http_status or 500
        return jsonify({"ok": False, "error": "spotify_artist_error", "details": err.msg}), status
    except Exception as err:
        return jsonify({"ok": False, "error": "artist_fetch_failed", "details": str(err)}), 500

    images = artist.get("images") or []
    genres = artist.get("genres") or []
    followers_raw = artist.get("followers") or {}
    followers_total = followers_raw.get("total") if isinstance(followers_raw, dict) else None

    # Get artist's top tracks
    top_tracks_list: List[Dict[str, Any]] = []
    try:
        top_tracks = sp.artist_top_tracks(artist_id) or {}
        for track in (top_tracks.get("tracks") or [])[:10]:
            album = track.get("album") or {}
            album_images = album.get("images") or []
            top_tracks_list.append({
                "id": track.get("id"),
                "name": track.get("name"),
                "cover": album_images[0].get("url") if album_images else None,
                "album": album.get("name"),
                "url": (track.get("external_urls") or {}).get("spotify"),
            })
    except Exception:
        pass

    # Get artist's albums (discography)
    albums_list: List[Dict[str, Any]] = []
    try:
        albums = sp.artist_albums(artist_id, album_type='album', limit=50) or {}
        for album in (albums.get("items") or []):
            album_images = album.get("images") or []
            albums_list.append({
                "id": album.get("id"),
                "name": album.get("name"),
                "cover": album_images[0].get("url") if album_images else None,
                "release_date": album.get("release_date"),
                "url": (album.get("external_urls") or {}).get("spotify"),
            })
    except Exception:
        pass

    payload = {
        "id": artist.get("id") or artist_id,
        "name": artist.get("name"),
        "image": images[0].get("url") if images else None,
        "genres": genres,
        "followers": followers_total,
        "popularity": artist.get("popularity"),
        "spotify_url": (artist.get("external_urls") or {}).get("spotify"),
        "top_tracks": top_tracks_list,
        "albums": albums_list,
    }

    return jsonify({"ok": True, "artist": payload})


@app.route("/api/albums/<album_id>")
def api_album_details(album_id: str):
    if not album_id:
        return jsonify({"ok": False, "error": "missing_album_id"}), 400

    try:
        sp = get_sp()
    except RuntimeError as err:
        return jsonify({"ok": False, "error": str(err)}), 401

    try:
        album = sp.album(album_id) or {}
    except SpotifyException as err:
        status = err.http_status or 500
        return jsonify({"ok": False, "error": "spotify_album_error", "details": err.msg}), status
    except Exception as err:  # pragma: no cover - defensive
        return jsonify({"ok": False, "error": "album_fetch_failed", "details": str(err)}), 500

    release_date = album.get("release_date") or ""
    release_year = release_date[:4] if isinstance(release_date, str) else None
    images = album.get("images") or []
    artists = [a.get("name") for a in (album.get("artists") or []) if a.get("name")]
    cover = images[0].get("url") if images else None

    tracks: List[Dict[str, Any]] = []
    try:
        track_page = sp.album_tracks(album_id, limit=50, offset=0) or {}
        while True:
            for tr in track_page.get("items") or []:
                tracks.append({
                    "id": tr.get("id"),
                    "name": tr.get("name"),
                    "number": tr.get("track_number"),
                    "duration_ms": tr.get("duration_ms"),
                })
            if not track_page.get("next"):
                break
            track_page = sp.next(track_page) or {}
    except Exception:
        pass

    payload = {
        "id": album.get("id") or album_id,
        "name": album.get("name"),
        "artists": artists,
        "release_year": release_year,
        "cover": cover,
        "spotify_url": (album.get("external_urls") or {}).get("spotify"),
        "total_tracks": album.get("total_tracks"),
        "tracks": tracks,
    }
    return jsonify({"ok": True, "album": payload})

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))

# ---------- Diagnostics ----------
@app.route("/diag")
def diag():
    cid = getenv_stripped("SPOTIPY_CLIENT_ID") or ""
    csec = getenv_stripped("SPOTIPY_CLIENT_SECRET") or ""
    redir = getenv_stripped("SPOTIPY_REDIRECT_URI") or ""
    return jsonify({
        "client_id_len": len(cid),
        "client_secret_len": len(csec),
        "redirect_uri": redir,
        "dotenv_path": str(DOTENV_PATH)
    })

@app.route("/test-client")
def test_client():
    cid = getenv_stripped("SPOTIPY_CLIENT_ID")
    csec = getenv_stripped("SPOTIPY_CLIENT_SECRET")
    if not cid or not csec:
        return jsonify({"ok": False, "reason": "missing env"}), 400
    basic = base64.b64encode(f"{cid}:{csec}".encode()).decode()
    r = requests.post(
        "https://accounts.spotify.com/api/token",
        headers={"Authorization": f"Basic {basic}"},
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    try:
        data = r.json()
    except Exception:
        data = {"text": r.text}
    return jsonify({"status": r.status_code, "json": data})

@app.route("/favicon.ico")
def favicon():
    return ('', 204)

# Route for old static files (icons, css, js)
@app.route('/static/<path:path>')
def send_static(path):
    from flask import send_from_directory
    return send_from_directory('static', path)

# Catch-all route for React Router (must be last)
@app.route('/<path:path>')
def catch_all(path):
    # Don't catch API routes or auth routes
    if path.startswith('api/') or path in ['login', 'callback', 'logout', 'filter-sweep']:
        return ('Not found', 404)
    # Try to serve static file from dist, otherwise serve React app
    try:
        return app.send_static_file(path)
    except:
        return app.send_static_file("index.html")

# ---------- Entrypoint ----------
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)

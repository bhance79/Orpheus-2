# app.py
import os
import re
import time
import base64
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
app = Flask(__name__)
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

# ---------- Routes ----------
@app.route("/")
def index():
    if "token_info" not in session:
        return render_template("index.html", playlists=None, owned_playlists=None)
    try:
        sp = get_sp()
        owned = list_owned_playlists(sp)
        all_pl = list_all_playlists(sp)

        # Inject synthetic "Recently Played" into general list
        me = sp.me() or {}
        recent_entry = {
            "id": RECENT_ID,
            "name": "Recently Played",
            "owner": {"id": (me.get("id") or "me")},
        }
        all_pl.append(recent_entry)

        # A–Z sort
        owned.sort(key=lambda p: (p.get("name") or "").lower())
        all_pl.sort(key=lambda p: (p.get("name") or "").lower())

        return render_template(
            "index.html",
            playlists=all_pl,
            owned_playlists=owned,
            default_playlist="CRATEDIGGER",
            user_name=session.get("user_name"),
            user_image=session.get("user_image")
        )
    except Exception as e:
        flash(str(e))
        return render_template("index.html", playlists=None, owned_playlists=None)

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
        session["user_image"] = None
        images = user.get("images", [])
        if images:
            session["user_image"] = images[0].get("url")
    except Exception:
        # If profile fails, continue — not fatal
        pass

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
                rows.append({
                    "name": tr.get("name"),
                    "artists": ", ".join(a.get("name", "") for a in (tr.get("artists") or [])),
                    "album": (tr.get("album") or {}).get("name"),
                    "added_at": it.get("played_at"),
                    "url": (tr.get("external_urls") or {}).get("spotify"),
                    "explicit": tr.get("explicit"),
                    "duration_ms": tr.get("duration_ms"),
                })

            rows.sort(key=lambda t: (t.get("name") or "").lower())

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

        items = list(paginate(lambda o, l: sp.playlist_items(playlist_id, limit=l, offset=o)))
        rows = []
        for it in items:
            tr = (it or {}).get("track") or {}
            if not tr:
                continue
            rows.append({
                "name": tr.get("name"),
                "artists": ", ".join(a.get("name", "") for a in (tr.get("artists") or [])),
                "album": (tr.get("album") or {}).get("name"),
                "added_at": it.get("added_at"),
                "url": (tr.get("external_urls") or {}).get("spotify"),
                "explicit": tr.get("explicit"),
                "duration_ms": tr.get("duration_ms"),
            })

        rows.sort(key=lambda t: (t.get("name") or "").lower())

        return jsonify({
            "ok": True,
            "playlist": {
                "id": pl.get("id"),
                "name": pl.get("name"),
                "owner": (pl.get("owner") or {}).get("display_name") or (pl.get("owner") or {}).get("id"),
                "total": (pl.get("tracks") or {}).get("total"),
                "url": (pl.get("external_urls") or {}).get("spotify"),
                "image": img_url,
            },
            "tracks": rows,
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

        # Top Artists (last 4 weeks)
        top_artists_data = sp.current_user_top_artists(limit=5, time_range='short_term') or {}
        top_artists = []
        for artist in (top_artists_data.get('items') or []):
            images = artist.get('images') or []
            top_artists.append({
                'name': artist.get('name'),
                'url': (artist.get('external_urls') or {}).get('spotify'),
                'image': images[0].get('url') if images else None,
                'genres': artist.get('genres', [])[:3],  # First 3 genres
            })

        # Top Tracks (last 4 weeks)
        top_tracks_data = sp.current_user_top_tracks(limit=5, time_range='short_term') or {}
        top_tracks = []
        for track in (top_tracks_data.get('items') or []):
            artists = track.get('artists') or []
            top_tracks.append({
                'name': track.get('name'),
                'artists': ', '.join(a.get('name', '') for a in artists),
                'url': (track.get('external_urls') or {}).get('spotify'),
                'album': (track.get('album') or {}).get('name'),
            })

        # Recently Played (last 10)
        recent_data = sp.current_user_recently_played(limit=10) or {}
        recently_played = []
        for item in (recent_data.get('items') or []):
            track = item.get('track') or {}
            artists = track.get('artists') or []
            recently_played.append({
                'name': track.get('name'),
                'artists': ', '.join(a.get('name', '') for a in artists),
                'url': (track.get('external_urls') or {}).get('spotify'),
                'played_at': item.get('played_at'),
            })

        return jsonify({
            "ok": True,
            "top_artists": top_artists,
            "top_tracks": top_tracks,
            "recently_played": recently_played,
        })

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500

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

# ---------- Entrypoint ----------
if __name__ == "__main__":
    app.run(debug=True)

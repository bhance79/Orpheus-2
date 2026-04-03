from typing import Any, Dict, List

import requests as http_requests
import spotipy
from flask import Blueprint, jsonify, request, session
from spotipy.exceptions import SpotifyException

from spotify_client import (
    TIME_RANGE_KEYS,
    TIME_RANGE_LABELS,
    build_artist_genre_lookup,
    get_sp,
    summarize_genres,
    summarize_genres_from_tracks,
)

stats_bp = Blueprint("stats", __name__)


@stats_bp.route("/api/user-stats")
def api_user_stats():
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

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
                "album_url": (album.get("external_urls") or {}).get("spotify"),
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

        top_albums: Dict[str, List[Dict[str, Any]]] = {}
        for range_key, tracks in top_tracks.items():
            album_map: Dict[str, Any] = {}
            for t in tracks:
                aid = t.get('album_id')
                if not aid:
                    continue
                if aid not in album_map:
                    album_map[aid] = {
                        'id': aid,
                        'name': t.get('album'),
                        'cover': t.get('cover'),
                        'artists': t.get('artists'),
                        'year': t.get('album_year'),
                        'url': t.get('album_url'),
                        'track_count': 0,
                    }
                album_map[aid]['track_count'] += 1
            top_albums[range_key] = sorted(album_map.values(), key=lambda x: x['track_count'], reverse=True)

        recent_data = sp.current_user_recently_played(limit=30) or {}
        recently_played = []
        recent_total_ms = 0
        for item in (recent_data.get('items') or []):
            track = item.get('track') or {}
            artists = track.get('artists') or []
            duration_ms = track.get('duration_ms')
            if isinstance(duration_ms, (int, float)):
                recent_total_ms += duration_ms
            album_images = (track.get('album') or {}).get('images') or []
            cover = album_images[0].get('url') if album_images else None
            recently_played.append({
                'name': track.get('name'),
                'artists': ', '.join(a.get('name', '') for a in artists),
                'url': (track.get('external_urls') or {}).get('spotify'),
                'played_at': item.get('played_at'),
                'duration_ms': duration_ms,
                'cover': cover,
            })
        recent_minutes = round(recent_total_ms / 60000) if recent_total_ms else None

        return jsonify({
            "ok": True,
            "user": {"name": user_name, "image": user_image},
            "top_artists": top_artists,
            "top_tracks": top_tracks,
            "recently_played": recently_played,
            "range_labels": TIME_RANGE_LABELS,
            "top_genres": top_genres,
            "top_albums": top_albums,
            "recent_minutes_listened": recent_minutes,
        })

    except SpotifyException as e:
        return jsonify({"ok": False, "error": f"spotify_error:{e}"}), 500
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 500


@stats_bp.route("/api/search")
def api_search():
    token_info = session.get("token_info")
    if not token_info:
        return jsonify({"ok": False, "error": "not_logged_in"}), 401

    sp = spotipy.Spotify(auth=token_info.get("access_token"))

    query = request.args.get("q", "").strip()
    raw_types = request.args.get("type", "track,album")
    requested_types = [t.strip() for t in raw_types.split(',') if t.strip()]
    search_types = ','.join(requested_types) if requested_types else 'track'
    limit = min(int(request.args.get("limit", 5)), 20)

    if not query:
        return jsonify({"ok": True, "results": []})

    try:
        results = sp.search(q=query, type=search_types, limit=limit)
        items = []

        if "tracks" in results:
            for track in results["tracks"]["items"]:
                album_info = track.get("album") or {}
                album_images = album_info.get("images") or []
                release_date = album_info.get("release_date") or ""
                release_year = release_date[:4] if isinstance(release_date, str) else None
                items.append({
                    "type": "track",
                    "seedType": "track",
                    "name": track.get("name"),
                    "artist": ", ".join(a.get("name") for a in (track.get("artists") or []) if a.get("name")),
                    "image": album_images[0]["url"] if album_images else None,
                    "id": track.get("id"),
                    "uri": track.get("uri"),
                    "album": album_info.get("name"),
                    "album_id": album_info.get("id"),
                    "album_year": release_year
                })

        if "artists" in results:
            for artist in results["artists"]["items"]:
                images = artist.get("images") or []
                followers_raw = artist.get("followers") or {}
                followers_total = followers_raw.get("total") if isinstance(followers_raw, dict) else None
                items.append({
                    "type": "artist",
                    "seedType": "artist",
                    "name": artist.get("name"),
                    "artist": artist.get("name"),
                    "image": images[0]["url"] if images else None,
                    "id": artist.get("id"),
                    "uri": (artist.get("external_urls") or {}).get("spotify"),
                    "genres": (artist.get("genres") or [])[:3],
                    "followers": followers_total,
                })

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


@stats_bp.route("/api/artists/<artist_id>")
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

    return jsonify({
        "ok": True,
        "artist": {
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
    })


@stats_bp.route("/api/artists/<artist_id>/bio")
def api_artist_bio(artist_id: str):
    # Get artist name from Spotify first
    try:
        sp = get_sp()
        artist = sp.artist(artist_id) or {}
        artist_name = artist.get("name", "")
    except Exception as err:
        return jsonify({"ok": False, "error": str(err)}), 500

    if not artist_name:
        return jsonify({"ok": False, "error": "artist_not_found"}), 404

    # Fetch full intro section from Wikipedia (much more detailed than /page/summary)
    try:
        params = {
            "action": "query",
            "titles": artist_name,
            "prop": "extracts|info",
            "exintro": True,       # intro section only (before first heading)
            "explaintext": True,   # plain text, no wiki markup
            "inprop": "url",
            "format": "json",
            "redirects": 1,
        }
        resp = http_requests.get(
            "https://en.wikipedia.org/w/api.php",
            params=params,
            timeout=8,
            headers={"User-Agent": "Orpheus/2.0"},
        )
        resp.raise_for_status()
        data = resp.json()
        pages = (data.get("query") or {}).get("pages") or {}
        page = next(iter(pages.values()), {})

        if page.get("pageid") == -1 or not page.get("extract"):
            return jsonify({"ok": True, "bio": None, "source": None})

        return jsonify({
            "ok": True,
            "bio": page["extract"].strip(),
            "source": page.get("fullurl"),
        })
    except Exception as err:
        return jsonify({"ok": False, "error": str(err)}), 500


@stats_bp.route("/api/albums/<album_id>")
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
    except Exception as err:
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

    return jsonify({
        "ok": True,
        "album": {
            "id": album.get("id") or album_id,
            "name": album.get("name"),
            "artists": artists,
            "release_year": release_year,
            "cover": cover,
            "spotify_url": (album.get("external_urls") or {}).get("spotify"),
            "total_tracks": album.get("total_tracks"),
            "tracks": tracks,
        }
    })

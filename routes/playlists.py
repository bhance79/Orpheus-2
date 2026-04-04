import logging
from typing import Any, Dict, List, Optional, Set, Tuple

from flask import Blueprint, jsonify, request, session
from spotipy.exceptions import SpotifyException

logger = logging.getLogger(__name__)

from spotify_client import (
    RECENT_ID,
    chunks,
    current_user_id,
    get_all_track_uris,
    get_reference_uris,
    get_sp,
    list_all_playlists,
    list_owned_playlists,
    playlist_items_with_positions,
    canonical_title,
    canonical_artists,
)
from utils import normalize, safe_get, is_valid_spotify_id

playlists_bp = Blueprint("playlists", __name__)


# ---------- Playlists API ----------
@playlists_bp.route("/api/playlists")
def api_playlists():
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()
        limit = request.args.get("limit", type=int)
        offset = request.args.get("offset", default=0, type=int)
        owned_only = (request.args.get("owned_only") or "").strip().lower() in {"1", "true", "yes", "on"}

        if limit is not None:
            per_page = max(1, min(limit, 50))
            offset = max(offset, 0)
            page = sp.current_user_playlists(limit=per_page, offset=offset) or {}
            items = page.get("items", []) or []
            has_more = bool(page.get("next"))
            next_offset = offset + per_page if has_more else None
            user_profile = sp.me() or {}
            me_id = normalize(user_profile.get("id"))

            def is_owned(pl: Dict[str, Any]) -> bool:
                return normalize(safe_get(safe_get(pl, "owner", {}), "id")) == me_id

            owned_items = [pl for pl in items if is_owned(pl)]
            owned_items.sort(key=lambda p: (p.get("name") or "").lower())
            payload_playlists = owned_items if owned_only else list(items)
            if not owned_only:
                payload_playlists.sort(key=lambda p: (p.get("name") or "").lower())

            if not owned_only and offset == 0:
                recent_entry = {
                    "id": RECENT_ID,
                    "name": "Recently Played",
                    "owner": {
                        "id": user_profile.get("id") or "me",
                        "display_name": user_profile.get("display_name") or "You"
                    },
                }
                payload_playlists.append(recent_entry)

            return jsonify({
                "ok": True,
                "playlists": payload_playlists,
                "owned_playlists": owned_items,
                "has_more": has_more,
                "next_offset": next_offset,
                "total": page.get("total", len(payload_playlists)),
                "limit": per_page,
                "offset": offset,
            })

        owned = list_owned_playlists(sp)
        all_pl = list_all_playlists(sp)

        me = sp.me() or {}
        recent_entry = {
            "id": RECENT_ID,
            "name": "Recently Played",
            "owner": {"id": (me.get("id") or "me"), "display_name": me.get("display_name") or "You"},
        }
        all_pl.append(recent_entry)

        owned.sort(key=lambda p: (p.get("name") or "").lower())
        all_pl.sort(key=lambda p: (p.get("name") or "").lower())

        return jsonify({
            "ok": True,
            "playlists": all_pl,
            "owned_playlists": owned
        })
    except Exception:
        logger.exception("Unexpected error in api_playlists")
        return jsonify({"ok": False, "error": "internal_error"}), 500


@playlists_bp.route("/api/playlist/<playlist_id>", methods=["GET", "DELETE"])
def api_playlist(playlist_id):
    if playlist_id != RECENT_ID and not is_valid_spotify_id(playlist_id):
        return jsonify({"ok": False, "error": "invalid_playlist_id"}), 400
    if request.method == "DELETE":
        if "token_info" not in session:
            return jsonify({"ok": False, "error": "not_authenticated"}), 401
        try:
            sp = get_sp()
            sp.current_user_unfollow_playlist(playlist_id)
            return jsonify({"ok": True})
        except Exception:
            logger.exception("Error unfollowing playlist %s", playlist_id)
            return jsonify({"ok": False, "error": "internal_error"}), 500
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

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
                    "image": None,
                },
                "tracks": rows,
            })

        pl = sp.playlist(playlist_id)
        imgs = pl.get("images") or []
        img_url = imgs[0].get("url") if imgs else None
        total_tracks = (pl.get("tracks") or {}).get("total", 0)

        if limit is not None:
            result = sp.playlist_items(playlist_id, limit=min(limit, 100), offset=offset)
            items = result.get("items", [])
            has_more = (offset + len(items)) < total_tracks
        else:
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
    except Exception:
        logger.exception("Unexpected error in api_playlist %s", playlist_id)
        return jsonify({"ok": False, "error": "internal_error"}), 500


# ---------- Duplicates ----------
@playlists_bp.route("/api/check-duplicates/<playlist_id>", methods=["GET"])
def api_check_duplicates(playlist_id):
    if not is_valid_spotify_id(playlist_id):
        return jsonify({"ok": False, "error": "invalid_playlist_id"}), 400
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Fetch playlist once — used for both ownership check and name
        try:
            pl = sp.playlist(playlist_id)
            owner_id = normalize((pl.get("owner") or {}).get("id") or "")
            if owner_id != normalize(current_user_id(sp)):
                return jsonify({"ok": False, "error": "playlist_not_owned"}), 403
        except Exception:
            return jsonify({"ok": False, "error": "ownership_check_failed"}), 400

        items = playlist_items_with_positions(sp, playlist_id)

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

        return jsonify({
            "ok": True,
            "has_duplicates": len(duplicates) > 0,
            "duplicate_count": total_duplicates,
            "playlist_name": pl.get("name", ""),
            "duplicates": duplicates
        })

    except SpotifyException as e:
        logger.error("Spotify error in check-duplicates %s: %s", playlist_id, e)
        return jsonify({"ok": False, "error": "spotify_error"}), 500
    except Exception:
        logger.exception("Unexpected error in check-duplicates %s", playlist_id)
        return jsonify({"ok": False, "error": "internal_error"}), 500


@playlists_bp.route("/api/remove-duplicates/<playlist_id>", methods=["POST"])
def api_remove_duplicates(playlist_id):
    if not is_valid_spotify_id(playlist_id):
        return jsonify({"ok": False, "error": "invalid_playlist_id"}), 400
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401
    try:
        sp = get_sp()

        # Fetch playlist once — used for both ownership check and name
        try:
            pl = sp.playlist(playlist_id)
            owner_id = normalize((pl.get("owner") or {}).get("id") or "")
            if owner_id != normalize(current_user_id(sp)):
                return jsonify({"ok": False, "error": "playlist_not_owned"}), 403
        except Exception:
            return jsonify({"ok": False, "error": "ownership_check_failed"}), 400

        playlist_name = pl.get("name", "")
        items = playlist_items_with_positions(sp, playlist_id)

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
            return jsonify({"ok": True, "removed_count": 0, "playlist_name": playlist_name, "details": []})

        payload = [{"uri": uri, "positions": sorted(pos_list)} for uri, pos_list in removal_map.items()]
        removed_count = sum(len(p["positions"]) for p in payload)

        for batch_start in range(0, len(payload), 100):
            batch = payload[batch_start:batch_start + 100]
            sp.playlist_remove_specific_occurrences_of_items(playlist_id, batch)

        return jsonify({"ok": True, "removed_count": removed_count, "playlist_name": playlist_name, "details": details})

    except SpotifyException as e:
        logger.error("Spotify error in remove-duplicates %s: %s", playlist_id, e)
        return jsonify({"ok": False, "error": "spotify_error"}), 500
    except Exception:
        logger.exception("Unexpected error in remove-duplicates %s", playlist_id)
        return jsonify({"ok": False, "error": "internal_error"}), 500


# ---------- Filter Sweep ----------
class FilterSweepUserError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "user_error"):
        super().__init__(message)
        self.status_code = status_code
        self.code = code


def run_filter_sweep(sp, playlist_a: Optional[str], playlist_b_list: Optional[List[str]]) -> Dict[str, Any]:
    playlist_a = (playlist_a or "").strip()
    playlist_b_list = [pid for pid in (playlist_b_list or []) if pid]

    if not playlist_a or not playlist_b_list:
        raise FilterSweepUserError(
            "Select Playlist A (owned) and at least one Playlist B (reference).",
            code="missing_selection"
        )
    if playlist_a in playlist_b_list:
        raise FilterSweepUserError("Playlist A cannot also be in the reference list.", code="invalid_selection")

    if not _user_owns_playlist(sp, playlist_a):
        raise FilterSweepUserError("Playlist A must be owned by you.", status_code=403, code="not_owned")

    playlist_a_obj = sp.playlist(playlist_a)
    playlist_a_name = (playlist_a_obj or {}).get("name") or "Playlist A"

    playlist_a_items = playlist_items_with_positions(sp, playlist_a)
    a_uris: Set[str] = set()
    track_details: Dict[str, Dict[str, Any]] = {}
    for item in playlist_a_items:
        track = safe_get(item, "track") or {}
        uri = safe_get(track, "uri")
        if not uri:
            continue
        a_uris.add(uri)
        info = track_details.setdefault(uri, {
            "uri": uri,
            "name": safe_get(track, "name") or "Unknown track",
            "artists": ", ".join(
                safe_get(artist, "name") or "" for artist in (safe_get(track, "artists") or []) if safe_get(artist, "name")
            ),
            "occurrences": 0,
        })
        info["occurrences"] = info.get("occurrences", 0) + 1

    if not a_uris:
        raise FilterSweepUserError(f"\"{playlist_a_name}\" has no tracks.", code="empty_playlist")

    ref_uris = set()
    for pid in playlist_b_list:
        ref_uris.update(get_reference_uris(sp, pid))

    to_remove = list(a_uris.intersection(ref_uris))
    if not to_remove:
        raise FilterSweepUserError(f"No overlap found. Nothing to remove from \"{playlist_a_name}\".", code="no_overlap")

    to_remove.sort(key=lambda uri: (track_details.get(uri, {}).get("name") or "").lower())
    removed_tracks: List[Dict[str, Any]] = []
    for uri in to_remove:
        info = track_details.get(uri) or {"uri": uri, "name": "Unknown track", "artists": "", "occurrences": 1}
        removed_tracks.append(info)

    removed_total = sum(info.get("occurrences", 1) for info in removed_tracks)

    for batch in chunks(to_remove, 100):
        sp.playlist_remove_all_occurrences_of_items(playlist_a, batch)

    return {
        "removed": removed_total,
        "playlist_name": playlist_a_name,
        "removed_tracks": removed_tracks,
    }


@playlists_bp.route("/api/filter-sweep", methods=["POST"])
def api_filter_sweep():
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401

    playlist_a = request.form.get("playlist_a_id")
    playlist_b_list = request.form.getlist("playlist_b_id")

    try:
        sp = get_sp()
        result = run_filter_sweep(sp, playlist_a, playlist_b_list)
        return jsonify({
            "ok": True,
            "removed": result["removed"],
            "playlist_name": result["playlist_name"],
            "removed_tracks": result["removed_tracks"],
        })
    except FilterSweepUserError as e:
        return jsonify({"ok": False, "error": str(e), "code": getattr(e, "code", "user_error")}), getattr(e, "status_code", 400)
    except SpotifyException as e:
        logger.error("Spotify error in filter-sweep: %s", e)
        return jsonify({"ok": False, "error": "spotify_error"}), 500
    except Exception:
        logger.exception("Unexpected error in filter-sweep")
        return jsonify({"ok": False, "error": "filter_sweep_failed"}), 500


# ---------- Create playlist ----------
@playlists_bp.route("/api/create-playlist", methods=["POST"])
def api_create_playlist():
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401

    try:
        sp = get_sp()
    except RuntimeError as err:
        return jsonify({"ok": False, "error": str(err)}), 401

    data = request.get_json() or {}
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()
    track_uris = data.get("track_uris", [])

    if not name:
        return jsonify({"ok": False, "error": "missing_name"}), 400
    if not track_uris:
        return jsonify({"ok": False, "error": "no_tracks_provided"}), 400

    try:
        user_id = current_user_id(sp)
        if not user_id:
            return jsonify({"ok": False, "error": "could_not_get_user_id"}), 400

        playlist = sp.user_playlist_create(
            user=user_id,
            name=name,
            public=False,
            description=description
        )

        playlist_id = playlist.get("id")
        if not playlist_id:
            return jsonify({"ok": False, "error": "playlist_creation_failed"}), 500

        for batch in chunks(track_uris, 100):
            sp.playlist_add_items(playlist_id, batch)

        final_playlist = sp.playlist(playlist_id)
        images = final_playlist.get("images") or []

        return jsonify({
            "ok": True,
            "playlist": {
                "id": final_playlist.get("id"),
                "name": final_playlist.get("name"),
                "url": (final_playlist.get("external_urls") or {}).get("spotify"),
                "image": images[0].get("url") if images else None,
                "total_tracks": len(track_uris)
            }
        })

    except SpotifyException as e:
        logger.error("Spotify error in create-playlist: %s", e)
        return jsonify({"ok": False, "error": "spotify_error"}), 500
    except Exception:
        logger.exception("Unexpected error in create-playlist")
        return jsonify({"ok": False, "error": "internal_error"}), 500


# ---------- Internal helper ----------
def _user_owns_playlist(sp, playlist_id: str) -> bool:
    from spotify_client import user_owns_playlist
    return user_owns_playlist(sp, playlist_id)

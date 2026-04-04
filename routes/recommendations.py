import logging

from flask import Blueprint, jsonify, request, session

logger = logging.getLogger(__name__)
from spotipy.exceptions import SpotifyException

from spotify_client import get_sp
from utils import filter_existing_artists, filter_existing_tracks, normalize_genre_list, normalize_seed_list

recommendations_bp = Blueprint("recommendations", __name__)


@recommendations_bp.route("/api/recommendations", methods=["POST"])
def api_recommendations():
    if "token_info" not in session:
        return jsonify({"ok": False, "error": "not_authenticated"}), 401

    try:
        sp = get_sp()
    except RuntimeError as err:
        return jsonify({"ok": False, "error": str(err)}), 401

    data = request.get_json() or {}
    seed_tracks_raw = normalize_seed_list(data.get("seed_tracks", []))
    seed_artists_raw = normalize_seed_list(data.get("seed_artists", []))
    seed_genres = normalize_genre_list(data.get("seed_genres", []))

    if not seed_tracks_raw and not seed_artists_raw and not seed_genres:
        return jsonify({"ok": False, "error": "no_seeds_provided"}), 400

    seed_tracks = filter_existing_tracks(sp, seed_tracks_raw)
    seed_artists = filter_existing_artists(sp, seed_artists_raw)

    if not seed_tracks and not seed_artists and not seed_genres:
        return jsonify({"ok": False, "error": "no_valid_seeds", "details": "Spotify could not use the selected tracks or artists. Try different picks."}), 400

    limit = 100
    total_seeds = len(seed_tracks) + len(seed_artists) + len(seed_genres)
    if total_seeds > 5:
        return jsonify({"ok": False, "error": "too_many_seeds", "details": "Maximum 5 seeds allowed (tracks + artists + genres combined)"}), 400
    if total_seeds < 1:
        return jsonify({"ok": False, "error": "insufficient_seeds", "details": "At least 1 seed required"}), 400

    try:
        recommendations = sp.recommendations(
            seed_tracks=seed_tracks[:5] if seed_tracks else None,
            seed_artists=seed_artists[:5] if seed_artists else None,
            seed_genres=seed_genres[:5] if seed_genres else None,
            limit=limit
        )

        tracks = []
        for track in (recommendations.get("tracks") or []):
            album = track.get("album") or {}
            album_images = album.get("images") or []
            artists = track.get("artists") or []
            release_date = album.get("release_date") or ""
            release_year = release_date[:4] if isinstance(release_date, str) else None

            tracks.append({
                "id": track.get("id"),
                "uri": track.get("uri"),
                "name": track.get("name"),
                "artists": ", ".join(a.get("name", "") for a in artists),
                "artist_ids": [a.get("id") for a in artists if a.get("id")],
                "album": album.get("name"),
                "album_id": album.get("id"),
                "album_year": release_year,
                "cover": album_images[0].get("url") if album_images else None,
                "url": (track.get("external_urls") or {}).get("spotify"),
                "duration_ms": track.get("duration_ms"),
                "explicit": track.get("explicit"),
                "popularity": track.get("popularity"),
            })

        return jsonify({
            "ok": True,
            "recommendations": tracks,
            "seed_info": {
                "tracks": len(seed_tracks),
                "artists": len(seed_artists),
                "genres": len(seed_genres),
                "total": total_seeds
            }
        })

    except SpotifyException as e:
        if getattr(e, "http_status", None) == 404:
            return jsonify({
                "ok": False,
                "error": "spotify_seed_not_found",
                "details": "One of your selected tracks or artists is no longer available for recommendations. Remove it and try again."
            }), 400
        logger.error("Spotify error in recommendations: %s", e)
        return jsonify({"ok": False, "error": "spotify_error"}), 500
    except Exception:
        logger.exception("Unexpected error in recommendations")
        return jsonify({"ok": False, "error": "internal_error"}), 500

import os
import re
from typing import Any, Dict, Iterable, List, Optional, Set

import spotipy
from spotipy.exceptions import SpotifyException


def getenv_stripped(key: str) -> Optional[str]:
    v = os.getenv(key)
    return v.strip() if isinstance(v, str) else v


def normalize(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def safe_get(d: Any, key: str, default=None):
    return d.get(key, default) if isinstance(d, dict) else default


def normalize_seed_id(value: Any) -> Optional[str]:
    """Normalize Spotify seed identifiers (track/artist URIs or IDs) down to bare base62 ids."""
    if value is None:
        return None
    token = str(value).strip()
    if not token:
        return None
    lowered = token.lower()
    if lowered.startswith("spotify:"):
        token = token.split(":")[-1]
    elif "open.spotify.com" in lowered:
        token = token.split("/")[-1]
    token = token.split("?")[0]
    token = token.split("#")[0]
    token = token.strip()
    if not token:
        return None
    if not re.fullmatch(r"[A-Za-z0-9]{4,}", token):
        return None
    return token


def dedupe_preserve_order(values: Iterable[str]) -> List[str]:
    seen: Set[str] = set()
    ordered: List[str] = []
    for val in values:
        if val not in seen:
            seen.add(val)
            ordered.append(val)
    return ordered


def normalize_seed_list(values: Iterable[Any]) -> List[str]:
    normalized = []
    for raw in values or []:
        token = normalize_seed_id(raw)
        if token:
            normalized.append(token)
    return dedupe_preserve_order(normalized)


def normalize_genre_list(values: Iterable[Any]) -> List[str]:
    genres: List[str] = []
    for raw in values or []:
        if not isinstance(raw, str):
            continue
        token = raw.strip().lower()
        if not token:
            continue
        genres.append(token)
    return dedupe_preserve_order(genres)


def filter_existing_tracks(sp: spotipy.Spotify, track_ids: List[str]) -> List[str]:
    if not track_ids:
        return []
    try:
        resp = sp.tracks(track_ids) or {}
    except SpotifyException:
        return track_ids
    valid = {(track or {}).get("id") for track in (resp.get("tracks") or []) if (track or {}).get("id")}
    return [tid for tid in track_ids if tid in valid]


def filter_existing_artists(sp: spotipy.Spotify, artist_ids: List[str]) -> List[str]:
    if not artist_ids:
        return []
    try:
        resp = sp.artists(artist_ids) or {}
    except SpotifyException:
        return artist_ids
    valid = {(artist or {}).get("id") for artist in (resp.get("artists") or []) if (artist or {}).get("id")}
    return [aid for aid in artist_ids if aid in valid]

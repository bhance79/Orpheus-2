import json
import os
import re
from typing import Any, Dict, List, Optional

import requests
from flask import Blueprint, Response, jsonify, request, session, stream_with_context
from spotipy.exceptions import SpotifyException

from spotify_client import get_sp, paginate

usbpod_bp = Blueprint("usbpod", __name__)


# ---------- USB Pod helpers ----------
def sanitize_filename(s: str) -> str:
    """Strip characters that are illegal in Windows/macOS/Linux filenames."""
    return re.sub(r'[<>:"/\\|?*\x00-\x1f]', '', s or '').strip()


def track_output_path(folder: str, artist: str, title: str) -> str:
    name = f"{sanitize_filename(artist)} - {sanitize_filename(title)}.mp3"
    return os.path.join(folder, name)


def yt_search_entries(query: str, max_results: int = 5) -> List[Dict[str, Any]]:
    import yt_dlp
    opts: Dict[str, Any] = {'extract_flat': True, 'quiet': True, 'no_warnings': True}
    with yt_dlp.YoutubeDL(opts) as ydl:
        res = ydl.extract_info(f'ytsearch{max_results}:{query}', download=False) or {}
    return res.get('entries') or []


def find_extended_url(artist: str, title: str) -> Optional[str]:
    """Search YouTube for an extended/remix version; return URL if found, else None."""
    entries = yt_search_entries(f'{artist} {title} extended')
    for e in entries or []:
        if e and 'extended' in (e.get('title') or '').lower():
            return f"https://www.youtube.com/watch?v={e['id']}"
    return None


def download_to_mp3(url_or_query: str, out_path: str) -> None:
    import yt_dlp
    opts: Dict[str, Any] = {
        'format': 'bestaudio/best',
        'outtmpl': out_path.replace('.mp3', '.%(ext)s'),
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '320'}],
        'quiet': True,
        'no_warnings': True,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        ydl.download([url_or_query])


def embed_track_metadata(path: str, title: str, artist: str, cover_url: Optional[str]) -> None:
    """Embed ID3 title, artist and cover art into the downloaded MP3 (best-effort)."""
    try:
        from mutagen.mp3 import MP3
        from mutagen.id3 import ID3, TIT2, TPE1, APIC
        audio = MP3(path, ID3=ID3)
        try:
            audio.add_tags()
        except Exception:
            pass
        audio.tags['TIT2'] = TIT2(encoding=3, text=title)
        audio.tags['TPE1'] = TPE1(encoding=3, text=artist)
        if cover_url:
            img_data = requests.get(cover_url, timeout=10).content
            audio.tags['APIC'] = APIC(encoding=3, mime='image/jpeg', type=3, desc='Cover', data=img_data)
        audio.save()
    except Exception:
        pass


# ---------- Routes ----------
@usbpod_bp.route('/api/usbpod/browse-folder', methods=['GET'])
def api_usbpod_browse_folder():
    if 'token_info' not in session:
        return jsonify({'ok': False, 'error': 'not_authenticated'}), 401
    try:
        import tkinter as tk
        from tkinter import filedialog as tk_filedialog
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        root.update()
        folder = tk_filedialog.askdirectory(parent=root, title='Select output folder')
        root.destroy()
        return jsonify({'ok': True, 'path': folder or None})
    except Exception as e:
        return jsonify({'ok': False, 'error': str(e)}), 500


@usbpod_bp.route('/api/usbpod/download', methods=['POST'])
def api_usbpod_download():
    if 'token_info' not in session:
        return jsonify({'ok': False, 'error': 'not_authenticated'}), 401
    try:
        sp = get_sp()
    except RuntimeError as err:
        return jsonify({'ok': False, 'error': str(err)}), 401

    data = request.json or {}
    playlist_id = (data.get('playlist_id') or '').strip()
    output_folder = (data.get('output_folder') or '').strip()
    dj_mode = bool(data.get('dj_mode', False))

    if not playlist_id or not output_folder:
        return jsonify({'ok': False, 'error': 'playlist_id and output_folder are required'}), 400
    if not os.path.isdir(output_folder):
        return jsonify({'ok': False, 'error': f'Output folder does not exist: {output_folder}'}), 400

    try:
        items = list(paginate(lambda o, l: sp.playlist_items(playlist_id, limit=l, offset=o)))
    except Exception as e:
        return jsonify({'ok': False, 'error': f'Failed to fetch playlist tracks: {e}'}), 500

    tracks: List[Dict[str, Any]] = []
    for it in items:
        tr = (it or {}).get('track') or {}
        if not tr or not tr.get('id'):
            continue
        album = tr.get('album') or {}
        images = album.get('images') or []
        tracks.append({
            'name': tr.get('name') or '',
            'artists': ', '.join(a.get('name', '') for a in (tr.get('artists') or [])),
            'cover': images[0].get('url') if images else None,
        })

    def generate():
        yield f"data: {json.dumps({'type': 'total', 'total': len(tracks)})}\n\n"
        for i, track in enumerate(tracks):
            name = track['name']
            artist = track['artists']
            cover = track['cover']
            out_path = track_output_path(output_folder, artist, name)

            if os.path.exists(out_path):
                yield f"data: {json.dumps({'type': 'skip', 'index': i, 'name': name, 'artist': artist})}\n\n"
                continue

            try:
                mode_used = 'normal'
                download_url: Optional[str] = None
                if dj_mode:
                    download_url = find_extended_url(artist, name)
                    if download_url:
                        mode_used = 'extended'

                if not download_url:
                    download_url = f'ytsearch1:{artist} {name}'

                download_to_mp3(download_url, out_path)
                embed_track_metadata(out_path, name, artist, cover)
                yield f"data: {json.dumps({'type': 'done', 'index': i, 'name': name, 'artist': artist, 'mode': mode_used})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'index': i, 'name': name, 'artist': artist, 'error': str(e)})}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={'X-Accel-Buffering': 'no', 'Cache-Control': 'no-cache'},
    )

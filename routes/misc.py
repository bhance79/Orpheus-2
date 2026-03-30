import base64

import requests
from flask import Blueprint, current_app, jsonify, send_from_directory

from utils import getenv_stripped
from spotify_client import DOTENV_PATH

misc_bp = Blueprint("misc", __name__)


@misc_bp.route("/")
def index():
    return current_app.send_static_file("index.html")


@misc_bp.route("/diag")
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


@misc_bp.route("/test-client")
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


@misc_bp.route("/favicon.ico")
def favicon():
    return ('', 204)


@misc_bp.route('/static/<path:path>')
def send_static(path):
    return send_from_directory('static', path)


@misc_bp.route('/<path:path>')
def catch_all(path):
    if path.startswith('api/') or path in ['login', 'callback', 'logout', 'filter-sweep']:
        return ('Not found', 404)
    try:
        return current_app.send_static_file(path)
    except Exception:
        return current_app.send_static_file("index.html")

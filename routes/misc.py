from flask import Blueprint, current_app, jsonify, send_from_directory

misc_bp = Blueprint("misc", __name__)


@misc_bp.route("/")
def index():
    return current_app.send_static_file("index.html")


@misc_bp.route("/favicon.ico")
def favicon():
    return send_from_directory('static/icons', 'orpheus-logo-icon.png', mimetype='image/png')


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

import logging
import os
from pathlib import Path

from flask import Flask
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"), override=False)

from routes.auth import auth_bp
from routes.playlists import playlists_bp
from routes.stats import stats_bp
from routes.recommendations import recommendations_bp
from routes.misc import misc_bp
from utils import getenv_stripped

app = Flask(__name__, static_folder='static/dist', static_url_path='')
app.secret_key = getenv_stripped("FLASK_SECRET_KEY") or "dev-key-change-me"

_is_production = os.environ.get("FLASK_ENV") == "production"
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=_is_production,  # HTTPS only in production
)

app.register_blueprint(auth_bp)
app.register_blueprint(playlists_bp)
app.register_blueprint(stats_bp)
app.register_blueprint(recommendations_bp)
app.register_blueprint(misc_bp)

if not app.debug:
    logging.basicConfig(level=logging.INFO)
    app.logger.setLevel(logging.INFO)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)

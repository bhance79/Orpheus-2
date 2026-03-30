from flask import Blueprint, redirect, request, session, url_for

from spotify_client import get_sp, sp_oauth, vite_running

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/login")
def login():
    try:
        oauth = sp_oauth()
        return redirect(oauth.get_authorize_url())
    except Exception as e:
        return f"OAuth setup error: {e}", 500


@auth_bp.route("/callback")
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

    try:
        sp = get_sp()
        user = sp.current_user()
        session["user_name"] = user.get("display_name", "User")
        images = user.get("images", [])
        session["user_image"] = images[0]["url"] if images else None
    except Exception:
        pass

    if vite_running():
        return redirect("http://127.0.0.1:5173/")
    else:
        return redirect(url_for("misc.index"))


@auth_bp.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("misc.index"))

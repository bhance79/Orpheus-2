from spotipy import Spotify
from spotipy.oauth2 import SpotifyOAuth
from dotenv import load_dotenv

# Load credentials from .env
load_dotenv()

sp = Spotify(
    auth_manager=SpotifyOAuth(
        scope="playlist-read-private playlist-read-collaborative",
        cache_path=".spotipy_cache",
        open_browser=True
    )
)

# Fetch and display user playlists
def show_playlists():
    playlists = sp.current_user_playlists()
    print("\nYour Playlists:")
    print("-------------------")

    for idx, playlist in enumerate(playlists['items'], start=1):
        print(f"{idx}. {playlist['name']} ({playlist['tracks']['total']} tracks)")

    print("\nPick a playlist number to view details:")
    choice = int(input("Enter number: ")) - 1
    selected = playlists['items'][choice]

    print(f"\nYou chose: {selected['name']}")
    print(f"Playlist ID: {selected['id']}")
    print(f"Total tracks: {selected['tracks']['total']}")
    print(f"URL: {selected['external_urls']['spotify']}")

if __name__ == "__main__":
    show_playlists()

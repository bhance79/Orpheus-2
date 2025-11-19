import { useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import LoadingOverlay from '../components/LoadingOverlay'

function ViewTracks() {
  const { ownedPlaylists, loading: playlistsLoading } = usePlaylists()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [playlistData, setPlaylistData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const msToMinSec = (ms) => {
    if (ms == null) return ''
    const total = Math.round(ms / 1000)
    const m = Math.floor(total / 60)
    const s = String(total % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const handleLoadTracks = async (e) => {
    e.preventDefault()

    if (!selectedPlaylistId) {
      setError('Please select a playlist')
      return
    }

    setLoading(true)
    setError(null)
    setPlaylistData(null)

    try {
      const res = await fetch(`/api/playlist/${encodeURIComponent(selectedPlaylistId)}`)
      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Failed to load tracks')
        return
      }

      setPlaylistData(data)
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h2 className="text-xl font-bold mb-4">View Playlist Tracks</h2>

      {/* Playlist Selection Form */}
      <form onSubmit={handleLoadTracks} className="mb-6">
        <label htmlFor="playlist_id" className="block mb-2 text-sm font-medium">
          Select a playlist:
        </label>
        <div className="flex gap-3">
          <select
            name="playlist_id"
            id="playlist_id"
            value={selectedPlaylistId}
            onChange={(e) => setSelectedPlaylistId(e.target.value)}
            className="flex-1"
            disabled={playlistsLoading}
            required
          >
            <option value="">-- Choose a playlist --</option>
            <option value="__recent__">Recently Played</option>
            {ownedPlaylists.map(playlist => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
          <button type="submit" className="btn">
            Load Tracks
          </button>
        </div>
      </form>

      {error && (
        <div className="flash mb-6">
          <div className="flash-item">{error}</div>
        </div>
      )}

      {/* Track Results */}
      {playlistData && (
        <div className="card">
          <div className="flex items-start justify-between mb-6 gap-4">
            <div className="flex items-center gap-4">
              {playlistData.playlist.image && (
                <img
                  src={playlistData.playlist.image}
                  alt={`${playlistData.playlist.name} cover`}
                  className="w-32 h-32 rounded-lg object-cover shadow-lg"
                />
              )}
              <div>
                <h3 className="text-2xl font-bold">{playlistData.playlist.name}</h3>
                <p className="text-text-secondary">by {playlistData.playlist.owner}</p>
                <p className="text-sm text-text-muted mt-1">
                  {playlistData.playlist.total} tracks
                </p>
              </div>
            </div>
            {playlistData.playlist.url && (
              <a
                href={playlistData.playlist.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                Open in Spotify
              </a>
            )}
          </div>

          <div className="table-wrap">
            <table className="tracks">
              <thead>
                <tr>
                  <th>Track</th>
                  <th>Artist(s)</th>
                  <th>Album</th>
                  <th>Added</th>
                  <th>⏱</th>
                </tr>
              </thead>
              <tbody>
                {playlistData.tracks.map((track, index) => (
                  <tr key={index}>
                    <td>
                      {track.url ? (
                        <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                          {track.name}
                        </a>
                      ) : (
                        track.name
                      )}
                    </td>
                    <td>{track.artists || ''}</td>
                    <td>{track.album || ''}</td>
                    <td>{track.added_at ? new Date(track.added_at).toLocaleDateString() : ''}</td>
                    <td>{msToMinSec(track.duration_ms)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <LoadingOverlay message="Loading tracks..." />}
    </div>
  )
}

export default ViewTracks
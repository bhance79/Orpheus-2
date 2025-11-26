import { useState, useMemo } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import PlaylistTracksModal from '../components/PlaylistTracksModal'

function ViewPlaylists() {
  const { ownedPlaylists, loading: playlistsLoading } = usePlaylists()
  const [searchQuery, setSearchQuery] = useState('')
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [playlistData, setPlaylistData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Filter playlists based on search query
  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return ownedPlaylists
    const query = searchQuery.toLowerCase()
    return ownedPlaylists.filter(playlist =>
      playlist.name.toLowerCase().includes(query)
    )
  }, [ownedPlaylists, searchQuery])

  const msToMinSec = (ms) => {
    if (ms == null) return ''
    const total = Math.round(ms / 1000)
    const m = Math.floor(total / 60)
    const s = String(total % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  const handlePlaylistClick = async (playlist) => {
    if (!playlist) return

    setActivePlaylist(playlist)
    setLoading(true)
    setError(null)
    setPlaylistData(null)

    try {
      const res = await fetch(`/api/playlist/${encodeURIComponent(playlist.id)}`)
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

  const handleModalClose = () => {
    setActivePlaylist(null)
    setPlaylistData(null)
    setError(null)
    setLoading(false)
  }

  const modalPlaylistDetails = playlistData?.playlist ?? (activePlaylist
    ? {
        id: activePlaylist.id,
        name: activePlaylist.name,
        owner: activePlaylist.owner?.display_name || activePlaylist.owner?.id || 'Unknown',
        total: activePlaylist.tracks?.total ?? activePlaylist.trackCount ?? 0,
        image: activePlaylist.images?.[0]?.url,
        url: activePlaylist.external_urls?.spotify
      }
    : null
  )

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card dashboard-card--view-playlists">
        <h2 className="text-xl font-bold mb-4">View Playlists</h2>

        {/* Search Bar with Glassmorphism */}
        <div className="mb-6">
          <label htmlFor="search" className="block mb-2 text-sm font-medium">
            Search playlists:
          </label>
          <input
            type="text"
            id="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Type to filter playlists..."
            className="w-full px-4 py-2 rounded-lg"
            style={{
              color: '#ffffff',
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            disabled={playlistsLoading}
          />
        </div>

        <div className="playlist-grid-scroll">
          {/* Playlist Grid */}
          {playlistsLoading ? (
            <p className="text-text-secondary">Loading playlists...</p>
          ) : filteredPlaylists.length === 0 ? (
            <p className="text-text-secondary">
              {searchQuery ? `No playlists found matching "${searchQuery}"` : 'No playlists available'}
            </p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
              {filteredPlaylists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="playlist-card group"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: '16px',
                    padding: '16px',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease',
                    cursor: 'pointer',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.4)'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
                  }}
                >
                  <div
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      marginBottom: '12px',
                      background: '#2a2a2a'
                    }}
                  >
                    {playlist.images?.[0]?.url ? (
                      <img
                        src={playlist.images[0].url}
                        alt={playlist.name}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                          color: 'rgba(255, 255, 255, 0.4)'
                        }}
                      >
                        playlist cover
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#ffffff',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical'
                    }}
                  >
                    {playlist.name}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      <PlaylistTracksModal
        isOpen={Boolean(activePlaylist)}
        playlist={modalPlaylistDetails}
        tracks={playlistData?.tracks ?? []}
        loading={loading}
        error={error}
        onClose={handleModalClose}
        formatDuration={msToMinSec}
      />
    </div>
  )
}

export default ViewPlaylists

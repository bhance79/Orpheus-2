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
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'

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
      // For playlists with more than 100 tracks, load in batches for better UX
      const INITIAL_BATCH = 100

      // Load first batch quickly
      const initialRes = await fetch(`/api/playlist/${encodeURIComponent(playlist.id)}?limit=${INITIAL_BATCH}&offset=0`)
      const initialData = await initialRes.json()

      if (!initialData.ok) {
        setError(initialData.error || 'Failed to load tracks')
        setLoading(false)
        return
      }

      // Show initial batch immediately
      setPlaylistData(initialData)
      setLoading(false)

      // If there are more tracks, load them in the background
      if (initialData.has_more) {
        const totalTracks = initialData.playlist.total
        let allTracks = [...initialData.tracks]

        // Load remaining tracks in batches
        for (let offset = INITIAL_BATCH; offset < totalTracks; offset += 100) {
          const res = await fetch(`/api/playlist/${encodeURIComponent(playlist.id)}?limit=100&offset=${offset}`)
          const data = await res.json()

          if (data.ok) {
            allTracks = [...allTracks, ...data.tracks]
            // Update the displayed data with accumulated tracks
            setPlaylistData(prev => ({
              ...prev,
              tracks: allTracks,
              has_more: data.has_more
            }))
          }
        }
      }
    } catch (err) {
      setError(String(err))
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
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Manage Playlists</h2>

          {/* View Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
              title="Grid view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-accent text-white'
                  : 'bg-white/5 text-text-secondary hover:bg-white/10'
              }`}
              title="List view"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar with Glassmorphism */}
        <div className="mb-6">
          <label htmlFor="search" className="block mb-2 text-sm font-medium">
            Search playlists to view tracks, remove duplicates, or delete:
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
          {playlistsLoading ? (
            <p className="text-text-secondary">Loading playlists...</p>
          ) : filteredPlaylists.length === 0 ? (
            <p className="text-text-secondary">
              {searchQuery ? `No playlists found matching "${searchQuery}"` : 'No playlists available'}
            </p>
          ) : viewMode === 'grid' ? (
            /* Grid View */
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
          ) : (
            /* List View */
            <div className="space-y-2">
              {filteredPlaylists.map(playlist => (
                <button
                  key={playlist.id}
                  onClick={() => handlePlaylistClick(playlist)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-all"
                  style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    textAlign: 'left'
                  }}
                >
                  {/* Playlist Cover */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      flexShrink: 0,
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
                          fontSize: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.2em',
                          color: 'rgba(255, 255, 255, 0.4)'
                        }}
                      >
                        cover
                      </div>
                    )}
                  </div>

                  {/* Playlist Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">
                      {playlist.name}
                    </div>
                    <div className="text-sm text-text-secondary truncate">
                      {playlist.owner?.display_name || 'Unknown'} • {playlist.tracks?.total || 0} tracks
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-text-secondary"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
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
        hasMore={playlistData?.has_more ?? false}
      />
    </div>
  )
}

export default ViewPlaylists

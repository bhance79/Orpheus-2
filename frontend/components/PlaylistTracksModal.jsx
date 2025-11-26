import { useMemo, useState } from 'react'

const SORT_OPTIONS = [
  { value: 'custom', label: 'Custom order' },
  { value: 'recent', label: 'Recently added' },
  { value: 'track_asc', label: 'Track A-Z' },
  { value: 'track_desc', label: 'Track Z-A' },
  { value: 'artist', label: 'Artist' },
  { value: 'album', label: 'Album' }
]

const compareStrings = (a = '', b = '') => a.localeCompare(b, undefined, { sensitivity: 'base' })

const getDateValue = (value) => {
  if (!value) return 0
  const time = Date.parse(value)
  return Number.isNaN(time) ? 0 : time
}

function PlaylistTracksModal({ isOpen, playlist, tracks, loading, error, onClose, formatDuration }) {
  if (!isOpen || !playlist) return null

  const [sortOption, setSortOption] = useState('custom')

  const sortedTracks = useMemo(() => {
    if (!Array.isArray(tracks)) return []
    if (sortOption === 'custom') {
      return tracks
    }
    const working = [...tracks]
    switch (sortOption) {
      case 'recent':
        return working.sort((a, b) => getDateValue(b?.added_at) - getDateValue(a?.added_at))
      case 'track_asc':
        return working.sort((a, b) => compareStrings(a?.name, b?.name))
      case 'track_desc':
        return working.sort((a, b) => compareStrings(b?.name, a?.name))
      case 'artist':
        return working.sort((a, b) => compareStrings(a?.artists, b?.artists))
      case 'album':
        return working.sort((a, b) => compareStrings(a?.album, b?.album))
      default:
        return tracks
    }
  }, [tracks, sortOption])

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const totalTracks = playlist.total ?? tracks?.length ?? 0

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel modal-panel--wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-4">
            {playlist.image ? (
              <img src={playlist.image} alt={`${playlist.name} cover`} className="w-20 h-20 rounded-xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-xl bg-white/10 flex items-center justify-center uppercase tracking-[0.2em] text-xs text-white/40">
                cover
              </div>
            )}
            <div>
              <h3 className="modal-title mb-1">{playlist.name}</h3>
              <p className="text-sm text-text-secondary">by {playlist.owner || 'Unknown'}</p>
              <p className="text-xs text-text-muted mt-1">{totalTracks} tracks</p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close playlist tracks">
            ×
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm text-text-secondary">Sort by:</span>
            <select
              className="genre-dropdown"
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              {SORT_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          {playlist.url && (
            <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
              Open in Spotify
            </a>
          )}
        </div>

        <div className="modal-content modal-content--tracks">
          {loading ? (
            <div className="p-6 text-center text-sm text-text-secondary">Loading tracks...</div>
          ) : error ? (
            <div className="p-6 text-center text-red-300">{error}</div>
          ) : sortedTracks.length === 0 ? (
            <div className="p-6 text-center text-text-secondary">No tracks available for this playlist.</div>
          ) : (
            <div className="table-wrap tracks-modal-table">
              <table className="tracks">
                <thead>
                  <tr>
                    <th>Track</th>
                    <th>Artist(s)</th>
                    <th>Album</th>
                    <th>Added</th>
                    <th>Length</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTracks.map((track, index) => (
                    <tr key={`${track.id}-${index}`}>
                      <td>
                        <div className="flex items-center gap-3">
                          {track.cover ? (
                            <img
                              src={track.cover}
                              alt={`${track.name} cover`}
                              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-white/10 text-[10px] uppercase tracking-[0.2em] text-white/40 flex items-center justify-center flex-shrink-0">
                              cover
                            </div>
                          )}
                          <div>
                            {track.url ? (
                              <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
                                {track.name}
                              </a>
                            ) : (
                              track.name
                            )}
                          </div>
                        </div>
                      </td>
                      <td>{track.artists || ''}</td>
                      <td>{track.album || ''}</td>
                      <td>{track.added_at ? new Date(track.added_at).toLocaleDateString() : ''}</td>
                      <td>{formatDuration ? formatDuration(track.duration_ms) : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlaylistTracksModal

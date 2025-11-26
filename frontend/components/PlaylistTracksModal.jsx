import { useEffect, useMemo, useState } from 'react'

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

function PlaylistTracksModal({ isOpen, playlist, tracks, loading, error, onClose, formatDuration, hasMore = false }) {
  const [sortOption, setSortOption] = useState('custom')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const [duplicateCheckLoading, setDuplicateCheckLoading] = useState(false)
  const [duplicateRemoveLoading, setDuplicateRemoveLoading] = useState(false)
  const [duplicateError, setDuplicateError] = useState(null)
  const [duplicateResult, setDuplicateResult] = useState(null)
  const [duplicateMessage, setDuplicateMessage] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setShowDeleteConfirm(false)
      setDeleteError(null)
      setDuplicateError(null)
      setDuplicateResult(null)
      setDuplicateMessage(null)
      setDuplicateCheckLoading(false)
      setDuplicateRemoveLoading(false)
    }
  }, [isOpen])

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

  const handleDeletePlaylist = async () => {
    if (!playlist?.id) return

    setDeleteLoading(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/playlist/${encodeURIComponent(playlist.id)}`, {
        method: 'DELETE'
      })
      const data = await res.json()

      if (!data.ok) {
        setDeleteError(data.error || 'Failed to delete playlist')
        return
      }

      // Close modal and refresh the page to update the playlist list
      onClose()
      window.location.reload()
    } catch (err) {
      setDeleteError(String(err))
    } finally {
      setDeleteLoading(false)
    }
  }

  const handleRemoveDuplicates = async () => {
    if (!playlist?.id) return

    setDuplicateError(null)
    setDuplicateRemoveLoading(true)
    setDuplicateMessage(null)

    try {
      const res = await fetch(`/api/remove-duplicates/${encodeURIComponent(playlist.id)}`, {
        method: 'POST'
      })
      const data = await res.json()

      if (!data.ok) {
        setDuplicateError(data.error || 'Failed to remove duplicates')
        return
      }

      setDuplicateResult(null)
      setDuplicateMessage(`Removed ${data.removed_count || 0} duplicate track(s) from "${data.playlist_name || playlist.name}".`)
    } catch (err) {
      setDuplicateError(String(err))
    } finally {
      setDuplicateRemoveLoading(false)
    }
  }

  const handleCheckDuplicates = async () => {
    if (!playlist?.id) return

    setDuplicateError(null)
    setDuplicateCheckLoading(true)
    setDuplicateMessage(null)
    setDuplicateResult(null)

    try {
      const res = await fetch(`/api/check-duplicates/${encodeURIComponent(playlist.id)}`)
      const data = await res.json()

      if (!data.ok) {
        setDuplicateError(data.error || 'Failed to check duplicates')
        return
      }

      if (!data.has_duplicates) {
        setDuplicateResult({ has_duplicates: false })
        return
      }

      setDuplicateResult(data)
    } catch (err) {
      setDuplicateError(String(err))
    } finally {
      setDuplicateCheckLoading(false)
    }
  }

  const duplicateBusy = duplicateCheckLoading || duplicateRemoveLoading

  const totalTracks = playlist?.total ?? tracks?.length ?? 0

  if (!isOpen || !playlist) return null

  return (
    <>
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
              <p className="text-xs text-text-muted mt-1">
                {totalTracks} tracks
                {hasMore && (
                  <span className="ml-2 text-yellow-400/80">
                    (Loading {tracks?.length || 0} of {totalTracks}...)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close playlist tracks">
            ×
          </button>
        </div>

        <div className="px-6 py-4 border-b border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
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
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCheckDuplicates}
                className="btn btn-secondary"
                disabled={loading || deleteLoading || duplicateBusy}
              >
                {duplicateBusy ? 'Checking...' : 'Check duplicates'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="btn btn-secondary text-red-400 hover:bg-red-900/20 hover:border-red-700"
                disabled={loading || deleteLoading}
              >
                Delete Playlist
              </button>
              {playlist.url && (
                <a href={playlist.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary">
                  Open in Spotify
                </a>
              )}
            </div>
          </div>

          {deleteError && (
            <div className="px-4 py-2 rounded-lg bg-red-900/20 border border-red-700 text-red-200 text-sm">
              {deleteError}
            </div>
          )}
        </div>

        {duplicateError && (
          <div className="px-6 pb-4">
            <div className="px-4 py-2 rounded-lg bg-red-900/20 border border-red-700 text-red-200 text-sm">
              {duplicateError}
            </div>
          </div>
        )}

        {duplicateMessage && (
          <div className="px-6 pb-4">
            <div className="px-4 py-2 rounded-lg bg-green-900/20 border border-green-700 text-green-200 text-sm">
              {duplicateMessage}
            </div>
          </div>
        )}

        {duplicateResult && (
          <div className="px-6 pb-4">
            <div
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-lg p-4 text-sm text-white/90"
              style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.35)' }}
            >
              {!duplicateResult.has_duplicates ? (
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-semibold text-green-300">No duplicates found</p>
                    <p className="text-text-secondary">This playlist is already clean.</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setDuplicateResult(null)}
                  >
                    Dismiss
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold text-yellow-300">Duplicates found</p>
                      <p className="text-text-secondary">
                        {duplicateResult.duplicate_count} duplicate track{duplicateResult.duplicate_count === 1 ? '' : 's'} detected in this playlist.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDuplicateResult(null)}
                      disabled={duplicateBusy}
                    >
                      Dismiss
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-auto pr-1">
                    {(duplicateResult.duplicates || []).map((dup, idx) => (
                      <div
                        key={`${dup.track_name || 'dup'}-${idx}`}
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
                      >
                        <div className="font-medium">{dup.track_name || 'Unknown track'}</div>
                        <div className="text-xs text-text-secondary">{dup.artists || 'Unknown artist'}</div>
                        <div className="text-xs text-yellow-300 mt-1">
                          Found {dup.total_occurrences} times • {dup.duplicates_to_remove} to remove
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="btn btn-accent"
                      onClick={handleRemoveDuplicates}
                      disabled={duplicateBusy}
                    >
                      {duplicateRemoveLoading ? 'Removing...' : 'Remove duplicates'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setDuplicateResult(null)}
                      disabled={duplicateBusy}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

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

      {/* Delete Confirmation Modal - rendered as sibling to avoid z-index stacking issues */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="rounded-2xl p-6 max-w-md mx-4 border border-red-500/30 bg-surface-elevated backdrop-blur-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ boxShadow: '0 25px 80px rgba(239, 68, 68, 0.35), 0 10px 40px rgba(0,0,0,0.6)' }}
          >
            <h3 className="text-2xl font-bold text-white mb-3">Delete Playlist?</h3>
            <p className="text-text-secondary mb-6">
              Are you sure you want to delete "<strong className="text-white">{playlist.name}</strong>"?
              This action cannot be undone and will permanently remove this playlist from your Spotify account.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-secondary"
                disabled={deleteLoading}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteConfirm(false)
                  handleDeletePlaylist()
                }}
                className="btn bg-red-600 hover:bg-red-700 text-white"
                disabled={deleteLoading}
              >
                {deleteLoading ? 'Deleting...' : 'Delete Playlist'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default PlaylistTracksModal

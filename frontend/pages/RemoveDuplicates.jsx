import { useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import LoadingOverlay from '../components/LoadingOverlay'

function RemoveDuplicates() {
  const { ownedPlaylists, loading: playlistsLoading } = usePlaylists()
  const [selectedPlaylistId, setSelectedPlaylistId] = useState('')
  const [duplicateData, setDuplicateData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState('')
  const [message, setMessage] = useState(null)

  const handleCheckDuplicates = async () => {
    if (!selectedPlaylistId) {
      setMessage({ type: 'error', text: 'Please select a playlist first.' })
      return
    }

    setLoading(true)
    setLoadingMessage('Checking for duplicates...')
    setMessage(null)
    setDuplicateData(null)

    try {
      const res = await fetch(`/api/check-duplicates/${encodeURIComponent(selectedPlaylistId)}`)
      const data = await res.json()

      if (!data.ok) {
        if (data.error === 'playlist_not_owned') {
          setMessage({ type: 'error', text: 'You do not own this playlist!' })
        } else {
          setMessage({ type: 'error', text: `Check failed: ${data.error || 'Unknown error'}` })
        }
        return
      }

      setDuplicateData(data)
    } catch (err) {
      setMessage({ type: 'error', text: `Check failed: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveDuplicates = async () => {
    if (!selectedPlaylistId) return

    setLoading(true)
    setLoadingMessage('Removing duplicates...')

    try {
      const res = await fetch(`/api/remove-duplicates/${encodeURIComponent(selectedPlaylistId)}`, {
        method: 'POST'
      })
      const data = await res.json()

      if (!data.ok) {
        setMessage({ type: 'error', text: `Remove failed: ${data.error || 'Unknown error'}` })
      } else {
        setMessage({
          type: 'success',
          text: `Successfully removed ${data.removed_count || 0} duplicate track(s) from "${data.playlist_name}".`
        })
        setDuplicateData(null)
        setSelectedPlaylistId('')
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Remove failed: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card">
        <h2 className="text-xl font-bold mb-2">Remove Duplicate Tracks</h2>
        <p className="text-text-secondary mb-4">
          Check your playlists for duplicate tracks and remove them. Only playlists you own can be modified.
        </p>

        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'error'
              ? 'bg-red-900/20 border-red-700 text-red-200'
              : 'bg-green-900/20 border-green-700 text-green-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Step 1: Select Playlist */}
        <div className="mb-6">
          <label htmlFor="duplicate_playlist_id" className="block mb-2 text-sm font-medium">
            Select a playlist to check:
          </label>
          <div className="flex gap-3">
            <select
              id="duplicate_playlist_id"
              value={selectedPlaylistId}
              onChange={(e) => setSelectedPlaylistId(e.target.value)}
              className="flex-1"
              disabled={playlistsLoading}
            >
              <option value="">-- Choose a playlist --</option>
              {ownedPlaylists.map(playlist => (
                <option key={playlist.id} value={playlist.id}>
                  {playlist.name}
                </option>
              ))}
            </select>
            <button type="button" onClick={handleCheckDuplicates} className="btn">
              Check for Duplicates
            </button>
          </div>
        </div>

        {/* Step 2: Show Results */}
        {duplicateData && !duplicateData.has_duplicates && (
          <div>
            <div className="flex items-center gap-3">
              <div className="text-4xl">✓</div>
              <div>
                <h3 className="text-lg font-semibold text-green-400">No Duplicates Found!</h3>
                <p className="text-text-secondary">This playlist is clean - no duplicate tracks detected.</p>
              </div>
            </div>
          </div>
        )}

        {duplicateData && duplicateData.has_duplicates && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-yellow-400">Duplicates Found</h3>
                <p className="text-text-secondary">
                  Found <strong>{duplicateData.duplicate_count}</strong> duplicate track(s) in this playlist.
                </p>
              </div>
            </div>

            {/* Duplicate tracks list */}
            <div className="space-y-2 mb-4">
              {duplicateData.duplicates.map((dup, index) => (
                <div key={index} className="p-3 bg-bg-elevated rounded">
                  <div className="font-medium">{dup.track_name}</div>
                  <div className="text-sm text-gray-400">{dup.artists}</div>
                  <div className="text-sm text-yellow-400 mt-1">
                    Found {dup.total_occurrences} times ({dup.duplicates_to_remove} duplicate
                    {dup.duplicates_to_remove > 1 ? 's' : ''} will be removed)
                  </div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 border-t border-border pt-4">
              <button type="button" onClick={handleRemoveDuplicates} className="btn btn-accent">
                Remove All Duplicates
              </button>
              <button
                type="button"
                onClick={() => {
                  setDuplicateData(null)
                  setSelectedPlaylistId('')
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <LoadingOverlay message={loadingMessage} />}
      </section>
    </div>
  )
}

export default RemoveDuplicates
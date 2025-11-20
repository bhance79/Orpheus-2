import { useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import LoadingOverlay from '../components/LoadingOverlay'

function FilterSweep() {
  const { playlists, ownedPlaylists, loading: playlistsLoading } = usePlaylists()
  const [playlistA, setPlaylistA] = useState('')
  const [playlistBList, setPlaylistBList] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)

  const handlePlaylistBToggle = (playlistId) => {
    setPlaylistBList(prev => {
      if (prev.includes(playlistId)) {
        return prev.filter(id => id !== playlistId)
      } else {
        return [...prev, playlistId]
      }
    })
  }

  const handleDeselectAll = () => {
    setPlaylistBList([])
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!playlistA || playlistBList.length === 0) {
      setMessage({
        type: 'error',
        text: 'Select Playlist A (owned) and at least one Playlist B (reference).'
      })
      return
    }

    if (playlistBList.includes(playlistA)) {
      setMessage({ type: 'error', text: 'Playlist A cannot also be in the reference list.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append('playlist_a_id', playlistA)
      playlistBList.forEach(id => {
        formData.append('playlist_b_id', id)
      })

      const res = await fetch('/filter-sweep', {
        method: 'POST',
        body: formData
      })

      // Flask will redirect or return a response
      if (res.redirected) {
        window.location.href = res.url
      } else {
        const text = await res.text()
        // Parse any flash messages from the response
        setMessage({
          type: 'success',
          text: 'Filter Sweep completed! Check the results.'
        })
      }
    } catch (err) {
      setMessage({ type: 'error', text: `Filter Sweep failed: ${String(err)}` })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h2 className="text-xl font-bold mb-2">Filter Sweep</h2>
      <p className="text-text-secondary mb-4">
        Remove from <strong>playlist A</strong> (must be owned by you) any tracks that also appear in one or more{' '}
        <strong>playlist B</strong> selections.
      </p>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            message.type === 'error'
              ? 'bg-red-900/20 border-red-700 text-red-200'
              : 'bg-green-900/20 border-green-700 text-green-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="playlist_a_id" className="block mb-2 text-sm font-medium">
            Playlist A (Source):
          </label>
          <select
            name="playlist_a_id"
            id="playlist_a_id"
            value={playlistA}
            onChange={(e) => setPlaylistA(e.target.value)}
            className="w-full"
            disabled={playlistsLoading}
            required
          >
            <option value="">-- Choose a playlist --</option>
            {ownedPlaylists.map(playlist => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="playlist_b_id" className="text-sm font-medium">
              Playlist B (Reference — select one or more):
            </label>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium">
                {playlistBList.length} selected
              </span>
              <button type="button" onClick={handleDeselectAll} className="btn btn-secondary text-xs py-1 px-2">
                Deselect All
              </button>
            </div>
          </div>
          <select
            name="playlist_b_id"
            id="playlist_b_id"
            multiple
            size={10}
            className="w-full"
            value={playlistBList}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions, option => option.value)
              setPlaylistBList(selected)
            }}
            disabled={playlistsLoading}
            required
          >
            {playlists.map(playlist => (
              <option key={playlist.id} value={playlist.id}>
                {playlist.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-text-muted mt-1">Hold Ctrl/Cmd to select multiple playlists</p>
        </div>

        <button type="submit" className="btn btn-accent">
          Run Filter Sweep
        </button>
      </form>

      {loading && <LoadingOverlay message="Sweeping playlists..." />}
    </div>
  )
}

export default FilterSweep

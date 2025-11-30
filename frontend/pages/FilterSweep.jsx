import { useMemo, useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import LoadingOverlay from '../components/LoadingOverlay'

function FilterSweep() {
  const { playlists, ownedPlaylists, loading: playlistsLoading } = usePlaylists()
  const [playlistA, setPlaylistA] = useState('')
  const [playlistBList, setPlaylistBList] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState(null)
  const [playlistASearch, setPlaylistASearch] = useState('')
  const [playlistBSearch, setPlaylistBSearch] = useState('')

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

  const filteredOwnedPlaylists = useMemo(() => {
    const query = playlistASearch.trim().toLowerCase()
    if (!query) return ownedPlaylists
    return ownedPlaylists.filter(pl => pl.name?.toLowerCase().includes(query))
  }, [ownedPlaylists, playlistASearch])

  const filteredReferencePlaylists = useMemo(() => {
    const query = playlistBSearch.trim().toLowerCase()
    if (!query) return playlists
    return playlists.filter(pl => pl.name?.toLowerCase().includes(query))
  }, [playlists, playlistBSearch])

  const playlistNameById = useMemo(() => {
    const map = new Map()
    playlists.forEach(pl => map.set(pl.id, pl.name))
    ownedPlaylists.forEach(pl => map.set(pl.id, pl.name))
    return map
  }, [playlists, ownedPlaylists])

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card dashboard-card--filter-sweep">
        <p className="feature-label m-0">Filter Sweep</p>
        <h2 className="feature-title mt-1 mb-2">Remove from <strong>playlist A</strong> (must be owned by you) any tracks that also appear in one or more{' '}
          <strong>playlist B</strong> selections.</h2>

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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">Playlist A (Source)</label>
              {playlistA && (
                <span className="text-xs uppercase tracking-[0.3em] text-accent">
                  Selected
                </span>
              )}
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                value={playlistASearch}
                onChange={(e) => setPlaylistASearch(e.target.value)}
                placeholder="Search your owned playlists..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
                disabled={playlistsLoading}
              />
              <div className="absolute right-3 top-2.5 text-white/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
              </div>
            </div>
            {filteredOwnedPlaylists.length === 0 ? (
              <div className="text-sm text-text-secondary py-6 text-center border border-dashed border-white/10 rounded-xl">
                No owned playlists match "{playlistASearch}"
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 pr-1 snap-x snap-mandatory">
                {filteredOwnedPlaylists.map(playlist => {
                  const isSelected = playlistA === playlist.id
                  return (
                    <button
                      type="button"
                      key={playlist.id}
                      className={`min-w-[220px] flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all snap-center ${
                        isSelected
                          ? 'border-accent/70 bg-accent/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                      onClick={() => setPlaylistA(isSelected ? '' : playlist.id)}
                      disabled={playlistsLoading}
                    >
                      <div className="w-14 h-14 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        {playlist.images?.[0]?.url ? (
                          <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/40">
                            cover
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{playlist.name}</div>
                        <div className="text-xs text-text-secondary">
                          {(playlist.tracks?.total ?? 0)} tracks
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-xs font-semibold text-accent">✔</span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-white">
                Playlist B (Reference — select one or more)
              </label>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-white/10 text-white/80 rounded-full text-xs font-medium">
                  {playlistBList.length} selected
                </span>
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="btn btn-secondary text-xs py-1 px-2"
                  disabled={playlistBList.length === 0}
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                value={playlistBSearch}
                onChange={(e) => setPlaylistBSearch(e.target.value)}
                placeholder="Search playlists to reference..."
                className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
                disabled={playlistsLoading}
              />
              <div className="absolute right-3 top-2.5 text-white/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
                </svg>
              </div>
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredReferencePlaylists.length === 0 ? (
                <div className="text-sm text-text-secondary py-6 text-center border border-dashed border-white/10 rounded-xl">
                  No playlists found for "{playlistBSearch}"
                </div>
              ) : (
                filteredReferencePlaylists.map(playlist => {
                  const isSelected = playlistBList.includes(playlist.id)
                  return (
                    <label
                      key={playlist.id}
                      className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-accent/70 bg-accent/10'
                          : 'border-white/10 bg-white/5 hover:border-white/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => handlePlaylistBToggle(playlist.id)}
                        disabled={playlistsLoading}
                      />
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                        {playlist.images?.[0]?.url ? (
                          <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/40">
                            cover
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-white truncate">{playlist.name}</div>
                        <div className="text-xs text-text-secondary">
                          {(playlist.tracks?.total ?? 0)} tracks
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                          isSelected ? 'border-accent bg-accent/20 text-accent' : 'border-white/30 text-transparent'
                        }`}
                      >
                        ✓
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            {playlistBList.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {playlistBList.map(id => (
                  <span key={id} className="px-3 py-1 bg-white/10 rounded-full text-xs text-white/80">
                    {playlistNameById.get(id) || 'Playlist'}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4">
            <button type="submit" className="btn btn-accent w-full sm:w-auto">
              Run Filter Sweep
            </button>
          </div>
        </form>

        {loading && <LoadingOverlay message="Sweeping playlists..." />}
      </section>
    </div>
  )
}

export default FilterSweep

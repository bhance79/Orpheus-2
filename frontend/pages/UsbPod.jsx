import { useMemo, useState } from 'react'
import { usePlaylists } from '../hooks/usePlaylists'
import { useDownload } from '../context/DownloadContext'

function UsbPod() {
  const { playlists, loading: playlistsLoading } = usePlaylists()
  const { dlState, startDownload } = useDownload()

  const [selectedPlaylist, setSelectedPlaylist] = useState(null)
  const [search, setSearch] = useState('')
  const [outputFolder, setOutputFolder] = useState('')
  const [djMode, setDjMode] = useState(false)
  const [browsing, setBrowsing] = useState(false)
  const [browseError, setBrowseError] = useState(null)

  const isDownloading = dlState?.active === true

  const handleBrowse = async () => {
    setBrowsing(true)
    setBrowseError(null)
    try {
      const res = await fetch('/api/usbpod/browse-folder')
      const data = await res.json()
      if (data.ok && data.path) {
        setOutputFolder(data.path)
      } else if (!data.ok) {
        setBrowseError(data.error || 'Could not open folder picker')
      }
    } catch (err) {
      setBrowseError(err.message || 'Failed to open folder picker')
    } finally {
      setBrowsing(false)
    }
  }

  const filteredPlaylists = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return playlists
    return playlists.filter(pl => pl.name?.toLowerCase().includes(query))
  }, [playlists, search])

  const handleSelect = (playlist) => {
    setSelectedPlaylist(prev => (prev?.id === playlist.id ? null : playlist))
  }

  const handleDownload = () => {
    if (!selectedPlaylist || !outputFolder.trim() || isDownloading) return
    startDownload({ playlist: selectedPlaylist, outputFolder: outputFolder.trim(), djMode })
  }

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
        <p className="feature-label m-0">USB Pod</p>
        <h2 className="feature-title mt-1 mb-2">
          Convert a <strong>Spotify playlist</strong> to MP3 and download to your device.
        </h2>

        {/* Step 1 — Playlist selection */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-white">Select a Playlist</label>
            {selectedPlaylist && (
              <span className="text-xs uppercase tracking-[0.3em] text-accent">Selected</span>
            )}
          </div>

          <div className="relative mb-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your playlists..."
              className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-accent/60"
              disabled={playlistsLoading}
            />
            <div className="absolute right-3 top-2.5 text-white/40">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 103.5 10.5a7.5 7.5 0 0013.15 6.15z" />
              </svg>
            </div>
          </div>

          {playlistsLoading ? (
            <div className="text-sm text-text-secondary py-6 text-center">Loading playlists…</div>
          ) : filteredPlaylists.length === 0 ? (
            <div className="text-sm text-text-secondary py-6 text-center border border-dashed border-white/10 rounded-xl">
              No playlists match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {filteredPlaylists.map(playlist => {
                const isSelected = selectedPlaylist?.id === playlist.id
                return (
                  <button
                    type="button"
                    key={playlist.id}
                    className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                      isSelected
                        ? 'border-accent/70 bg-accent/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]'
                        : 'border-white/10 bg-white/5 hover:border-white/30'
                    }`}
                    onClick={() => handleSelect(playlist)}
                  >
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
                        {playlist.tracks?.total ?? 0} tracks
                      </div>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-accent bg-accent/20 text-accent' : 'border-white/30 text-transparent'
                      }`}
                    >
                      ✓
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Step 2 — Download settings */}
        <div className={`rounded-2xl border border-white/10 bg-white/5 p-6 transition-opacity ${selectedPlaylist ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
          <p className="text-sm font-medium text-white mb-4">Download Settings</p>

          {/* DJ Mode toggle */}
          <div className="flex items-center gap-3 mb-5">
            <span className="text-sm font-medium text-white">DJ Mode</span>
            <button
              type="button"
              onClick={() => setDjMode(v => !v)}
              disabled={isDownloading}
              className={`relative inline-flex h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-accent/60 ${
                djMode ? 'bg-accent/80' : 'bg-white/20'
              }`}
              aria-label="Toggle DJ Mode"
            >
              <span
                className={`inline-block h-4 w-4 mt-1 rounded-full bg-white shadow transform transition-transform ${
                  djMode ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-xs text-text-secondary">
              {djMode
                ? 'Prefers extended mixes on YouTube'
                : 'Downloads standard versions'}
            </span>
          </div>

          {/* Output folder */}
          <div className="mb-5">
            <label className="text-xs text-text-secondary mb-2 block">Output Folder</label>
            <button
              type="button"
              className="btn btn-secondary text-sm px-5"
              onClick={handleBrowse}
              disabled={!selectedPlaylist || isDownloading || browsing}
            >
              {browsing ? 'Opening…' : 'Browse…'}
            </button>
            {outputFolder && (
              <p className="mt-2 text-xs text-text-secondary font-mono break-all">
                {outputFolder}
              </p>
            )}
            {browseError && (
              <p className="mt-2 text-xs text-red-400">{browseError}</p>
            )}
          </div>

          {/* Action button */}
          <div className="flex items-center gap-3">
            {isDownloading ? (
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 rounded-full border-2 border-white/10 border-t-accent animate-spin" />
                <span className="text-sm text-text-secondary">
                  Downloading <span className="text-accent font-medium">{dlState?.playlistName}</span>…
                </span>
              </div>
            ) : (
              <button
                type="button"
                className="btn btn-accent w-full sm:w-auto"
                disabled={!selectedPlaylist || !outputFolder.trim()}
                onClick={handleDownload}
              >
                Convert &amp; Download
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

export default UsbPod

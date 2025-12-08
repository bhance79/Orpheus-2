import { useState, useEffect } from 'react'

const availableGenres = [
  'acoustic', 'afrobeat', 'alt-rock', 'alternative', 'ambient', 'anime', 'black-metal', 'bluegrass', 'blues',
  'bossanova', 'brazil', 'breakbeat', 'british', 'cantopop', 'chicago-house', 'children', 'chill', 'classical',
  'club', 'comedy', 'country', 'dance', 'dancehall', 'death-metal', 'deep-house', 'detroit-techno', 'disco',
  'disney', 'drum-and-bass', 'dub', 'dubstep', 'edm', 'electro', 'electronic', 'emo', 'folk', 'forro', 'french',
  'funk', 'garage', 'german', 'gospel', 'goth', 'grindcore', 'groove', 'grunge', 'guitar', 'happy', 'hard-rock',
  'hardcore', 'hardstyle', 'heavy-metal', 'hip-hop', 'holidays', 'honky-tonk', 'house', 'idm', 'indian', 'indie',
  'indie-pop', 'industrial', 'iranian', 'j-dance', 'j-idol', 'j-pop', 'j-rock', 'jazz', 'k-pop', 'kids', 'latin',
  'latino', 'malay', 'mandopop', 'metal', 'metal-misc', 'metalcore', 'minimal-techno', 'movies', 'mpb', 'new-age',
  'new-release', 'opera', 'pagode', 'party', 'philippines-opm', 'piano', 'pop', 'pop-film', 'post-dubstep',
  'power-pop', 'progressive-house', 'psych-rock', 'punk', 'punk-rock', 'r-n-b', 'rainy-day', 'reggae', 'reggaeton',
  'road-trip', 'rock', 'rock-n-roll', 'rockabilly', 'romance', 'sad', 'salsa', 'samba', 'sertanejo', 'show-tunes',
  'singer-songwriter', 'ska', 'sleep', 'songwriter', 'soul', 'soundtracks', 'spanish', 'study', 'summer', 'swedish',
  'synth-pop', 'tango', 'techno', 'trance', 'trip-hop', 'turkish', 'work-out', 'world-music'
]

const toTitleCaseGenre = (genre) =>
  (genre || '')
    .split('-')
    .map(word => (word ? word[0].toUpperCase() + word.slice(1) : ''))
    .join(' ')

const seedTypeLabel = (type) => {
  if (type === 'track') return 'Track'
  if (type === 'artist') return 'Artist'
  if (type === 'genre') return 'Genre'
  return 'Seed'
}

function CrateDigger() {
  const [mode, setMode] = useState('select') // 'select' or 'results'
  const [searchType, setSearchType] = useState('track') // 'track' | 'artist' | 'genre'
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [selectedSeeds, setSelectedSeeds] = useState([])
  const [recommendations, setRecommendations] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [playlistName, setPlaylistName] = useState('')
  const [savingPlaylist, setSavingPlaylist] = useState(false)
  const [savedPlaylist, setSavedPlaylist] = useState(null)

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(() => {
      if (searchType === 'genre') {
        setSearching(true)
        setError(null)
        const q = searchQuery.trim().toLowerCase()
        const matches = availableGenres
          .filter(g => g.includes(q))
          .slice(0, 15)
          .map(g => ({
            id: g,
            name: toTitleCaseGenre(g),
            artist: 'Genre',
            type: 'genre',
            seedType: 'genre'
          }))
        setSearchResults(matches)
        setSearching(false)
      } else {
        searchSpotify()
      }
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, searchType])

  const searchSpotify = async () => {
    if (searchType === 'genre') return
    setSearching(true)
    setError(null)

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}&limit=10`)
      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Search failed')
        setSearchResults([])
        return
      }

      setSearchResults(data.results.filter(r => r.type === searchType))
    } catch (err) {
      setError(String(err))
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const addSeed = (item) => {
    // Check if already selected
    if (selectedSeeds.find(s => s.id === item.id)) {
      return
    }

    // Spotify allows max 5 seeds
    if (selectedSeeds.length >= 5) {
      setError('Maximum 5 seeds allowed')
      return
    }

    const seedType = item.seedType || searchType
    setSelectedSeeds([...selectedSeeds, { ...item, seedType }])
    setSearchQuery('')
    setSearchResults([])
    setError(null)
  }

  const removeSeed = (id) => {
    setSelectedSeeds(selectedSeeds.filter(s => s.id !== id))
  }

  const getRecommendations = async () => {
    if (selectedSeeds.length === 0) {
      setError('Please select at least 1 track, artist, or genre')
      return
    }

    setLoading(true)
    setError(null)
    setMode('results')

    try {
      const seedTracks = selectedSeeds.filter(s => s.seedType === 'track').map(s => s.id)
      const seedArtists = selectedSeeds.filter(s => s.seedType === 'artist').map(s => s.id)
      const seedGenres = selectedSeeds.filter(s => s.seedType === 'genre').map(s => s.id)

      const res = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seed_tracks: seedTracks,
          seed_artists: seedArtists,
          seed_genres: seedGenres,
          limit: 100
        })
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Failed to get recommendations')
        setRecommendations([])
        setMode('select')
        return
      }

      setRecommendations(data.recommendations)
    } catch (err) {
      setError(String(err))
      setRecommendations([])
      setMode('select')
    } finally {
      setLoading(false)
    }
  }

  const saveToPlaylist = async () => {
    if (!playlistName.trim()) {
      setError('Please enter a playlist name')
      return
    }

    if (recommendations.length === 0) {
      setError('No recommendations to save')
      return
    }

    setSavingPlaylist(true)
    setError(null)

    try {
      const trackUris = recommendations.map(r => r.uri)
      const seedNames = selectedSeeds.map(s => s.name).join(', ')

      const res = await fetch('/api/create-playlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: playlistName,
          description: `CrateDigger recommendations based on: ${seedNames}`,
          track_uris: trackUris
        })
      })

      const data = await res.json()

      if (!data.ok) {
        setError(data.error || 'Failed to create playlist')
        return
      }

      setSavedPlaylist(data.playlist)
      setPlaylistName('')
    } catch (err) {
      setError(String(err))
    } finally {
      setSavingPlaylist(false)
    }
  }

  const reset = () => {
    setMode('select')
    setSelectedSeeds([])
    setRecommendations([])
    setError(null)
    setSavedPlaylist(null)
  }

  const seedSubtitle = (seed) => {
    if (seed.seedType === 'track') return `${seed.artist || 'Track'} · ${seedTypeLabel(seed.seedType)}`
    if (seed.seedType === 'artist') return `${seed.artist || 'Artist'} · ${seedTypeLabel(seed.seedType)}`
    if (seed.seedType === 'genre') return `${seed.name || 'Genre'} · ${seedTypeLabel(seed.seedType)}`
    return seedTypeLabel(seed.seedType)
  }

  const msToMinSec = (ms) => {
    if (ms == null) return ''
    const total = Math.round(ms / 1000)
    const m = Math.floor(total / 60)
    const s = String(total % 60).padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="dashboard-grid">
      <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
        <p className="feature-label">CrateDigger</p>
        <h2 className="feature-title">Discover new tracks based on your favorites</h2>
        <p className="feature-caption mb-6">
          Select up to 5 seeds (tracks, artists, or genres), and we&apos;ll recommend similar music for you.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200">
            {error}
          </div>
        )}

        {savedPlaylist && (
          <div className="mb-4 p-4 rounded-lg bg-green-500/20 border border-green-500/50">
            <p className="text-green-200 font-medium mb-2">Playlist created successfully!</p>
            <a
              href={savedPlaylist.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              Open {savedPlaylist.name} in Spotify
            </a>
          </div>
        )}

        {mode === 'select' ? (
          <>
            {/* Seed Selection */}
            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setSearchType('track')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    searchType === 'track'
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  Search Tracks
                </button>
                <button
                  onClick={() => setSearchType('artist')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    searchType === 'artist'
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  Search Artists
                </button>
                <button
                  onClick={() => setSearchType('genre')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    searchType === 'genre'
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-text-secondary hover:bg-white/10'
                  }`}
                >
                  Search Genres
                </button>
              </div>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={`Search for ${
                  searchType === 'track' ? 'tracks' : searchType === 'artist' ? 'artists' : 'genres'
                }...`}
                className="w-full px-4 py-3 rounded-lg"
                style={{
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}
                disabled={selectedSeeds.length >= 5}
              />

              {searching && (
                <p className="mt-2 text-sm text-text-secondary">Searching...</p>
              )}

              {searchResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {searchResults.map(result => (
                    <button
                      key={result.id}
                      onClick={() => addSeed(result)}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-all text-left"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {result.image && (
                        <img
                          src={result.image}
                          alt={result.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{result.name}</div>
                        <div className="text-sm text-text-secondary truncate">
                          {result.seedType === 'genre' ? 'Genre' : result.artist} · {seedTypeLabel(result.seedType || searchType)}
                        </div>
                      </div>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-accent"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Seeds */}
            {selectedSeeds.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">
                  Selected Seeds ({selectedSeeds.length}/5)
                </h3>
                <div className="space-y-2">
                  {selectedSeeds.map(seed => (
                    <div
                      key={seed.id}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                    >
                      {seed.image && (
                        <img
                          src={seed.image}
                          alt={seed.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{seed.name}</div>
                        <div className="text-sm text-text-secondary truncate">
                          {seed.artist} • {seed.seedType === 'track' ? 'Track' : 'Artist'}
                        </div>
                      </div>
                      <button
                        onClick={() => removeSeed(seed.id)}
                        className="p-2 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 text-red-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={getRecommendations}
                  className="mt-4 w-full px-6 py-3 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-all"
                  disabled={loading || selectedSeeds.length === 0}
                >
                  {loading ? 'Getting Recommendations...' : 'Get Recommendations'}
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Recommendations Results */}
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">
                Recommendations ({recommendations.length} tracks)
              </h3>
              <button
                onClick={reset}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-text-secondary transition-all"
              >
                Start Over
              </button>
            </div>

            {loading ? (
              <p className="text-text-secondary">Loading recommendations...</p>
            ) : recommendations.length > 0 ? (
              <>
                <div className="mb-6 space-y-2 max-h-96 overflow-y-auto">
                  {recommendations.map((track, idx) => (
                    <div
                      key={track.id || idx}
                      className="flex items-center gap-3 p-3 rounded-lg"
                      style={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }}
                    >
                      {track.cover && (
                        <img
                          src={track.cover}
                          alt={track.name}
                          className="w-12 h-12 rounded object-cover"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{track.name}</div>
                        <div className="text-sm text-text-secondary truncate">
                          {track.artists} • {track.album}
                        </div>
                      </div>
                      <div className="text-sm text-text-secondary">{msToMinSec(track.duration_ms)}</div>
                      {track.url && (
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-5 w-5 text-accent"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                          </svg>
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save to Playlist */}
                <div className="p-4 rounded-lg" style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <h4 className="font-semibold mb-3">Save to Playlist</h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={playlistName}
                      onChange={(e) => setPlaylistName(e.target.value)}
                      placeholder="Enter playlist name..."
                      className="flex-1 px-4 py-2 rounded-lg"
                      style={{
                        color: '#ffffff',
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)'
                      }}
                      disabled={savingPlaylist}
                    />
                    <button
                      onClick={saveToPlaylist}
                      className="px-6 py-2 bg-accent text-white font-semibold rounded-lg hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={savingPlaylist || !playlistName.trim()}
                    >
                      {savingPlaylist ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-text-secondary">No recommendations found</p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default CrateDigger

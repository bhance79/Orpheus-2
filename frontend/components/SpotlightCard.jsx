import { useState, useEffect } from 'react'
import AlbumPreviewOverlay from './AlbumPreviewOverlay'

const SPOTLIGHT_STORAGE_KEY = 'orpheus_spotlight_selection'

function SpotlightCard({ fallbackTrack, trackRangeLabel }) {
  const [spotlightItem, setSpotlightItem] = useState(null)
  const [spotlightSearch, setSpotlightSearch] = useState('')
  const [spotlightResults, setSpotlightResults] = useState([])
  const [searchingSpotlight, setSearchingSpotlight] = useState(false)
  const [spotlightEditing, setSpotlightEditing] = useState(false)
  const [spotlightSearchType, setSpotlightSearchType] = useState('album')
  const [previewTrack, setPreviewTrack] = useState(null)

  const normalizeSpotlightItem = (item) => {
    if (!item) return null
    const cover = item.cover || item.image || null
    const artistName = item.artist || item.artists || ''
    const albumName = item.album || null
    const albumId = item.album_id || (item.type === 'album' ? item.id : null)
    return {
      ...item,
      artist: artistName,
      artists: artistName,
      image: cover,
      cover,
      album: albumName,
      album_id: albumId,
      album_year: item.album_year || null
    }
  }

  // Restore persisted spotlight selection on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SPOTLIGHT_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        const normalized = normalizeSpotlightItem(parsed)
        if (normalized && normalized.name) {
          setSpotlightItem(normalized)
        }
      }
    } catch (err) {
      console.error('Failed to restore spotlight selection', err)
    }
  }, [])

  // Persist spotlight selection locally
  useEffect(() => {
    try {
      if (spotlightItem) {
        localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify(spotlightItem))
      } else {
        localStorage.removeItem(SPOTLIGHT_STORAGE_KEY)
      }
    } catch (err) {
      console.error('Failed to persist spotlight selection', err)
    }
  }, [spotlightItem])

  // Re-run search when type changes while editing
  useEffect(() => {
    if (spotlightEditing && spotlightSearch.trim()) {
      searchSpotlight(spotlightSearch)
    }
  }, [spotlightEditing, spotlightSearchType])

  const searchSpotlight = async (query) => {
    if (!query.trim()) {
      setSpotlightResults([])
      return
    }
    setSearchingSpotlight(true)
    try {
      const typeParam = spotlightSearchType === 'track' ? 'track' : 'album'
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=${typeParam}&limit=5`)
      const data = await res.json()
      if (data.ok) {
        setSpotlightResults(data.results || [])
      }
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearchingSpotlight(false)
    }
  }

  const selectSpotlightItem = (item) => {
    const normalized = normalizeSpotlightItem(item)
    if (!normalized) return
    setSpotlightItem(normalized)
    setSpotlightSearch('')
    setSpotlightResults([])
    setSpotlightEditing(false)
  }

  const fallbackSpotlight = fallbackTrack
    ? normalizeSpotlightItem({
        type: 'track',
        name: fallbackTrack.name,
        artist: fallbackTrack.artists,
        image: fallbackTrack.cover,
        cover: fallbackTrack.cover,
        album: fallbackTrack.album,
        album_id: fallbackTrack.album_id,
        album_year: fallbackTrack.album_year
      })
    : null
  const spotlightDisplay = spotlightItem || fallbackSpotlight
  const overlayPayload = spotlightDisplay && spotlightDisplay.album_id ? {
    name: spotlightDisplay.name,
    artists: spotlightDisplay.artist || spotlightDisplay.artists,
    album: spotlightDisplay.album,
    album_year: spotlightDisplay.album_year,
    album_id: spotlightDisplay.album_id,
    cover: spotlightDisplay.cover || spotlightDisplay.image
  } : null

  const handleSpotlightPreview = () => {
    if (overlayPayload?.album_id) {
      setPreviewTrack(overlayPayload)
    }
  }

  const handleSpotlightKeyDown = (event) => {
    if (!overlayPayload) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleSpotlightPreview()
    }
  }

  const closePreview = () => setPreviewTrack(null)

  return (
    <>
      <div className="spotlight-header">
        <p className="feature-label">Spotlight</p>
        <div className="spotlight-actions">
          {spotlightEditing ? (
            <button type="button" className="spotlight-clear" onClick={() => {
              setSpotlightEditing(false)
              setSpotlightSearch('')
              setSpotlightResults([])
            }}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="spotlight-edit"
              onClick={() => {
                setSpotlightEditing(true)
                setSpotlightSearch('')
                setSpotlightResults([])
              }}
            >
              Edit
            </button>
          )}
        </div>
      </div>

      {spotlightEditing ? (
        <div className="spotlight-search">
          <div className="spotlight-search-filters">
            {[
              { key: 'album', label: 'Albums' },
              { key: 'track', label: 'Tracks' }
            ].map(option => (
              <button
                key={option.key}
                type="button"
                className={`range-chip ${spotlightSearchType === option.key ? 'range-chip--active' : ''}`}
                onClick={() => setSpotlightSearchType(option.key)}
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="spotlight-search-bar">
            <input
              type="text"
              placeholder="Search track or album..."
              value={spotlightSearch}
              onChange={(e) => {
                setSpotlightSearch(e.target.value)
                searchSpotlight(e.target.value)
              }}
            />
            {searchingSpotlight && <span className="spotlight-loading">Searching...</span>}
          </div>

          {spotlightResults.length > 0 && (
            <div className="spotlight-results">
              {spotlightResults.map((item, index) => (
                <button
                  key={`${item.id}-${index}`}
                  type="button"
                  className="spotlight-result-item"
                  onClick={() => selectSpotlightItem(item)}
                >
                  {item.image ? (
                    <img src={item.image} alt="" className="spotlight-result-thumb" />
                  ) : (
                    <div className="spotlight-result-thumb spotlight-result-thumb--placeholder"></div>
                  )}
                  <div className="spotlight-result-copy">
                    <p className="spotlight-result-name">{item.name}</p>
                    <p className="spotlight-result-artist">{item.artist || item.type}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!spotlightResults.length && !spotlightSearch && (
            <p className="feature-caption">Type to search Spotify and set this card.</p>
          )}
        </div>
      ) : (
        <div className="spotlight-body">
          <article
            className={`spotlight-image-card ${overlayPayload ? 'spotlight-image-card--interactive' : ''}`}
            role={overlayPayload ? 'button' : undefined}
            tabIndex={overlayPayload ? 0 : -1}
            aria-disabled={!overlayPayload}
            onClick={overlayPayload ? handleSpotlightPreview : undefined}
            onKeyDown={overlayPayload ? handleSpotlightKeyDown : undefined}
          >
            {spotlightDisplay?.image ? (
              <img
                src={spotlightDisplay.image}
                alt={spotlightDisplay.name}
                className="spotlight-image-card__img"
              />
            ) : (
              <div className="spotlight-image-card__placeholder">Album cover</div>
            )}
            <div className="spotlight-image-card__gradient"></div>
            <div className="spotlight-image-card__content">
              <h3 className="spotlight-image-card__title">
                {spotlightDisplay?.name || 'Choose something to feature'}
              </h3>
              <p className="spotlight-image-card__artist">
                {spotlightDisplay?.artist || spotlightDisplay?.artists || 'Use edit to search Spotify.'}
              </p>
            </div>
          </article>
        </div>
      )}
      {previewTrack && <AlbumPreviewOverlay track={previewTrack} onClose={closePreview} />}
    </>
  )
}

export default SpotlightCard

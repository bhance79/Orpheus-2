import { useState, useEffect } from 'react'
import TopArtistsShowcase from '../components/TopArtistsShowcase'
import TopTracks from '../components/TopTracks'
import TopGenres from '../components/TopGenres'
import RecentlyPlayed from '../components/RecentlyPlayed'
import TopItemsModal from '../components/TopItemsModal'
import LoadingOverlay from '../components/LoadingOverlay'

const TIME_RANGE_LABELS = {
  short_term: 'Last 4 Weeks',
  medium_term: 'Last 6 Months',
  long_term: 'All Time'
}

function Dashboard({ initialData }) {
  const [loading, setLoading] = useState(!initialData)
  const [statsData, setStatsData] = useState(initialData || null)
  const [activeArtistRange, setActiveArtistRange] = useState('short_term')
  const [activeTrackRange, setActiveTrackRange] = useState('short_term')
  const [activeGenreSource, setActiveGenreSource] = useState('artists')
  const [activeGenreRange, setActiveGenreRange] = useState('short_term')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [rangeOptions, setRangeOptions] = useState(['short_term', 'medium_term', 'long_term'])
  const [spotlightItem, setSpotlightItem] = useState(null)
  const [spotlightSearch, setSpotlightSearch] = useState('')
  const [spotlightResults, setSpotlightResults] = useState([])
  const [searchingSpotlight, setSearchingSpotlight] = useState(false)
  const [spotlightEditing, setSpotlightEditing] = useState(false)

  useEffect(() => {
    if (initialData) {
      // Use cached data and set up range options
      const availableRanges = Object.keys(initialData.top_artists || {})
      if (availableRanges.length > 0) {
        setRangeOptions(availableRanges)
        const preferred = availableRanges.includes('short_term') ? 'short_term' : availableRanges[0]
        setActiveArtistRange(preferred)
        setActiveTrackRange(preferred)
        setActiveGenreRange(preferred)
      }
    } else {
      loadDashboardStats()
    }
  }, [initialData])

  const loadDashboardStats = async () => {
    try {
      const res = await fetch('/api/user-stats')
      const data = await res.json()

      if (!data.ok) {
        console.error('Failed to load stats:', data.error)
        return
      }

      setStatsData(data)

      // Update range options based on available data
      const availableRanges = Object.keys(data.top_artists || {})
      if (availableRanges.length > 0) {
        setRangeOptions(availableRanges)
        const preferred = availableRanges.includes('short_term') ? 'short_term' : availableRanges[0]
        setActiveArtistRange(preferred)
        setActiveTrackRange(preferred)
        setActiveGenreRange(preferred)
      }
    } catch (err) {
      console.error('Error loading stats:', err)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (type) => {
    setModalType(type)
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setModalType(null)
  }

  const getModalItems = () => {
    if (!modalType || !statsData) return []

    const dataMap = modalType === 'artists' ? statsData.top_artists : statsData.top_tracks
    const rangeKey = modalType === 'artists' ? activeArtistRange : activeTrackRange
    return dataMap[rangeKey] || []
  }

  const getModalTitle = () => {
    if (!modalType) return ''
    const rangeKey = modalType === 'artists' ? activeArtistRange : activeTrackRange
    const label = statsData?.range_labels?.[rangeKey] || TIME_RANGE_LABELS[rangeKey] || rangeKey
    return modalType === 'artists' ? `Top Artists — ${label}` : `Top Tracks — ${label}`
  }

  const canShowMore = (type) => {
    if (!statsData) return false
    const dataMap = type === 'artists' ? statsData.top_artists : statsData.top_tracks
    const rangeKey = type === 'artists' ? activeArtistRange : activeTrackRange
    const items = dataMap[rangeKey] || []
    return items.length > 5
  }

  const searchSpotlight = async (query) => {
    if (!query.trim()) {
      setSpotlightResults([])
      return
    }
    setSearchingSpotlight(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&type=track,album&limit=5`)
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
    setSpotlightItem(item)
    setSpotlightSearch('')
    setSpotlightResults([])
    setSpotlightEditing(false)
  }

  const clearSpotlight = () => {
    setSpotlightItem(null)
    setSpotlightEditing(true)
  }

  const userName = statsData?.user?.name || 'Spotify listener'
  const userInitial = userName?.[0] || 'U'
  const fallbackSpotlightTrack = statsData?.top_tracks?.[activeTrackRange]?.[0]
  const fallbackSpotlight = fallbackSpotlightTrack
    ? {
        type: 'track',
        name: fallbackSpotlightTrack.name,
        artist: fallbackSpotlightTrack.artists,
        image: fallbackSpotlightTrack.cover,
        album: fallbackSpotlightTrack.album
      }
    : null
  const spotlightDisplay = spotlightItem || fallbackSpotlight
  const trackRangeLabel = statsData?.range_labels?.[activeTrackRange] || TIME_RANGE_LABELS[activeTrackRange] || ''
  const shouldShowSpotlightSearch = spotlightEditing || !spotlightDisplay
  const canShowArtists = canShowMore('artists')
  const canShowTracks = canShowMore('tracks')

  if (loading) {
    return <LoadingOverlay message="Loading your dashboard..." />
  }

  return (
    <>
      {/* Dashboard Grid */}
      <div className="dashboard-grid dashboard-grid--six">
        {/* Welcome */}
        <section className="dashboard-card dashboard-card--welcome">
          <div className="welcome-card">
            <div className="welcome-copy">
              <p className="feature-label">Welcome back</p>
              <h2 className="feature-title">{userName}</h2>
              <p className="feature-caption">Your listening snapshot is ready.</p>
            </div>
            {statsData?.user?.image ? (
              <img src={statsData.user.image} alt={userName} className="welcome-avatar" />
            ) : (
              <div className="welcome-avatar welcome-avatar--placeholder">{userInitial}</div>
            )}
          </div>
        </section>

        {/* Spotlight */}
        <section className="dashboard-card dashboard-card--spotlight">
          <p className="feature-label">Spotlight</p>
          <div className="spotlight-body">
            <div className="spotlight-cover">
              {spotlightDisplay?.image ? (
                <img src={spotlightDisplay.image} alt={spotlightDisplay.name} />
              ) : (
                <div className="spotlight-cover--placeholder">Album cover</div>
              )}
            </div>
            <div className="spotlight-info">
              <p className="spotlight-label">
                {spotlightDisplay?.album || (spotlightDisplay?.type === 'album' ? 'Album' : 'Track')}
              </p>
              <h3 className="spotlight-title">
                {spotlightDisplay?.name || 'Choose something to feature'}
              </h3>
              <p className="spotlight-artist">
                {spotlightDisplay?.artist || spotlightDisplay?.artists || 'Use edit to search Spotify.'}
              </p>
              {spotlightDisplay && !spotlightItem && trackRangeLabel && (
                <p className="spotlight-caption">
                  Auto-filled from your {trackRangeLabel.toLowerCase()} top tracks.
                </p>
              )}
              <div className="spotlight-actions">
                {spotlightItem && (
                  <button type="button" className="spotlight-clear" onClick={clearSpotlight}>
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  className="spotlight-edit"
                  onClick={() => setSpotlightEditing(prev => !prev)}
                >
                  {shouldShowSpotlightSearch ? 'Close' : 'Edit'}
                </button>
              </div>
            </div>
          </div>
          {shouldShowSpotlightSearch && (
            <div className="spotlight-search">
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
                {searchingSpotlight && <span className="spotlight-loading">Searching…</span>}
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
          )}
        </section>

        {/* Top Tracks */}
        <section className="dashboard-card dashboard-card--tracks">
          <p className="feature-label">Top tracks</p>
          <TopTracks
            tracks={statsData?.top_tracks?.[activeTrackRange] || []}
            activeRange={activeTrackRange}
            rangeOptions={rangeOptions}
            rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
            onRangeChange={setActiveTrackRange}
            onShowMore={() => openModal('tracks')}
            canShowMore={canShowTracks}
            compact
          />
        </section>

        {/* Top Artists */}
        <section className="dashboard-card dashboard-card--artists">
          <p className="feature-label">Top artists</p>
          <TopArtistsShowcase
            artists={statsData?.top_artists?.[activeArtistRange] || []}
            activeRange={activeArtistRange}
            rangeOptions={rangeOptions}
            rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
            onRangeChange={setActiveArtistRange}
            onShowMore={() => openModal('artists')}
            canShowMore={canShowArtists}
            compact
          />
        </section>

        {/* Top Genres */}
        <section className="dashboard-card dashboard-card--genres">
          <p className="feature-label">Top genres</p>
          <TopGenres
            genresData={statsData?.top_genres || { artists: {}, tracks: {} }}
            activeSource={activeGenreSource}
            activeRange={activeGenreRange}
            rangeOptions={rangeOptions}
            rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
            onSourceChange={setActiveGenreSource}
            onRangeChange={setActiveGenreRange}
            compact
          />
        </section>

        {/* Extra container */}
        <section className="dashboard-card dashboard-card--extra">
          <p className="feature-label">Recently played</p>
          <RecentlyPlayed
            tracks={statsData?.recently_played || []}
            recentMinutes={statsData?.recent_minutes_listened}
            compact
          />
        </section>
      </div>

      {/* Modal */}
      {showModal && (
        <TopItemsModal
          isOpen={showModal}
          onClose={closeModal}
          items={getModalItems()}
          title={getModalTitle()}
          type={modalType}
          activeRange={modalType === 'artists' ? activeArtistRange : activeTrackRange}
          rangeOptions={rangeOptions}
          rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
          onRangeChange={modalType === 'artists' ? setActiveArtistRange : setActiveTrackRange}
        />
      )}
    </>
  )
}

export default Dashboard

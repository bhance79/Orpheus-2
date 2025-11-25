import { useState, useEffect } from 'react'
import TopArtistsShowcase from '../components/TopArtistsShowcase'
import TopTracks from '../components/TopTracks'
import TopGenres from '../components/TopGenres'
import RecentlyPlayed from '../components/RecentlyPlayed'
import TopItemsModal from '../components/TopItemsModal'
import LoadingOverlay from '../components/LoadingOverlay'
import SpotlightCard from '../components/SpotlightCard'
import PixelCard from '../components/PixelCard'

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
  const [activeGenreSource, setActiveGenreSource] = useState('tracks')
  const [activeGenreRange, setActiveGenreRange] = useState('long_term')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [rangeOptions, setRangeOptions] = useState(['short_term', 'medium_term', 'long_term'])

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

  const userName = statsData?.user?.name || 'Spotify listener'
  const userInitial = userName?.[0] || 'U'
  const fallbackSpotlightTrack = statsData?.top_tracks?.[activeTrackRange]?.[0]
  const trackRangeLabel = statsData?.range_labels?.[activeTrackRange] || TIME_RANGE_LABELS[activeTrackRange] || ''
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
          <SpotlightCard
            fallbackTrack={fallbackSpotlightTrack}
            trackRangeLabel={trackRangeLabel}
          />
        </section>

        {/* Top Tracks */}
        <section className="dashboard-card dashboard-card--tracks">
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

        {/* Spacer column */}
        <section className="dashboard-card dashboard-card--spacer">
          <PixelCard variant="blue" gap={8} speed={40} />
        </section>

        {/* Top Artists */}
        <section className="dashboard-card dashboard-card--artists">
          <TopArtistsShowcase
            artists={statsData?.top_artists?.[activeArtistRange] || []}
            activeRange={activeArtistRange}
            rangeOptions={rangeOptions}
            rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
            onRangeChange={setActiveArtistRange}
            onShowMore={() => openModal('artists')}
            canShowMore={canShowArtists}
          />
        </section>

        {/* Top Genres */}
        <section className="dashboard-card dashboard-card--genres">
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

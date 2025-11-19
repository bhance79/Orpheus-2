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

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [statsData, setStatsData] = useState(null)
  const [activeArtistRange, setActiveArtistRange] = useState('short_term')
  const [activeTrackRange, setActiveTrackRange] = useState('short_term')
  const [activeGenreSource, setActiveGenreSource] = useState('artists')
  const [activeGenreRange, setActiveGenreRange] = useState('short_term')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [rangeOptions, setRangeOptions] = useState(['short_term', 'medium_term', 'long_term'])

  useEffect(() => {
    loadDashboardStats()
  }, [])

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

  if (loading) {
    return <LoadingOverlay message="Loading your dashboard..." />
  }

  return (
    <div className="container">
      <h2 className="text-2xl font-bold mb-4">Your Music Dashboard</h2>

      {/* Top Artists Showcase */}
      <TopArtistsShowcase
        artists={statsData?.top_artists?.[activeArtistRange] || []}
        activeRange={activeArtistRange}
        rangeOptions={rangeOptions}
        rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
        onRangeChange={setActiveArtistRange}
        onShowMore={() => openModal('artists')}
        canShowMore={canShowMore('artists')}
      />

      {/* Top Tracks */}
      <TopTracks
        tracks={statsData?.top_tracks?.[activeTrackRange] || []}
        activeRange={activeTrackRange}
        rangeOptions={rangeOptions}
        rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
        onRangeChange={setActiveTrackRange}
        onShowMore={() => openModal('tracks')}
        canShowMore={canShowMore('tracks')}
      />

      {/* Top Genres */}
      <TopGenres
        genresData={statsData?.top_genres || { artists: {}, tracks: {} }}
        activeSource={activeGenreSource}
        activeRange={activeGenreRange}
        rangeOptions={rangeOptions}
        rangeLabels={statsData?.range_labels || TIME_RANGE_LABELS}
        onSourceChange={setActiveGenreSource}
        onRangeChange={setActiveGenreRange}
      />

      {/* Recently Played */}
      <RecentlyPlayed
        tracks={statsData?.recently_played || []}
        recentMinutes={statsData?.recent_minutes_listened}
      />

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
    </div>
  )
}

export default Dashboard
import { useMemo, useCallback, useState, useEffect, useRef } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import ArtistPreviewOverlay from './ArtistPreviewOverlay'

function TopArtistsShowcase({ artists, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const heroArtists = useMemo(() => artists.slice(0, compact ? 5 : 20), [artists, compact])
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start',
    dragFree: false
  })
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedArtist, setSelectedArtist] = useState(null)
  const [artistTopTracks, setArtistTopTracks] = useState({})
  const [loadingTracks, setLoadingTracks] = useState({})
  const abortControllersRef = useRef({})

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi])

  // Add wheel/touchpad scrolling support
  useEffect(() => {
    if (!emblaApi) return
    const viewport = emblaApi.rootNode()
    if (!viewport) return

    let cooldownTimeout = null
    let isInCooldown = false

    const onWheel = (e) => {
      // Only handle horizontal scrolling
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()

        // If we're in cooldown, ignore additional events completely
        if (isInCooldown) return

        // Trigger scroll immediately when threshold is met
        if (Math.abs(e.deltaX) > 5) {
          if (e.deltaX > 0) {
            emblaApi.scrollNext()
          } else {
            emblaApi.scrollPrev()
          }

          // Enter cooldown period to prevent multiple scrolls
          isInCooldown = true

          // Clear any existing timeout
          if (cooldownTimeout) {
            clearTimeout(cooldownTimeout)
          }

          // Stay in cooldown for a full second to handle long swipes
          cooldownTimeout = setTimeout(() => {
            isInCooldown = false
          }, 1000)
        }
      }
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', onWheel)
      if (cooldownTimeout) clearTimeout(cooldownTimeout)
    }
  }, [emblaApi])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

  // Fetch top tracks for an artist
  const fetchTopTracks = useCallback(async (artistId) => {
    if (!artistId || artistTopTracks[artistId] || loadingTracks[artistId]) return

    // Cancel any previous request for this artist
    if (abortControllersRef.current[artistId]) {
      abortControllersRef.current[artistId].abort()
    }

    const controller = new AbortController()
    abortControllersRef.current[artistId] = controller

    setLoadingTracks(prev => ({ ...prev, [artistId]: true }))

    try {
      const res = await fetch(`/api/artists/${artistId}`, { signal: controller.signal })
      const data = await res.json()

      if (data.ok && data.artist?.top_tracks) {
        setArtistTopTracks(prev => ({ ...prev, [artistId]: data.artist.top_tracks.slice(0, 10) }))
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch top tracks:', err)
      }
    } finally {
      setLoadingTracks(prev => ({ ...prev, [artistId]: false }))
      delete abortControllersRef.current[artistId]
    }
  }, [artistTopTracks, loadingTracks])

  // Fetch top tracks when carousel changes (with prefetching)
  useEffect(() => {
    if (!emblaApi || compact) return

    const currentArtist = heroArtists[selectedIndex]
    if (currentArtist?.id) {
      fetchTopTracks(currentArtist.id)
    }

    // Prefetch adjacent artists (previous and next)
    const prevIndex = selectedIndex - 1
    const nextIndex = selectedIndex + 1

    if (prevIndex >= 0 && heroArtists[prevIndex]?.id) {
      fetchTopTracks(heroArtists[prevIndex].id)
    }

    if (nextIndex < heroArtists.length && heroArtists[nextIndex]?.id) {
      fetchTopTracks(heroArtists[nextIndex].id)
    }
  }, [selectedIndex, heroArtists, fetchTopTracks, emblaApi, compact])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(abortControllersRef.current).forEach(controller => controller.abort())
    }
  }, [])

  if (compact) {
    return (
      <>
        <div className="card-header">
          <div className="spotlight-header w-full">
            <p className="feature-label m-0">Top artists</p>
            <div className="spotlight-actions">
              {rangeOptions.map(range => (
                <button
                  key={range}
                  type="button"
                  className={`spotlight-edit ${activeRange === range ? 'spotlight-edit--active' : ''}`}
                  onClick={() => onRangeChange(range)}
                >
                  {rangeLabels[range] || range}
                </button>
              ))}
              <button
                onClick={onShowMore}
                type="button"
                className={`link-btn ${!canShowMore ? 'link-btn--disabled' : ''}`}
                disabled={!canShowMore}
              >
                Show all
              </button>
            </div>
          </div>
        </div>
        <div className="card-content">
          <div className="flex gap-3 overflow-x-auto pb-2">
            {heroArtists.length === 0 ? (
              <div className="text-xs text-gray-400">No data</div>
            ) : (
              heroArtists.map((artist, index) => (
                <div key={artist.id || index} className="flex-shrink-0 text-center w-16">
                  <div
                    className="relative w-14 h-14 mx-auto rounded-full overflow-hidden bg-gray-700 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setSelectedArtist(artist)}
                  >
                    {artist.image && (
                      <img src={artist.image} alt={artist.name} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute bottom-0 left-0 text-[10px] font-bold text-white bg-black/70 px-1 rounded-tr">
                      {index + 1}
                    </div>
                  </div>
                  <div className="text-[10px] mt-1 truncate text-gray-300">{artist.name}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="top-artists-card">
      <div className="flex items-start justify-between gap-4 mb-1">
        <div>
          <p className="feature-label m-0">Top artists</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {rangeOptions.map(range => (
            <button
              key={range}
              type="button"
              className={`spotlight-edit ${activeRange === range ? 'spotlight-edit--active' : ''}`}
              onClick={() => onRangeChange(range)}
            >
              {rangeLabels[range] || range}
            </button>
          ))}
          <button
            type="button"
            className={`link-btn ${!canShowMore ? 'link-btn--disabled' : ''}`}
            disabled={!canShowMore}
            onClick={onShowMore}
          >
            Show all
          </button>
        </div>
      </div>

      {heroArtists.length === 0 ? (
        <div className="text-sm text-gray-400">No artist data available yet.</div>
      ) : (
        <div className="top-artists-carousel-wrapper">
          <div className="top-artists-carousel__viewport" ref={emblaRef}>
            <div className="top-artists-carousel__container">
              {heroArtists.map((artist, index) => {
                const primaryGenre = artist.genres?.[0]
                const topTracks = artistTopTracks[artist.id] || []
                const isLoading = loadingTracks[artist.id]

                return (
                  <div className="top-artists-carousel__slide" key={artist.id || index}>
                    <div className="top-artists-carousel">
                      <div
                        className="top-artists-carousel__avatar cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setSelectedArtist(artist)}
                      >
                        {artist.image ? <img src={artist.image} alt={artist.name} /> : <span>artist avatar</span>}
                      </div>
                      <div className="top-artists-carousel__content">
                        <div className="top-artists-carousel__header">
                          <div>
                            <p className="top-artists-carousel__eyebrow"></p>
                            <h3>
                              <a href={artist.url} target="_blank" rel="noopener noreferrer">
                                {artist.name}
                              </a>
                            </h3>
                            <p className="top-artists-carousel__genre">{primaryGenre || 'Genre unavailable'}</p>
                          </div>
                        </div>
                        {isLoading ? (
                          <div className="text-sm text-gray-400 mt-2">Loading top tracks...</div>
                        ) : topTracks.length > 0 ? (
                          <div className="mt-2">
                            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Top Tracks</p>
                            <div className="grid grid-cols-2 gap-x-6">
                              <div className="flex flex-col gap-2">
                                {topTracks.slice(0, 5).map((track, idx) => (
                                  <div key={idx} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500 w-4 flex-shrink-0">{idx + 1}.</span>
                                    <a
                                      href={track.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-white hover:text-white/70 transition-colors truncate"
                                    >
                                      {track.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-col gap-2">
                                {topTracks.slice(5, 10).map((track, idx) => (
                                  <div key={idx + 5} className="flex items-center gap-2 text-sm">
                                    <span className="text-gray-500 w-4 flex-shrink-0">{idx + 6}.</span>
                                    <a
                                      href={track.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-white hover:text-white/70 transition-colors truncate"
                                    >
                                      {track.name}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          artist.bio && <p className="top-artists-carousel__bio">{artist.bio}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          {heroArtists.length > 1 && (
            <>
              <div className="top-artists-carousel__nav">
                <button type="button" onClick={scrollPrev} aria-label="Previous artist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <button type="button" onClick={scrollNext} aria-label="Next artist">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="top-artists-carousel__dots">
                {heroArtists.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`top-artists-carousel__dot ${index === selectedIndex ? 'top-artists-carousel__dot--active' : ''}`}
                    onClick={() => emblaApi?.scrollTo(index)}
                    aria-label={`Go to artist ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {selectedArtist && (
        <ArtistPreviewOverlay
          artist={selectedArtist}
          onClose={() => setSelectedArtist(null)}
        />
      )}
    </div>
  )
}

export default TopArtistsShowcase

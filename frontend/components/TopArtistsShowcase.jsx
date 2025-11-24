import { useMemo, useCallback, useState, useEffect } from 'react'
import useEmblaCarousel from 'embla-carousel-react'

function TopArtistsShowcase({ artists, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const heroArtists = useMemo(() => artists.slice(0, compact ? 5 : 20), [artists, compact])
  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    align: 'start'
  })
  const [selectedIndex, setSelectedIndex] = useState(0)

  useEffect(() => {
    if (!emblaApi) return
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap())
    emblaApi.on('select', onSelect)
    onSelect()
    return () => emblaApi.off('select', onSelect)
  }, [emblaApi])

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev()
  }, [emblaApi])

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext()
  }, [emblaApi])

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
                  <div className="relative w-14 h-14 mx-auto rounded-full overflow-hidden bg-gray-700">
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

                return (
                  <div className="top-artists-carousel__slide" key={artist.id || index}>
                    <div className="top-artists-carousel">
                      <div className="top-artists-carousel__avatar">
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
                        {artist.bio && <p className="top-artists-carousel__bio">{artist.bio}</p>}
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
    </div>
  )
}

export default TopArtistsShowcase

import useEmblaCarousel from 'embla-carousel-react'
import { useCallback } from 'react'

function TopArtistsShowcase({ artists, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const heroArtists = artists.slice(0, compact ? 5 : 15)

  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: 'trimSnaps',
    dragFree: true
  })

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
          <h3 className="card-title">Top Artists</h3>
          <div className="card-controls">
            <select
              value={activeRange}
              onChange={(e) => onRangeChange(e.target.value)}
              className="text-xs bg-bg-input border-0 rounded px-2 py-1"
            >
              {rangeOptions.map(range => (
                <option key={range} value={range}>{rangeLabels[range] || range}</option>
              ))}
            </select>
            <button onClick={onShowMore} className="text-xs text-white/80 hover:text-white/60">
              More
            </button>
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
    <div className="card mb-6 top-artists-card">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-sm text-gray-400 uppercase tracking-wide">Spotlight</div>
          <h3 className="text-2xl font-semibold">Your Top Artists</h3>
          <div className="text-sm text-gray-400">
            Range: <span className="text-white font-semibold">{rangeLabels[activeRange] || activeRange}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start sm:items-end">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select artist range">
            {rangeOptions.map(range => (
              <button
                key={range}
                type="button"
                className={`px-3 py-1 text-xs font-medium rounded-full border transition ${
                  activeRange === range
                    ? 'bg-white/20 text-white border-white/30'
                    : 'border-gray-600 text-gray-400 hover:text-white'
                }`}
                onClick={() => onRangeChange(range)}
              >
                {rangeLabels[range] || range}
              </button>
            ))}
          </div>
          <button
            type="button"
            className={`link-btn ${!canShowMore ? 'link-btn--disabled' : ''}`}
            disabled={!canShowMore}
            onClick={onShowMore}
          >
            View full list
          </button>
        </div>
      </div>

      <div className="relative">
        {/* Carousel Navigation */}
        <div className="absolute -top-12 right-0 flex gap-2 z-10">
          <button
            onClick={scrollPrev}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition"
            aria-label="Previous"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={scrollNext}
            className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition"
            aria-label="Next"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Embla Carousel */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-6">
            {heroArtists.length === 0 ? (
              <div className="text-sm text-gray-400">No artist data available yet.</div>
            ) : (
              heroArtists.map((artist, index) => {
                const primaryGenre = artist.genres && artist.genres.length > 0 ? artist.genres[0] : null
                const bio = artist.bio || (primaryGenre
                  ? `${artist.name} is a ${primaryGenre} artist.`
                  : `${artist.name} is an artist.`)

                return (
                  <div key={artist.id || index} className="artist-hero-card flex-shrink-0 w-64 sm:w-72 md:w-80">
                    <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gray-900">
                      {artist.image ? (
                        <img
                          src={artist.image}
                          alt={artist.name}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-700"></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none"></div>
                      <div className="absolute bottom-3 left-3 text-sm font-semibold text-white bg-black/60 rounded-full px-3 py-1">
                        #{index + 1}
                      </div>
                    </div>
                    <div className="mt-3">
                      <div className="font-semibold text-lg text-white truncate">
                        <a href={artist.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
                          {artist.name}
                        </a>
                      </div>
                      {primaryGenre ? (
                        <div className="text-xs uppercase tracking-wide text-white/70">{primaryGenre}</div>
                      ) : (
                        <div className="text-xs text-gray-500">Genre unavailable</div>
                      )}
                      <p className="text-sm text-gray-300 mt-2 leading-snug line-clamp-3">{bio}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default TopArtistsShowcase

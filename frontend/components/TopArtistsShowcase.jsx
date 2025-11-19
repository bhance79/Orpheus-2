function TopArtistsShowcase({ artists, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore }) {
  const escapeHtml = (value = '') => {
    const div = document.createElement('div')
    div.textContent = value
    return div.innerHTML
  }

  const heroArtists = artists.slice(0, 15)

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
                    ? 'bg-primary text-white border-primary'
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

      <div className="overflow-x-auto pb-2 top-artists-hero">
        <div className="flex gap-6 min-w-max">
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
                      <a href={artist.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {artist.name}
                      </a>
                    </div>
                    {primaryGenre ? (
                      <div className="text-xs uppercase tracking-wide text-primary">{primaryGenre}</div>
                    ) : (
                      <div className="text-xs text-gray-500">Genre unavailable</div>
                    )}
                    <p className="text-sm text-gray-300 mt-2 leading-snug">{bio}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default TopArtistsShowcase
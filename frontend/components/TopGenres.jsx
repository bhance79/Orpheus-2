function TopGenres({ genresData, activeSource, activeRange, rangeOptions, rangeLabels, onSourceChange, onRangeChange }) {
  const genreSourceLabels = {
    artists: 'Top Artists',
    tracks: 'Top Tracks'
  }
  const genreSourceOptions = ['artists', 'tracks']

  const sourceData = genresData[activeSource] || {}
  const genres = sourceData[activeRange] || []

  const renderGenreChart = () => {
    if (genres.length === 0) {
      return <div className="text-sm text-gray-400">Genre data unavailable.</div>
    }

    const maxPercentage = Math.max(...genres.map(g => g.percentage || 0)) || 1

    return (
      <div className="genre-chart">
        {genres.map((genre, index) => {
          const percentage = genre.percentage || 0
          const width = Math.max((percentage / maxPercentage) * 100, 2)
          const label = genre.genre || 'Unknown'
          const displayPercentage = genre.percentage != null ? `${genre.percentage}%` : ''

          // Color gradient based on ranking
          const hue = 250 - index * 10
          const saturation = Math.max(70 - index * 3, 45)
          const lightness = Math.min(55 + index * 2, 68)

          // Size-based hierarchy
          const baseHeight = 32
          const heightBonus = Math.max(0, (genres.length - index) * 2)
          const barHeight = baseHeight + heightBonus

          return (
            <div key={index} className="genre-bar-row" style={{ animationDelay: `${index * 0.08}s` }}>
              <div className="genre-bar-header">
                <div className="genre-bar-rank">{index + 1}</div>
                <div className="genre-bar-label">{label}</div>
                <div className="genre-bar-value">{displayPercentage}</div>
              </div>
              <div className="genre-bar-container" style={{ height: `${barHeight}px` }}>
                <div
                  className="genre-bar-fill"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue}, ${saturation}%, ${lightness - 8}%) 100%)`,
                    boxShadow: `0 0 20px hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Top Genres</h3>
          <div className="text-sm text-gray-400">
            {genreSourceLabels[activeSource] || activeSource} · {rangeLabels[activeRange] || activeRange}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Source</div>
            <div className="flex gap-2">
              {genreSourceOptions.map(source => (
                <button
                  key={source}
                  type="button"
                  className={`range-chip ${activeSource === source ? 'range-chip--active' : ''}`}
                  onClick={() => onSourceChange(source)}
                >
                  {genreSourceLabels[source] || source}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Range</div>
            <div className="flex gap-2">
              {rangeOptions.map(range => (
                <button
                  key={range}
                  type="button"
                  className={`range-chip ${activeRange === range ? 'range-chip--active' : ''}`}
                  onClick={() => onRangeChange(range)}
                >
                  {rangeLabels[range] || range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {renderGenreChart()}
    </div>
  )
}

export default TopGenres
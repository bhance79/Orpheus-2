function TopTracks({ tracks, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const previewTracks = tracks.slice(0, compact ? 4 : 5)

  if (compact) {
    return (
      <>
        <div className="card-header">
          <h3 className="card-title">Top Tracks</h3>
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
            <button onClick={onShowMore} className="text-xs text-primary hover:text-primary-hover">
              More
            </button>
          </div>
        </div>
        <div className="card-content space-y-1 overflow-y-auto">
          {previewTracks.length === 0 ? (
            <div className="text-xs text-gray-400">No data</div>
          ) : (
            previewTracks.map((track, index) => (
              <div key={index} className="flex items-center gap-2 p-1 hover:bg-bg-input rounded text-xs">
                <span className="text-gray-500 w-4">{index + 1}</span>
                {track.cover ? (
                  <img src={track.cover} alt={track.name} className="w-8 h-8 rounded object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded bg-gray-700 flex-shrink-0"></div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{track.name}</div>
                  <div className="text-gray-400 truncate text-[10px]">{track.artists}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </>
    )
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3 gap-4">
        <div>
          <h3 className="text-lg font-semibold">Top Tracks</h3>
          <div className="text-sm text-gray-400">
            Range: <span className="text-white font-semibold">{rangeLabels[activeRange] || activeRange}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2 items-start sm:items-end">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select track range">
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
            Show more
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {previewTracks.length === 0 ? (
          <div className="text-sm text-gray-400">No data available for this range.</div>
        ) : (
          previewTracks.map((track, index) => (
            <div key={index} className="flex items-center gap-3 p-2 hover:bg-gray-800 rounded">
              <div className="text-sm text-gray-400 w-6">{index + 1}.</div>
              {track.cover ? (
                <img src={track.cover} alt={track.name} className="w-12 h-12 rounded object-cover flex-shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-700 flex-shrink-0"></div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium">
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {track.name}
                  </a>
                </div>
                <div className="text-sm text-gray-400 truncate">{track.artists}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TopTracks
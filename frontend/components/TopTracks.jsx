function TopTracks({ tracks, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const previewTracks = tracks.slice(0, compact ? 4 : 5)

  if (compact) {
    return (
      <>
        <div className="spotlight-header">
          <div>
            <p className="feature-label m-0">Top tracks</p>
          </div>
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
              type="button"
              className={`link-btn ${!canShowMore ? 'link-btn--disabled' : ''}`}
              disabled={!canShowMore}
              onClick={onShowMore}
            >
              Show all
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
      <div className="flex items-center justify-between mb-3">
        <p className="feature-label m-0">Top Tracks</p>
        <div className="flex items-center gap-2">
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
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
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

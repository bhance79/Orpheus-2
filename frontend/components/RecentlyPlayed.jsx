import AnimatedList from './AnimatedList'

function RecentlyPlayed({ tracks, recentMinutes, compact }) {
  const previewTracks = tracks.slice(0, compact ? 30 : 40)

  const renderCompactItem = (track) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
            {track.name}
          </a>
        </div>
        <div className="text-[11px] text-gray-400 truncate">{track.artists}</div>
      </div>
    </div>
  )

  const renderFullItem = (track) => (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="font-medium">
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
            {track.name}
          </a>
        </div>
        <div className="text-sm text-gray-400 truncate">{track.artists}</div>
      </div>
    </div>
  )

  if (compact) {
    return (
      <>
        <div className="spotlight-header">
          <div>
            <p className="feature-label m-0">Recently Played</p>
          </div>
          {recentMinutes && (
            <span className="text-[12px] text-gray-400">{recentMinutes} min</span>
          )}
        </div>
        <div className="card-content pb-2">
          {previewTracks.length === 0 ? (
            <div className="text-xs text-gray-400">No recent tracks</div>
          ) : (
            <AnimatedList
              items={previewTracks}
              renderItem={renderCompactItem}
              showGradients={false}
              enableArrowNavigation={false}
              displayScrollbar={false}
              itemSpacing="0.2rem"
              maxHeight="360px"
            />
          )}
        </div>
      </>
    )
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold m-0">Recently Played</h3>
        {recentMinutes && (
          <span className="text-base text-gray-400">{recentMinutes} min</span>
        )}
      </div>

      {previewTracks.length === 0 ? (
        <div className="text-sm text-gray-400">No recently played tracks.</div>
      ) : (
        <AnimatedList
          items={previewTracks}
          renderItem={renderFullItem}
          showGradients={true}
          enableArrowNavigation={false}
          displayScrollbar={true}
          maxHeight="420px"
        />
      )}
    </div>
  )
}

export default RecentlyPlayed

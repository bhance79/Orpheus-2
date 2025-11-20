function RecentlyPlayed({ tracks, recentMinutes, compact }) {
  if (compact) {
    return (
      <>
        <div className="card-header">
          <h3 className="card-title">Recently Played</h3>
          {recentMinutes && (
            <span className="text-[10px] text-gray-400">{recentMinutes} min</span>
          )}
        </div>
        <div className="card-content space-y-1 overflow-y-auto">
          {tracks.length === 0 ? (
            <div className="text-xs text-gray-400">No recent tracks</div>
          ) : (
            tracks.slice(0, 6).map((track, index) => (
              <div key={index} className="flex items-center gap-2 p-1 hover:bg-bg-input rounded text-xs">
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
      <h3 className="text-lg font-semibold mb-3">Recently Played</h3>
      {recentMinutes && (
        <p className="text-sm text-gray-400 mb-3">
          You've listened to about {recentMinutes} minutes of music recently.
        </p>
      )}
      <div className="space-y-2 recently-played-scroll max-h-96 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="text-sm text-gray-400">No recently played tracks.</div>
        ) : (
          tracks.slice(0, 30).map((track, index) => (
            <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-800 rounded">
              <div className="flex-1">
                <div className="font-medium">
                  <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                    {track.name}
                  </a>
                </div>
                <div className="text-sm text-gray-400">{track.artists}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default RecentlyPlayed
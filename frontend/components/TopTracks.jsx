import { useState } from 'react'
import AnimatedList from './AnimatedList'
import AlbumPreviewOverlay from './AlbumPreviewOverlay'

function TopTracks({ tracks, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore, compact }) {
  const [previewTrack, setPreviewTrack] = useState(null)
  const previewTracks = tracks.slice(0, compact ? 10 : 12)

  const handleCoverClick = (track) => {
    if (track) {
      setPreviewTrack(track)
    }
  }

  const closePreview = () => setPreviewTrack(null)

  const renderCoverButton = (track, sizeClasses, roundedClasses) => (
    <button
      type="button"
      className={`${sizeClasses} ${roundedClasses} flex-shrink-0 overflow-hidden bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 transition-transform hover:scale-[1.02]`}
      onClick={() => handleCoverClick(track)}
      aria-label={`View album cover for ${track.album || track.name || 'track'}`}
    >
      {track.cover ? (
        <img src={track.cover} alt={track.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gray-700 flex items-center justify-center text-[10px] uppercase tracking-[0.2em] text-white/40">
          No art
        </div>
      )}
    </button>
  )

  const renderTrackItem = (track, index) => (
    <div className="flex items-center gap-4">
      <div className="text-lg text-gray-400 w-7">{index + 1}.</div>
      {renderCoverButton(track, 'w-14 h-14', 'rounded-xl')}
      <div className="flex-1 min-w-0">
        <div className="text-lg font-medium">
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
            {track.name}
          </a>
        </div>
        <div className="text-base text-gray-400 truncate">{track.artists}</div>
      </div>
      <div className="text-base text-gray-500 truncate text-right max-w-[200px]">{track.album || 'Album unavailable'}</div>
    </div>
  )

  const renderCompactTrackItem = (track, index) => (
    <div className="flex items-center gap-3">
      <div className="text-lg text-gray-300 w-7 font-semibold">{index + 1}.</div>
      {renderCoverButton(track, 'w-14 h-14', 'rounded-xl')}
      <div className="flex-1 min-w-0">
        <div className="text-lg font-semibold leading-snug">
          <a href={track.url} target="_blank" rel="noopener noreferrer" className="hover:text-white/70">
            {track.name}
          </a>
        </div>
        <div className="text-base text-gray-400 truncate">{track.artists}</div>
      </div>
      <div className="text-sm text-gray-500 truncate text-right max-w-[180px]">{track.album || 'Album unavailable'}</div>
    </div>
  )

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
        <div className="card-content pb-4">
          {previewTracks.length === 0 ? (
            <div className="text-xs text-gray-400">No data</div>
          ) : (
            <AnimatedList
              key={activeRange}
              items={previewTracks}
              renderItem={renderCompactTrackItem}
              showGradients={false}
              enableArrowNavigation={false}
              displayScrollbar={false}
              itemSpacing="0.1rem"
              maxHeight="320px"
            />
          )}
        </div>
        {previewTrack && <AlbumPreviewOverlay track={previewTrack} onClose={closePreview} />}
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

      {previewTracks.length === 0 ? (
        <div className="text-sm text-gray-400">No data available for this range.</div>
      ) : (
        <AnimatedList
          key={activeRange}
          items={previewTracks}
          renderItem={renderTrackItem}
          showGradients={true}
          enableArrowNavigation={true}
          displayScrollbar={true}
          maxHeight="320px"
        />
      )}
      {previewTrack && <AlbumPreviewOverlay track={previewTrack} onClose={closePreview} />}
    </div>
  )
}

export default TopTracks

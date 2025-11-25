import { useState } from 'react'
import AnimatedList from './AnimatedList'
import AlbumPreviewOverlay from './AlbumPreviewOverlay'
import ArtistPreviewOverlay from './ArtistPreviewOverlay'

function TopItemsModal({ isOpen, onClose, items, title, type, activeRange, rangeOptions, rangeLabels, onRangeChange }) {
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [selectedArtist, setSelectedArtist] = useState(null)

  if (!isOpen) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </div>

        {rangeOptions.length > 0 && (
          <div className="px-6 py-4 border-b border-border flex items-center gap-4">
            <div className="text-sm text-gray-400">Time range:</div>
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
        )}

        <div className="modal-content">
          {items.length === 0 ? (
            <div className="p-6 text-sm text-gray-400">No data available for this range.</div>
          ) : (
            <div className="modal-list px-6">
              <AnimatedList
                key={activeRange}
                items={items}
                renderItem={(item, index) => (
                  type === 'artists' ? (
                    <div className="flex items-center gap-4">
                      <div className="text-lg text-gray-400 w-7">{index + 1}.</div>
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="w-14 h-14 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedArtist(item)}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-gray-700"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium hover:text-white/70"
                        >
                          {item.name}
                        </a>
                        <div className="text-base text-gray-400 truncate">
                          {item.genres && item.genres.length ? item.genres.join(', ') : 'Genre unavailable'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="text-lg text-gray-400 w-7">{index + 1}.</div>
                      {item.cover ? (
                        <img
                          src={item.cover}
                          alt={item.name}
                          className="w-14 h-14 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => setSelectedTrack(item)}
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-700"></div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-lg font-medium">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-white/70"
                          >
                            {item.name}
                          </a>
                        </div>
                        <div className="text-base text-gray-400 truncate">{item.artists}</div>
                      </div>
                      <div className="text-base text-gray-500 truncate text-right max-w-[200px]">{item.album || 'Album unavailable'}</div>
                    </div>
                  )
                )}
                showGradients={true}
                enableArrowNavigation={true}
                displayScrollbar={true}
                itemSpacing="0.75rem"
              />
            </div>
          )}
        </div>
      </div>

      {selectedTrack && (
        <AlbumPreviewOverlay
          track={selectedTrack}
          onClose={() => setSelectedTrack(null)}
        />
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

export default TopItemsModal

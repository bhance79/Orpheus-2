function TopItemsModal({ isOpen, onClose, items, title, type, activeRange, rangeOptions, rangeLabels, onRangeChange }) {
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
          <div className="p-4 border-b border-border flex items-center gap-4">
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
            <div className="p-4 text-sm text-gray-400">No data available for this range.</div>
          ) : (
            <div className="modal-list">
              {items.map((item, index) => (
                <div key={index} className="modal-list-item">
                  <div className="modal-rank text-lg font-bold text-text-muted">{index + 1}</div>
                  <div className="modal-body flex-1">
                    {type === 'artists' ? (
                      <div className="flex items-center gap-4">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded-full bg-gray-700"></div>
                        )}
                        <div className="flex-1">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-medium hover:text-primary"
                          >
                            {item.name}
                          </a>
                          <div className="text-sm text-gray-400">
                            {item.genres && item.genres.length ? item.genres.join(', ') : 'Genre unavailable'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        {item.cover ? (
                          <img src={item.cover} alt={item.name} className="w-16 h-16 rounded object-cover" />
                        ) : (
                          <div className="w-16 h-16 rounded bg-gray-700"></div>
                        )}
                        <div className="flex-1 min-w-0">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-lg font-medium hover:text-primary block truncate"
                          >
                            {item.name}
                          </a>
                          <div className="text-sm text-gray-400 truncate">{item.artists}</div>
                          <div className="text-sm text-gray-500 truncate">{item.album || 'Album unavailable'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TopItemsModal
import { useDownload } from '../context/DownloadContext'

export default function DownloadPopup() {
  const { dlState, cancelDownload, dismissPopup, toggleMinimized } = useDownload()

  if (!dlState) return null

  const { playlistName, total, results, error, active, minimized } = dlState
  const processed = results?.length ?? 0
  const percent = total > 0 ? Math.round((processed / total) * 100) : 0
  const isComplete = !active && !error
  const doneCount = results?.filter(r => r.type === 'done').length ?? 0
  const skipCount = results?.filter(r => r.type === 'skip').length ?? 0
  const errorCount = results?.filter(r => r.type === 'error').length ?? 0

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] w-[340px] rounded-2xl border border-white/15 bg-[#0d0d0d]/95 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md overflow-hidden"
      style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.06)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.07]">
        {/* Animated dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
          active ? 'bg-accent animate-pulse' : isComplete ? 'bg-accent' : 'bg-red-400'
        }`} />

        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-white uppercase tracking-[0.2em]">USB Pod</p>
          <p className="text-[11px] text-white/50 truncate">{playlistName}</p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={toggleMinimized}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-xs"
            aria-label={minimized ? 'Expand' : 'Minimize'}
          >
            {minimized ? '▲' : '▼'}
          </button>
          {(isComplete || error) && (
            <button
              type="button"
              onClick={dismissPopup}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors text-sm leading-none"
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Progress bar — always visible even when minimized */}
      {total > 0 && (
        <div className="h-1 bg-white/10 w-full">
          <div
            className={`h-full transition-all duration-500 ${isComplete ? 'bg-accent' : 'bg-accent/70'}`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}

      {/* Collapsed body — just show percentage + status */}
      {minimized && (
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs text-white/60">
            {active
              ? `${processed} / ${total || '…'} tracks`
              : isComplete
              ? `Done — ${doneCount} downloaded`
              : 'Error'}
          </span>
          <span className="text-xs font-semibold text-accent">{total > 0 ? `${percent}%` : ''}</span>
        </div>
      )}

      {/* Expanded body */}
      {!minimized && (
        <div className="px-4 py-4">
          {/* Status line */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-white">
              {active ? 'Downloading…' : isComplete ? 'Complete' : 'Failed'}
            </span>
            {total > 0 && (
              <span className="text-xs text-white/50">{processed} / {total}</span>
            )}
          </div>

          {/* Error banner */}
          {error && (
            <div className="text-xs text-red-400 mb-3 px-3 py-2 bg-red-500/10 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          {/* Summary chips (when complete) */}
          {isComplete && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {doneCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-accent/15 text-accent border border-accent/30">
                  {doneCount} downloaded
                </span>
              )}
              {skipCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-white/10 text-white/60 border border-white/10">
                  {skipCount} skipped
                </span>
              )}
              {errorCount > 0 && (
                <span className="px-2.5 py-1 rounded-full text-[11px] bg-red-500/15 text-red-400 border border-red-500/20">
                  {errorCount} failed
                </span>
              )}
            </div>
          )}

          {/* First error diagnostic banner */}
          {errorCount > 0 && results?.find(r => r.type === 'error')?.error && (
            <div className="mb-3 px-2.5 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] uppercase tracking-wider text-red-400 font-semibold mb-0.5">Error detail</p>
              <p className="text-[11px] text-red-300 break-all font-mono leading-relaxed">
                {results.find(r => r.type === 'error').error}
              </p>
            </div>
          )}

          {/* Per-track list */}
          {results?.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 mb-3">
              {results.map((r, idx) => (
                <div
                  key={idx}
                  className={`px-2.5 py-1.5 rounded-lg border ${
                    r.type === 'error'
                      ? 'bg-red-500/[0.06] border-red-500/15'
                      : 'bg-white/[0.04] border-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 text-[9px] font-bold ${
                      r.type === 'done'
                        ? 'bg-accent/20 text-accent'
                        : r.type === 'skip'
                        ? 'bg-white/10 text-white/40'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {r.type === 'done' ? '✓' : r.type === 'skip' ? '→' : '✕'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white truncate">{r.name}</div>
                      <div className="text-[10px] text-white/40 truncate">{r.artist}</div>
                    </div>
                    {r.type === 'done' && r.mode === 'extended' && (
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-accent/15 text-accent border border-accent/30 flex-shrink-0">
                        Ext
                      </span>
                    )}
                  </div>
                  {r.type === 'error' && r.error && (
                    <div className="mt-1 ml-6 text-[10px] text-red-400/80 font-mono break-all leading-relaxed">
                      {r.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Spinner + current track while active */}
          {active && (
            <div className="flex items-center gap-2.5 text-xs text-white/50">
              <div className="w-3.5 h-3.5 rounded-full border-2 border-white/10 border-t-white/50 animate-spin flex-shrink-0" />
              {results?.length
                ? `Processing track ${processed + 1} of ${total}…`
                : 'Starting…'}
            </div>
          )}

          {/* Cancel / Dismiss */}
          <div className="mt-3 flex gap-2">
            {active && (
              <button
                type="button"
                onClick={cancelDownload}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Cancel
              </button>
            )}
            {(isComplete || error) && (
              <button
                type="button"
                onClick={dismissPopup}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

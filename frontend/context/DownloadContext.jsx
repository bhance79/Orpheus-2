import { createContext, useCallback, useContext, useRef, useState } from 'react'

const DownloadContext = createContext(null)

export function DownloadProvider({ children }) {
  const [dlState, setDlState] = useState(null)
  // dlState shape: { playlistName, total, results, error, active, minimized }
  const readerRef = useRef(null)

  const startDownload = useCallback(async ({ playlist, outputFolder, djMode }) => {
    if (readerRef.current) return // already downloading

    setDlState({
      playlistName: playlist.name,
      total: 0,
      results: [],
      error: null,
      active: true,
      minimized: false,
    })

    try {
      const res = await fetch('/api/usbpod/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlist_id: playlist.id,
          output_folder: outputFolder,
          dj_mode: djMode,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setDlState(prev => prev ? { ...prev, error: err.error || 'Failed to start download', active: false } : prev)
        return
      }

      const reader = res.body.getReader()
      readerRef.current = reader
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === 'total') {
              setDlState(prev => prev ? { ...prev, total: event.total } : prev)
            } else if (['done', 'skip', 'error'].includes(event.type)) {
              setDlState(prev => prev ? { ...prev, results: [...prev.results, event] } : prev)
            } else if (event.type === 'complete') {
              setDlState(prev => prev ? { ...prev, active: false } : prev)
            }
          } catch {
            // skip malformed line
          }
        }
      }
    } catch (err) {
      setDlState(prev => prev ? { ...prev, error: err.message || 'Download failed', active: false } : prev)
    } finally {
      readerRef.current = null
      setDlState(prev => prev ? { ...prev, active: false } : prev)
    }
  }, [])

  const cancelDownload = useCallback(() => {
    readerRef.current?.cancel()
    readerRef.current = null
    setDlState(prev => prev ? { ...prev, active: false } : prev)
  }, [])

  const dismissPopup = useCallback(() => setDlState(null), [])

  const toggleMinimized = useCallback(() => {
    setDlState(prev => prev ? { ...prev, minimized: !prev.minimized } : prev)
  }, [])

  return (
    <DownloadContext.Provider value={{ dlState, startDownload, cancelDownload, dismissPopup, toggleMinimized }}>
      {children}
    </DownloadContext.Provider>
  )
}

export function useDownload() {
  return useContext(DownloadContext)
}

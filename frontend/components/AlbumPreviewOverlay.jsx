import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import SpotlightEffect from './SpotlightEffect'

function AlbumPreviewOverlay({ track, onClose }) {
  const [albumDetails, setAlbumDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  const albumName = albumDetails?.name || track?.album || track?.name || 'Album name'
  const albumYear = albumDetails?.release_year || track?.album_year || 'year'
  const artists = (albumDetails?.artists && albumDetails.artists.join(', ')) || track?.artists || 'artist'
  const cover = albumDetails?.cover || track?.cover

  useEffect(() => {
    if (!track) {
      setAlbumDetails(null)
      setError(null)
      setLoading(false)
      return
    }

    if (!track.album_id) {
      setAlbumDetails(null)
      setError('Album details unavailable')
      setLoading(false)
      return
    }

    let isMounted = true
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/albums/${track.album_id}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to load album')
        }
        if (isMounted) {
          setAlbumDetails(data.album || null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err.name === 'AbortError') return
          setError(err.message || 'Unable to load album')
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false)
        }
      })

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [track])

  if (!track || !portalTarget) {
    return null
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  const tracklist = albumDetails?.tracks || []
  const totalTracks = tracklist.length
  const midpoint = Math.ceil(totalTracks / 2)
  const column1 = tracklist.slice(0, midpoint)
  const column2 = tracklist.slice(midpoint)

  const overlayStyle = {
    position: 'fixed',
    inset: 0,
    zIndex: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem',
  }

  const cardContentStyle = {
    display: 'flex',
    gap: '3rem',
    position: 'relative',
  }

  const closeButtonStyle = {
    position: 'absolute',
    top: '0.5rem',
    right: '0.5rem',
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '1.25rem',
    cursor: 'pointer',
    padding: '0.25rem',
    lineHeight: 1,
  }

  const coverContainerStyle = {
    flexShrink: 0,
    width: '500px',
    height: '500px',
  }

  const coverStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '12px',
    backgroundColor: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
    fontSize: '0.875rem',
    overflow: 'hidden',
  }

  const coverImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  const infoStyle = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  }

  const titleStyle = {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
    marginBottom: '0.75rem',
    paddingRight: '2rem',
  }

  const artistStyle = {
    color: '#d1d5db',
    margin: 0,
    marginBottom: '0.5rem',
    fontSize: '2rem',
  }

  const yearStyle = {
    color: '#d1d5db',
    margin: 0,
    marginBottom: '2.5rem',
    fontSize: '1rem',
  }

  const tracklistLabelStyle = {
    color: '#d1d5db',
    margin: 0,
    marginBottom: '1.25rem',
    fontSize: '1.5rem',
  }

  const columnsContainerStyle = {
    display: 'flex',
    gap: '3rem',
  }

  const columnStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }

  const trackRowStyle = {
    display: 'flex',
    gap: '0.75rem',
    color: '#9ca3af',
    fontSize: '1.25rem',
  }

  if (loading) {
    return createPortal(
      <div style={overlayStyle} onClick={handleBackdropClick}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '2px solid rgba(255,255,255,0.2)',
            borderTopColor: 'rgba(255,255,255,0.7)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Loading album...</div>
        </div>
      </div>,
      portalTarget
    )
  }

  return createPortal(
    <div style={overlayStyle} onClick={handleBackdropClick}>
      <SpotlightEffect spotlightColor="rgba(0, 82, 255, 0.25)">
        <div style={cardContentStyle}>
          <button
            type="button"
            style={closeButtonStyle}
            onClick={onClose}
            aria-label="Close album preview"
          >
            ×
          </button>

          <div style={coverContainerStyle}>
            <div style={coverStyle}>
              {cover ? (
                <img src={cover} alt={`${albumName} cover art`} style={coverImageStyle} />
              ) : (
                'album cover'
              )}
            </div>
          </div>

          <div style={infoStyle}>
            <h2 style={titleStyle}>{albumName}</h2>
            <p style={artistStyle}>{artists}</p>
            <p style={yearStyle}>{albumYear}</p>

            <p style={tracklistLabelStyle}>Tracklist</p>

            {error ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{error}</div>
            ) : totalTracks === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Tracklist unavailable.</div>
            ) : (
              <div style={columnsContainerStyle}>
                <div style={columnStyle}>
                  {column1.map((item) => (
                    <div key={item.id || `${item.number}-${item.name}`} style={trackRowStyle}>
                      <span>{item.number}.</span>
                      <span>{item.name}</span>
                    </div>
                  ))}
                </div>
                {column2.length > 0 && (
                  <div style={columnStyle}>
                    {column2.map((item) => (
                      <div key={item.id || `${item.number}-${item.name}`} style={trackRowStyle}>
                        <span>{item.number}.</span>
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </SpotlightEffect>
    </div>,
    portalTarget
  )
}

export default AlbumPreviewOverlay

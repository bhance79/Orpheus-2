import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import SpotlightEffect from './SpotlightEffect'

function ArtistPreviewOverlay({ artist, onClose }) {
  const [artistDetails, setArtistDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const portalTarget = typeof document !== 'undefined' ? document.body : null

  const artistName = artistDetails?.name || artist?.name || 'Artist name'
  const artistImage = artistDetails?.image || artist?.image
  const genres = artistDetails?.genres || artist?.genres || []
  const followers = artistDetails?.followers
  const popularity = artistDetails?.popularity || artist?.popularity

  useEffect(() => {
    if (!artist) {
      setArtistDetails(null)
      setError(null)
      setLoading(false)
      return
    }

    if (!artist.id) {
      setArtistDetails(null)
      setError('Artist details unavailable')
      setLoading(false)
      return
    }

    let isMounted = true
    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetch(`/api/artists/${artist.id}`, { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || 'Failed to load artist')
        }
        if (isMounted) {
          setArtistDetails(data.artist || null)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (err.name === 'AbortError') return
          setError(err.message || 'Unable to load artist')
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
  }, [artist])

  if (!artist || !portalTarget) {
    return null
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  const topTracks = artistDetails?.top_tracks || []
  const totalTracks = topTracks.length
  const midpoint = Math.ceil(totalTracks / 2)
  const column1 = topTracks.slice(0, midpoint)
  const column2 = topTracks.slice(midpoint)

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

  const imageContainerStyle = {
    flexShrink: 0,
    width: '500px',
    height: '500px',
  }

  const imageStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    backgroundColor: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
    fontSize: '0.875rem',
    overflow: 'hidden',
  }

  const artistImageStyle = {
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

  const nameStyle = {
    fontSize: '3.5rem',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
    marginBottom: '0.75rem',
    paddingRight: '2rem',
  }

  const genresStyle = {
    color: '#d1d5db',
    margin: 0,
    marginBottom: '0.5rem',
    fontSize: '1.5rem',
  }

  const statsStyle = {
    color: '#9ca3af',
    margin: 0,
    marginBottom: '2.5rem',
    fontSize: '1rem',
    display: 'flex',
    gap: '1.5rem',
  }

  const topTracksLabelStyle = {
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
    alignItems: 'center',
  }

  const trackLinkStyle = {
    color: '#9ca3af',
    textDecoration: 'none',
    transition: 'color 0.2s',
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
          <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>Loading artist...</div>
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
            aria-label="Close artist preview"
          >
            ×
          </button>

          <div style={imageContainerStyle}>
            <div style={imageStyle}>
              {artistImage ? (
                <img src={artistImage} alt={`${artistName} profile`} style={artistImageStyle} />
              ) : (
                'artist image'
              )}
            </div>
          </div>

          <div style={infoStyle}>
            <h2 style={nameStyle}>{artistName}</h2>
            {genres.length > 0 && (
              <p style={genresStyle}>{genres.slice(0, 3).join(', ')}</p>
            )}
            <div style={statsStyle}>
              {followers && (
                <span>{followers.toLocaleString()} followers</span>
              )}
              {popularity !== undefined && (
                <span>Popularity: {popularity}/100</span>
              )}
            </div>

            <p style={topTracksLabelStyle}>Top Tracks</p>

            {error ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{error}</div>
            ) : totalTracks === 0 ? (
              <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Top tracks unavailable.</div>
            ) : (
              <div style={columnsContainerStyle}>
                <div style={columnStyle}>
                  {column1.map((track, index) => (
                    <div key={track.id || `${index}-${track.name}`} style={trackRowStyle}>
                      <span>{index + 1}.</span>
                      {track.url ? (
                        <a
                          href={track.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={trackLinkStyle}
                          onMouseEnter={(e) => e.target.style.color = '#fff'}
                          onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                        >
                          {track.name}
                        </a>
                      ) : (
                        <span>{track.name}</span>
                      )}
                    </div>
                  ))}
                </div>
                {column2.length > 0 && (
                  <div style={columnStyle}>
                    {column2.map((track, index) => {
                      const trackNumber = midpoint + index + 1
                      return (
                        <div key={track.id || `${trackNumber}-${track.name}`} style={trackRowStyle}>
                          <span>{trackNumber}.</span>
                          {track.url ? (
                            <a
                              href={track.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={trackLinkStyle}
                              onMouseEnter={(e) => e.target.style.color = '#fff'}
                              onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
                            >
                              {track.name}
                            </a>
                          ) : (
                            <span>{track.name}</span>
                          )}
                        </div>
                      )
                    })}
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

export default ArtistPreviewOverlay

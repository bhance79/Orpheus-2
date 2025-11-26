import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import SpotlightEffect from './SpotlightEffect'
import AlbumPreviewOverlay from './AlbumPreviewOverlay'

function ArtistPreviewOverlay({ artist, onClose }) {
  const [artistDetails, setArtistDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const albumsGridRef = useRef(null)

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

  useEffect(() => {
    const albumsGrid = albumsGridRef.current
    if (!albumsGrid) return

    let scrollTimeout
    const handleWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault()

        // Clear any existing scroll timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout)
        }

        // Calculate new scroll position
        const scrollAmount = e.deltaY * 3.5
        const newScrollLeft = albumsGrid.scrollLeft + scrollAmount

        // Use scrollTo for smooth scrolling
        albumsGrid.scrollTo({
          left: newScrollLeft,
          behavior: 'smooth'
        })

        // Debounce to allow smooth scrolling to complete
        scrollTimeout = setTimeout(() => {
          scrollTimeout = null
        }, 100)
      }
    }

    albumsGrid.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      albumsGrid.removeEventListener('wheel', handleWheel)
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [artistDetails])

  if (!artist || !portalTarget) {
    return null
  }

  const handleBackdropClick = (event) => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  const albums = artistDetails?.albums || []

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

  const discographyLabelStyle = {
    color: '#d1d5db',
    margin: 0,
    marginBottom: '1.25rem',
    fontSize: '1.5rem',
  }

  const albumsGridStyle = {
    display: 'flex',
    gap: '1rem',
    overflowX: 'auto',
    overflowY: 'hidden',
    paddingBottom: '0.5rem',
    scrollbarWidth: 'thin',
    scrollbarColor: '#4b5563 transparent',
    maxWidth: 'calc(200px * 3 + 1rem * 2)',
    scrollBehavior: 'smooth',
    scrollSnapType: 'x mandatory',
  }

  const albumItemStyle = {
    flexShrink: 0,
    width: '200px',
    cursor: 'pointer',
    scrollSnapAlign: 'start',
  }

  const albumCoverStyle = {
    width: '200px',
    height: '200px',
    borderRadius: '0.5rem',
    overflow: 'hidden',
    backgroundColor: '#9ca3af',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4b5563',
    fontSize: '0.875rem',
    transition: 'transform 0.2s',
    marginBottom: '0.5rem',
  }

  const albumImageStyle = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  const albumNameStyle = {
    color: '#d1d5db',
    fontSize: '0.875rem',
    fontWeight: '500',
    marginBottom: '0.25rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }

  const albumYearStyle = {
    color: '#9ca3af',
    fontSize: '0.75rem',
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

  return (
    <>
      {createPortal(
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
                    <span>{followers.toLocaleString()} monthly listeners</span>
                  )}
                </div>

                <p style={discographyLabelStyle}>Discography</p>

                {error ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{error}</div>
                ) : albums.length === 0 ? (
                  <div style={{ color: '#9ca3af', fontSize: '0.875rem' }}>Discography unavailable.</div>
                ) : (
                  <div ref={albumsGridRef} style={albumsGridStyle}>
                    {albums.map((album) => {
                      const releaseYear = album.release_date ? album.release_date.substring(0, 4) : ''
                      return (
                        <div
                          key={album.id || album.name}
                          style={albumItemStyle}
                          onClick={() => setSelectedAlbum(album)}
                        >
                          <div
                            style={albumCoverStyle}
                            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                          >
                            {album.cover ? (
                              <img src={album.cover} alt={album.name} style={albumImageStyle} />
                            ) : (
                              'album cover'
                            )}
                          </div>
                          <div style={albumNameStyle} title={album.name}>
                            {album.name}
                          </div>
                          {releaseYear && (
                            <div style={albumYearStyle}>{releaseYear}</div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </SpotlightEffect>
        </div>,
        portalTarget
      )}

      {selectedAlbum && (
        <AlbumPreviewOverlay
          track={{
            album_id: selectedAlbum.id,
            album: selectedAlbum.name,
            cover: selectedAlbum.cover,
            url: selectedAlbum.url,
          }}
          onClose={() => setSelectedAlbum(null)}
        />
      )}
    </>
  )
}

export default ArtistPreviewOverlay

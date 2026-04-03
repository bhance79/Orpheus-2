import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import useEmblaCarousel from 'embla-carousel-react'
import SpotlightEffect from '../ui/SpotlightEffect'
import AlbumPreviewOverlay from './AlbumPreviewOverlay'

function ArtistPreviewOverlay({ artist, onClose }) {
  const [artistDetails, setArtistDetails] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedAlbum, setSelectedAlbum] = useState(null)
  const [bioVisible, setBioVisible] = useState(false)
  const [bio, setBio] = useState(null)
  const [bioLoading, setBioLoading] = useState(false)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', dragFree: true })

  const handleImageClick = async () => {
    setBioVisible(v => !v)
    if (!bio && !bioLoading && artist?.id) {
      setBioLoading(true)
      try {
        const res = await fetch(`/api/artists/${artist.id}/bio`)
        const data = await res.json()
        setBio(data.ok && data.bio ? data.bio : 'No biography available for this artist.')
      } catch {
        setBio('Could not load biography.')
      } finally {
        setBioLoading(false)
      }
    }
  }

  useEffect(() => {
    if (!emblaApi) return
    const viewport = emblaApi.rootNode()
    if (!viewport) return
    let cooldown = null
    let inCooldown = false
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        if (inCooldown) return
        if (Math.abs(e.deltaX) > 5) {
          e.deltaX > 0 ? emblaApi.scrollNext() : emblaApi.scrollPrev()
          inCooldown = true
          if (cooldown) clearTimeout(cooldown)
          cooldown = setTimeout(() => { inCooldown = false }, 800)
        }
      }
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => { viewport.removeEventListener('wheel', onWheel); if (cooldown) clearTimeout(cooldown) }
  }, [emblaApi])

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi])
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi])

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
    gap: '2rem',
    position: 'relative',
    maxWidth: '1100px',
    width: '100%',
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
    width: '550px',
    height: '550px',
  }

  const imageStyle = {
    width: '100%',
    height: '100%',
    borderRadius: '20px',
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
    fontSize: '2.5rem',
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
          <SpotlightEffect spotlightColor="rgba(255, 255, 255, 0.12)">
            <div style={cardContentStyle}>
              <button
                type="button"
                style={closeButtonStyle}
                onClick={onClose}
                aria-label="Close artist preview"
              >
                ×
              </button>

              <div style={{ ...imageContainerStyle, position: 'relative', cursor: 'pointer', flexShrink: 0 }} onClick={handleImageClick}>
                <div style={{ ...imageStyle, transition: 'filter 0.4s ease', filter: bioVisible ? 'blur(4px) brightness(0.25)' : 'none' }}>
                  {artistImage ? (
                    <img src={artistImage} alt={`${artistName} profile`} style={artistImageStyle} />
                  ) : (
                    'artist image'
                  )}
                </div>
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: '20px',
                  padding: '1.25rem', overflowY: 'auto',
                  opacity: bioVisible ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: bioVisible ? 'auto' : 'none',
                  display: 'flex', flexDirection: 'column', gap: '0.75rem',
                }}>
                  <p style={{ fontSize: '0.7rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', margin: 0 }}>Biography</p>
                  {bioLoading ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                      <div style={{ width: '28px', height: '28px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'rgba(255,255,255,0.7)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    </div>
                  ) : (
                    <p style={{ fontSize: '1rem', lineHeight: 1.7, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{bio}</p>
                  )}
                  <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', margin: 0 }}>Click to close</p>
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
                  <div style={{ position: 'relative' }}>
                    <div style={{ overflow: 'hidden' }} ref={emblaRef}>
                      <div style={{ display: 'flex', gap: '1rem' }}>
                        {albums.map((album) => {
                          const releaseYear = album.release_date ? album.release_date.substring(0, 4) : ''
                          return (
                            <div
                              key={album.id || album.name}
                              style={{ flex: '0 0 180px', cursor: 'pointer' }}
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
                              <div style={albumNameStyle} title={album.name}>{album.name}</div>
                              {releaseYear && <div style={albumYearStyle}>{releaseYear}</div>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {albums.length > 3 && (
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                        <button
                          type="button"
                          onClick={scrollPrev}
                          aria-label="Previous albums"
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={scrollNext}
                          aria-label="Next albums"
                          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', flexShrink: 0 }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    )}
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

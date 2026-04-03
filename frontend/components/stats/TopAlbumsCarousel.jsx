import { useState, useEffect, useCallback } from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import CustomSelect from '../ui/CustomSelect'
import AlbumPreviewOverlay from '../overlays/AlbumPreviewOverlay'

function TopAlbumsCarousel({ albums, activeRange, rangeOptions, rangeLabels, onRangeChange, onShowMore, canShowMore }) {
  const displayAlbums = (albums || []).slice(0, 20)
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: 'start', dragFree: false })
  const [previewAlbum, setPreviewAlbum] = useState(null)

  useEffect(() => {
    if (!emblaApi) return
    const viewport = emblaApi.rootNode()
    if (!viewport) return
    let cooldownTimeout = null
    let isInCooldown = false
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault()
        if (isInCooldown) return
        if (Math.abs(e.deltaX) > 5) {
          if (e.deltaX > 0) emblaApi.scrollNext()
          else emblaApi.scrollPrev()
          isInCooldown = true
          if (cooldownTimeout) clearTimeout(cooldownTimeout)
          cooldownTimeout = setTimeout(() => { isInCooldown = false }, 1000)
        }
      }
    }
    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      viewport.removeEventListener('wheel', onWheel)
      if (cooldownTimeout) clearTimeout(cooldownTimeout)
    }
  }, [emblaApi])

  const scrollPrev = useCallback(() => { if (emblaApi) emblaApi.scrollPrev() }, [emblaApi])
  const scrollNext = useCallback(() => { if (emblaApi) emblaApi.scrollNext() }, [emblaApi])

  return (
    <div className="top-album-card">
      <div className="flex items-center justify-between mb-3">
        <p className="feature-label m-0">Top Albums</p>
        <div className="flex items-center gap-2">
          <CustomSelect
            value={activeRange}
            onChange={onRangeChange}
            options={rangeOptions}
            labels={rangeLabels}
          />
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

      {displayAlbums.length === 0 ? (
        <div className="text-sm text-gray-400">No album data available.</div>
      ) : (
        <div className="top-album-carousel-wrapper">
          <div className="top-artists-carousel__viewport" ref={emblaRef}>
            <div className="top-artists-carousel__container">
              {displayAlbums.map((album, index) => (
                <div className="top-artists-carousel__slide" key={album.id || index}>
                  <div className="top-album-slide">
                    <button
                      type="button"
                      className="top-album-cover"
                      onClick={() => setPreviewAlbum({ album: album.name, album_year: album.year, artists: album.artists, cover: album.cover, album_id: album.id, url: album.url })}
                    >
                      {album.cover ? (
                        <img src={album.cover} alt={album.name} />
                      ) : (
                        <span className="text-[10px] uppercase tracking-widest text-white/30">No art</span>
                      )}
                    </button>
                    <div className="top-album-info">
                      <p className="top-album-name">{album.name}</p>
                      <p className="top-album-artist">{album.artists}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="top-artists-carousel__nav" style={{ visibility: displayAlbums.length > 1 ? 'visible' : 'hidden' }}>
            <button type="button" onClick={scrollPrev} aria-label="Previous album">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button type="button" onClick={scrollNext} aria-label="Next album">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
      {previewAlbum && <AlbumPreviewOverlay track={previewAlbum} onClose={() => setPreviewAlbum(null)} />}
    </div>
  )
}

export default TopAlbumsCarousel

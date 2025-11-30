import { useState, useEffect, useRef, useCallback } from 'react'

const sortByName = (arr = []) =>
  [...arr].sort((a, b) => (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base' }))

export function usePlaylists(options = {}) {
  const {
    paginated = false,
    pageSize = 50,
    ownedOnly = false
  } = options

  const [playlists, setPlaylists] = useState([])
  const [ownedPlaylists, setOwnedPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)

  const fetchPlaylists = useCallback(async ({ append = false } = {}) => {
    const targetOffset = paginated ? (append ? offsetRef.current : 0) : 0
    if (!append) {
      offsetRef.current = targetOffset
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = new URLSearchParams()
      if (paginated) {
        params.set('limit', String(pageSize))
        params.set('offset', String(targetOffset))
        if (ownedOnly) {
          params.set('owned_only', 'true')
        }
      }
      const qs = params.toString()
      const res = await fetch(`/api/playlists${qs ? `?${qs}` : ''}`)
      const data = await res.json()

      if (!data.ok) {
        throw new Error(data.error || 'Failed to fetch playlists')
      }

      const nextAll = Array.isArray(data.playlists) ? data.playlists : []
      const nextOwned = Array.isArray(data.owned_playlists) ? data.owned_playlists : []

      setPlaylists(prev => {
        const merged = append ? [...prev, ...nextAll] : nextAll
        return paginated ? sortByName(merged) : merged
      })

      setOwnedPlaylists(prev => {
        const merged = append ? [...prev, ...nextOwned] : nextOwned
        return paginated ? sortByName(merged) : merged
      })

      if (paginated) {
        setHasMore(Boolean(data.has_more))
        offsetRef.current = typeof data.next_offset === 'number'
          ? data.next_offset
          : targetOffset + pageSize
      } else {
        setHasMore(false)
        offsetRef.current = 0
      }

      setError(null)
    } catch (err) {
      setError(err.message || String(err))
    } finally {
      if (append) {
        setLoadingMore(false)
      } else {
        setLoading(false)
      }
    }
  }, [paginated, pageSize, ownedOnly])

  useEffect(() => {
    fetchPlaylists()
  }, [fetchPlaylists])

  const refetch = useCallback(() => fetchPlaylists({ append: false }), [fetchPlaylists])

  const loadMore = useCallback(() => {
    if (!paginated || loading || loadingMore || !hasMore) {
      return Promise.resolve()
    }
    return fetchPlaylists({ append: true })
  }, [paginated, loading, loadingMore, hasMore, fetchPlaylists])

  return {
    playlists,
    ownedPlaylists,
    loading,
    loadingMore,
    hasMore,
    error,
    refetch,
    loadMore
  }
}

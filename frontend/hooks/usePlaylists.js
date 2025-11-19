import { useState, useEffect } from 'react'

export function usePlaylists() {
  const [playlists, setPlaylists] = useState([])
  const [ownedPlaylists, setOwnedPlaylists] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists')
      const data = await res.json()

      if (data.ok) {
        setPlaylists(data.playlists || [])
        setOwnedPlaylists(data.owned_playlists || [])
      } else {
        setError(data.error || 'Failed to fetch playlists')
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setLoading(false)
    }
  }

  return { playlists, ownedPlaylists, loading, error, refetch: fetchPlaylists }
}
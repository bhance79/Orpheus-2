import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ViewPlaylists from './pages/ViewPlaylists'
import FilterSweep from './pages/FilterSweep'
import CrateDigger from './pages/CrateDigger'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [user, setUser] = useState(null)
  const [statsData, setStatsData] = useState(null)

  useEffect(() => {
    // Check authentication status by trying to fetch user stats
    fetch('/api/user-stats')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setIsAuthenticated(true)
          setStatsData(data) // Cache the stats data
          setUser(data.user || null)
        } else {
          setIsAuthenticated(false)
        }
      })
      .catch(() => {
        setIsAuthenticated(false)
      })
  }, [])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="spinner"></div>
          <p className="mt-4 text-text-secondary">Loading...</p>
        </div>
      </div>
    )
  }

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <Login />
  }

  // Authenticated - show main app
  return (
    <Router>
      <Layout user={user}>
        <Routes>
          <Route path="/" element={<Dashboard initialData={statsData} />} />
          <Route path="/view-playlists" element={<ViewPlaylists />} />
          <Route path="/filter-sweep" element={<FilterSweep />} />
          <Route path="/cratedigger" element={<CrateDigger />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

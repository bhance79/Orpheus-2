import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ViewTracks from './pages/ViewTracks'
import RemoveDuplicates from './pages/RemoveDuplicates'
import FilterSweep from './pages/FilterSweep'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Check authentication status by trying to fetch user stats
    fetch('/api/user-stats')
      .then(res => res.json())
      .then(data => {
        if (data.ok) {
          setIsAuthenticated(true)
          // We don't get user info from this endpoint, but we know they're authenticated
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
          <Route path="/" element={<Dashboard />} />
          <Route path="/view-tracks" element={<ViewTracks />} />
          <Route path="/remove-duplicates" element={<RemoveDuplicates />} />
          <Route path="/filter-sweep" element={<FilterSweep />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App

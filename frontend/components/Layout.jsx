import { Link, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'

const ColorBends = lazy(() => import('./ColorBends'))

function Layout({ children, user }) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'home-icon-w.png' },
    { path: '/view-tracks', label: 'View Tracks', icon: 'playlist-view-w.png' },
    { path: '/remove-duplicates', label: 'Remove Duplicates', icon: 'remove-dupes-w.png' },
    { path: '/filter-sweep', label: 'Filter Sweep', icon: 'sweep-icon-w.png' },
  ]

  return (
    <div className="app-layout">
      <div className="color-bends-wrapper" aria-hidden="true">
        <Suspense fallback={null}>
          <ColorBends transparent />
        </Suspense>
      </div>
      <main className="main-content">
        <div className="dashboard-panel">
          {/* Navigation Bar inside panel */}
          <header className="panel-navbar">
            <div className="navbar-left">
              {/* Logo/Brand */}
              <Link to="/" className="navbar-brand">
                <img src="/static/icons/home-icon-w.png" alt="Orpheus Logo" className="navbar-logo" />
                <span className="navbar-title">Orpheus</span>
              </Link>

              {/* Navigation Items */}
              <div className="navbar-group">
                <nav className="navbar-nav">
                  {navItems.map(item => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`navbar-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                      <span className="navbar-label">{item.label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
            </div>

            {/* User & Logout */}
            <div className="navbar-right">
              <span className="navbar-user">Welcome, {user?.name || 'User'}</span>
              <a href="/logout" className="navbar-item navbar-logout">
                <span className="navbar-label">Logout</span>
              </a>
            </div>
          </header>

          {/* Page Content */}
          <div className="panel-content">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default Layout

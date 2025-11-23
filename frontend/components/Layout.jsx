import { Link, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import PillNav from './PillNav'

const ColorBends = lazy(() => import('./ColorBends'))

function Layout({ children, user }) {
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'home-icon-w.png' },
    { path: '/view-tracks', label: 'View Tracks', icon: 'playlist-view-w.png' },
    { path: '/remove-duplicates', label: 'Remove Duplicates', icon: 'remove-dupes-w.png' },
    { path: '/cratedigger', label: 'CrateDigger', icon: 'playlist-view-w.png' },
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
            </div>

            {/* Centered Navigation Items */}
            <div className="navbar-center">
              <PillNav
                items={navItems.map(item => ({
                  label: item.label,
                  href: item.path
                }))}
                activeHref={location.pathname}
                className="glass-nav"
                ease="power2.easeOut"
                baseColor="rgba(255, 255, 255, 0.1)"
                pillColor="rgba(15, 23, 42, 0.3)"
                hoveredPillTextColor="#000000"
                pillTextColor="#ffffff"
                initialLoadAnimation={false}
              />
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

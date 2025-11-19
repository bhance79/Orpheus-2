import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

function Layout({ children, user }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(false)
  const location = useLocation()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'home-icon-w.png' },
    { path: '/view-tracks', label: 'View Tracks', icon: 'playlist-view-w.png' },
    { path: '/remove-duplicates', label: 'Remove Duplicates', icon: 'remove-dupes-w.png' },
    { path: '/filter-sweep', label: 'Filter Sweep', icon: 'sweep-icon-w.png' },
  ]

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside
        className={`sidebar ${sidebarExpanded ? 'expanded' : ''}`}
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
      >
        {/* Logo/Brand */}
        <div className="sidebar-header">
          <div className="sidebar-icon">
            <img src="/static/icons/home-icon-w.png" alt="Orpheus Logo" />
          </div>
          <div className="sidebar-text">Orpheus</div>
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              <div className="sidebar-icon">
                <img src={`/static/icons/${item.icon}`} alt={item.label} />
              </div>
              <div className="sidebar-text">{item.label}</div>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="sidebar-footer">
          <a href="/logout" className="sidebar-item">
            <div className="sidebar-icon">
              <img src="/static/icons/logout-w.png" alt="Logout" />
            </div>
            <div className="sidebar-text">Logout</div>
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        <header className="top-bar">
          <div className="user-info">
            <h1>
              <Link to="/" className="home-link">
                Welcome back, {user?.name || 'User'}
              </Link>
            </h1>
          </div>
        </header>

        {children}
      </div>

      {/* Icon Attribution Footer */}
      <footer className="icon-attribution fixed bottom-2 right-2 text-xs text-text-muted">
        <div className="attribution-text">
          Logout Icon made by{' '}
          <a href="https://icons8.com/icon/VTOU0AOwSnkY/logout" className="text-primary hover:text-primary-hover">
            Icons8
          </a>
        </div>
      </footer>
    </div>
  )
}

export default Layout

import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'

function NavigationLoader() {
  const location = useLocation()
  const [visible, setVisible] = useState(false)
  const hideTimer = useRef(null)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname === prevPath.current) return
    prevPath.current = location.pathname

    clearTimeout(hideTimer.current)
    setVisible(true)

    hideTimer.current = setTimeout(() => setVisible(false), 500)

    return () => clearTimeout(hideTimer.current)
  }, [location.pathname])

  return <div className={`nav-progress-bar${visible ? ' nav-progress-bar--active' : ''}`} />
}

export default NavigationLoader

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

function CustomSelect({ value, onChange, options, labels }) {
  const [open, setOpen] = useState(false)
  const [menuStyle, setMenuStyle] = useState({})
  const btnRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      const insideButton = btnRef.current && btnRef.current.closest('.genre-custom-select').contains(e.target)
      const insideMenu = menuRef.current && menuRef.current.contains(e.target)
      if (!insideButton && !insideMenu) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = () => {
    if (btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setMenuStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      })
    }
    setOpen(o => !o)
  }

  return (
    <div className="genre-custom-select">
      <button ref={btnRef} type="button" className="genre-dropdown" onClick={handleOpen}>
        {labels[value] || value}
        <svg className="genre-dropdown-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && createPortal(
        <div ref={menuRef} className="genre-dropdown-menu" style={menuStyle}>
          {options.map(opt => (
            <button
              key={opt}
              type="button"
              className={`genre-dropdown-item ${opt === value ? 'genre-dropdown-item--active' : ''}`}
              onClick={() => { onChange(opt); setOpen(false) }}
            >
              {labels[opt] || opt}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default CustomSelect

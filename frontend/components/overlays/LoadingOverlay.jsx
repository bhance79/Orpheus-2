function LoadingOverlay({ message = 'Loading...' }) {
  return (
    <div className="overlay visible">
      <div className="overlay-content">
        <div className="spinner" aria-hidden="true"></div>
        <div className="overlay-text">{message}</div>
      </div>
    </div>
  )
}

export default LoadingOverlay
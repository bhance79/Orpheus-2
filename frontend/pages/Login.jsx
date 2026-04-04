import { lazy, Suspense } from 'react'

const ColorBends = lazy(() => import('../components/ui/ColorBends'))

function Login() {
  return (
    <div className="app-layout">
      <div className="color-bends-wrapper" aria-hidden="true">
        <Suspense fallback={null}>
          <ColorBends transparent />
        </Suspense>
      </div>
      <main className="main-content main-content--centered">
        <div className="card max-w-xl w-full mx-4 text-center backdrop-blur-lg">
          <img src="/static/icons/orpheus-logo-header.png" alt="Orpheus 2.0" className="mx-auto mb-6 w-full h-auto" />
          <p className="text-text-secondary mb-8 text-justify w-full">
            A personal Spotify stats and playlist manager. Explore your top artists, tracks, genres, and albums — and manage your playlists all in one place.
          </p>
          <a href="/login" className="btn w-full block text-center">
            Login with Spotify
          </a>
        </div>
      </main>
    </div>
  )
}

export default Login

import { lazy, Suspense } from 'react'

const ColorBends = lazy(() => import('../components/ColorBends'))

function Login() {
  return (
    <div className="app-layout">
      <div className="color-bends-wrapper" aria-hidden="true">
        <Suspense fallback={null}>
          <ColorBends transparent />
        </Suspense>
      </div>
      <main className="main-content">
        <div className="card max-w-md w-full mx-4 text-center backdrop-blur-lg">
          <h1 className="text-3xl font-bold mb-6">Orpheus 2.0</h1>
          <p className="text-text-secondary mb-8">
            Manage your Spotify playlists with powerful tools
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

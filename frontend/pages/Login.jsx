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
      <main className="main-content main-content--centered">
        <div className="card max-w-md w-full mx-4 text-center backdrop-blur-lg">
          <img src="/static/icons/orpheusLogo.png" alt="Orpheus 2.0" className="mx-auto mb-6 h-32" />
          <p className="text-text-secondary mb-8">
            Made by me for me
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

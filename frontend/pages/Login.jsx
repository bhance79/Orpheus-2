function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-dark">
      <div className="card max-w-md w-full mx-4 text-center">
        <h1 className="text-3xl font-bold mb-6">Orpheus 2.0</h1>
        <p className="text-text-secondary mb-8">
          Manage your Spotify playlists with powerful tools
        </p>
        <a href="/login" className="btn w-full block text-center">
          Login with Spotify
        </a>
      </div>
    </div>
  )
}

export default Login

function CrateDigger() {
  return (
    <div className="dashboard-grid">
      <section className="dashboard-card" style={{ gridColumn: '1 / -1' }}>
        <p className="feature-label">CrateDigger</p>
        <h2 className="feature-title">CrateDigger Is On Pause</h2>
        <p className="feature-caption mb-6">
          Spotify retired the recommendations endpoint that powered this tool, so we&apos;ve put the feature on hold
          while we explore a replacement flow.
        </p>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white text-base mb-3">
            Thanks for checking back! We&apos;re designing a refreshed experience that will let you feed in your own
            “crate” of inspirations and get smart suggestions without relying on the deprecated API.
          </p>
          <p className="text-text-secondary text-sm">
            Keep an eye on release notes for updates. In the meantime, feel free to explore the other playlist tools in
            Orpheus.
          </p>
        </div>
      </section>
    </div>
  )
}

export default CrateDigger

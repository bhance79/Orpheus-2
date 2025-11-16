// static/app.js
document.addEventListener('DOMContentLoaded', () => {
  // ---------------- Overlay helpers ----------------
  const overlay = document.getElementById('sweep-overlay');
  const overlayMsg = overlay ? overlay.querySelector('.overlay-text') : null;
  const DEFAULT_OVERLAY_TEXT = overlayMsg ? overlayMsg.textContent : 'Loading...';

  const showOverlay = (msg) => {
    if (overlay) {
      if (overlayMsg && msg) overlayMsg.textContent = msg;
      overlay.classList.add('visible');
      overlay.setAttribute('aria-hidden', 'false');
    }
  };
  const hideOverlay = () => {
    if (overlay) {
      overlay.classList.remove('visible');
      overlay.setAttribute('aria-hidden', 'true');
      if (overlayMsg) overlayMsg.textContent = DEFAULT_OVERLAY_TEXT;
    }
  };

  // ---------------- Flash helper ----------------
  function showFlashMessage(msgHtml) {
    let flash = document.querySelector('.flash');
    const container = document.querySelector('.container');
    if (!flash) {
      flash = document.createElement('div');
      flash.className = 'flash';
      if (container) {
        const topBar = container.querySelector('.top-bar');
        if (topBar && topBar.nextSibling) {
          container.insertBefore(flash, topBar.nextSibling);
        } else {
          container.prepend(flash);
        }
      } else {
        document.body.prepend(flash);
      }
    }
    flash.innerHTML = `<div class="flash-item">${msgHtml}</div>`;
  }

  // ==========================================================
  //                 FILTER SWEEP (form submit)
  // ==========================================================
  const sweepForm = document.getElementById('filter-sweep-form');
  const sweepSubmitBtn = document.getElementById('filter-sweep-submit');

  if (sweepForm) {
    sweepForm.addEventListener('submit', () => {
      showOverlay('Sweeping playlists…');
      if (sweepSubmitBtn) {
        sweepSubmitBtn.disabled = true;
        sweepSubmitBtn.dataset.originalText = sweepSubmitBtn.textContent || 'Run Filter Sweep';
        sweepSubmitBtn.textContent = 'Sweeping…';
      }
    });
  }

  // ==========================================================
  //     PLAYLIST B (multi-select): counter + UX improvements
  // ==========================================================
  const selB = document.getElementById('playlist_b_id');
  const countEl = document.getElementById('playlist-b-count');

  function updateBCount() {
    if (!selB || !countEl) return;
    const count = selB.selectedOptions ? selB.selectedOptions.length : 0;
    countEl.textContent = `${count} selected`;
  }

  if (selB) {
    updateBCount();
    selB.addEventListener('change', updateBCount);
    selB.addEventListener('input', updateBCount); // keyboard support

    // Click-to-toggle (no Ctrl/Cmd)
    selB.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const option = e.target;
      if (option && option.tagName && option.tagName.toLowerCase() === 'option') {
        option.selected = !option.selected;
        selB.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Deselect All (class-based to avoid duplicate IDs)
  const deselectBtns = document.querySelectorAll('.deselect-all-btn');
  deselectBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!selB) return;
      for (const opt of selB.options) opt.selected = false;
      selB.dispatchEvent(new Event('change', { bubbles: true }));
    });
  });

  // ==========================================================
  //             INLINE "VIEW TRACKS" (AJAX render)
  // ==========================================================
  (function inlineViewTracks() {
    const form = document.getElementById('view-tracks-form');
    const select = document.getElementById('playlist_id');
    const card = document.getElementById('tracks-card');

    if (!form || !select || !card) return;

    function msToMinSec(ms) {
      if (ms == null) return '';
      const total = Math.round(ms / 1000);
      const m = Math.floor(total / 60);
      const s = String(total % 60).padStart(2, '0');
      return `${m}:${s}`;
    }

    function renderTracks(payload) {
      const { ok, playlist, tracks, error } = payload || {};
      if (!ok) {
        // keep card visible on error
        card.classList.remove('hidden');
        card.innerHTML = `<div class="flash"><div class="flash-item">Failed to load tracks${error ? `: ${error}` : ''}.</div></div>`;
        return;
      }

      // No longer need to hide Filter Sweep - Alpine handles view switching now

      const cover = playlist.image
        ? `<img src="${playlist.image}" alt="${playlist.name} cover" class="playlist-cover">`
        : '';

      const header = `
        <div class="card-header">
          <div class="card-title">
            ${cover}
            <div class="card-title-stack">
              <strong>${playlist.name}</strong>
              <span class="muted">by ${playlist.owner}</span>
            </div>
          </div>
          ${playlist.url ? `<a href="${playlist.url}" target="_blank" rel="noopener" class="btn btn-secondary">Open in Spotify</a>` : ''}
        </div>
      `;

      const rows = (tracks || []).map(t => `
        <tr>
          <td class="c-name">${t.url ? `<a href="${t.url}" target="_blank" rel="noopener">${t.name}</a>` : t.name}</td>
          <td class="c-artists">${t.artists || ''}</td>
          <td class="c-album">${t.album || ''}</td>
          <td class="c-added">${t.added_at ? new Date(t.added_at).toLocaleDateString() : ''}</td>
          <td class="c-duration">${msToMinSec(t.duration_ms)}</td>
        </tr>
      `).join('');

      const table = `
        <div class="table-wrap">
          <table class="tracks">
            <thead>
              <tr>
                <th>Track</th>
                <th>Artist(s)</th>
                <th>Album</th>
                <th>Added</th>
                <th>⏱</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;

      card.classList.remove('hidden');
      card.innerHTML = header + table;
    }

    form.addEventListener('submit', async (e) => {
      // Allow Shift+Enter to do a real submit as a progressive enhancement
      if (e.shiftKey) return;
      e.preventDefault();

      const id = select.value;
      if (!id) return;

      showOverlay('Loading tracks…');

      try {
        const res = await fetch(`/api/playlist/${encodeURIComponent(id)}`, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();
        renderTracks(data);
      } catch (err) {
        renderTracks({ ok: false, error: String(err) });
      } finally {
        hideOverlay();
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  })();

  // ==========================================================
  //          REMOVE DUPLICATES VIEW (check + confirm flow)
  // ==========================================================
  const checkDupBtn = document.getElementById('check-duplicates-btn');
  const dupPlaylistSelect = document.getElementById('duplicate_playlist_id');
  const dupResults = document.getElementById('duplicate-results');
  const noDupsMsg = document.getElementById('no-duplicates-msg');
  const dupsFound = document.getElementById('duplicates-found');
  const dupCount = document.getElementById('duplicate-count');
  const dupTracksList = document.getElementById('duplicate-tracks-list');
  const confirmRemoveBtn = document.getElementById('confirm-remove-duplicates');

  let currentDuplicatePlaylistId = null;

  if (checkDupBtn && dupPlaylistSelect) {
    checkDupBtn.addEventListener('click', async () => {
      const id = dupPlaylistSelect.value;
      if (!id) {
        showFlashMessage('Please select a playlist first.');
        return;
      }

      showOverlay('Checking for duplicates…');
      currentDuplicatePlaylistId = id;

      try {
        const res = await fetch(`/api/check-duplicates/${encodeURIComponent(id)}`, {
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();

        if (!data.ok) {
          if (data.error === 'playlist_not_owned') {
            showFlashMessage('You do not own this playlist!');
          } else {
            showFlashMessage(`Check failed: ${data.error || 'Unknown error'}`);
          }
          return;
        }

        // Show results section
        if (dupResults) dupResults.classList.remove('hidden');

        if (!data.has_duplicates) {
          // No duplicates found
          if (noDupsMsg) noDupsMsg.classList.remove('hidden');
          if (dupsFound) dupsFound.classList.add('hidden');
        } else {
          // Duplicates found
          if (noDupsMsg) noDupsMsg.classList.add('hidden');
          if (dupsFound) dupsFound.classList.remove('hidden');
          if (dupCount) dupCount.textContent = data.duplicate_count;

          // Render duplicate tracks list
          if (dupTracksList) {
            const html = data.duplicates.map(dup => `
              <div class="p-3 bg-gray-800 rounded">
                <div class="font-medium">${dup.track_name}</div>
                <div class="text-sm text-gray-400">${dup.artists}</div>
                <div class="text-sm text-yellow-400 mt-1">
                  Found ${dup.total_occurrences} times (${dup.duplicates_to_remove} duplicate${dup.duplicates_to_remove > 1 ? 's' : ''} will be removed)
                </div>
              </div>
            `).join('');
            dupTracksList.innerHTML = html;
          }
        }
      } catch (err) {
        showFlashMessage(`Check failed: ${String(err)}`);
      } finally {
        hideOverlay();
      }
    });
  }

  // Confirm removal button
  if (confirmRemoveBtn) {
    confirmRemoveBtn.addEventListener('click', async () => {
      if (!currentDuplicatePlaylistId) {
        showFlashMessage('No playlist selected.');
        return;
      }

      showOverlay('Removing duplicates…');

      try {
        const res = await fetch(`/api/remove-duplicates/${encodeURIComponent(currentDuplicatePlaylistId)}`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' }
        });
        const data = await res.json();

        if (!data.ok) {
          showFlashMessage(`Remove failed: ${data.error || 'Unknown error'}`);
        } else {
          showFlashMessage(`Successfully removed ${data.removed_count || 0} duplicate track(s) from "${data.playlist_name}".`);

          // Reset the view
          if (dupResults) dupResults.classList.add('hidden');
          if (dupPlaylistSelect) dupPlaylistSelect.value = '';
          currentDuplicatePlaylistId = null;
        }
      } catch (err) {
        showFlashMessage(`Remove failed: ${String(err)}`);
      } finally {
        hideOverlay();
      }
    });
  }
});

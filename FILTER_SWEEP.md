# Filter Sweep

Filter Sweep removes tracks from one playlist that already exist in one or more other playlists. It's built for keeping playlists distinct from each other.

![Filter Sweep](static/screenshots/FilterSweepUnchecked.PNG)


### How It Works

1. You pick a **Source Playlist** (Playlist A) — must be a playlist you own.
2. You pick one or more **Reference Playlists** (Playlist B) — can be any playlist you own or follow.
3. Filter Sweep finds every track in A that also appears in any of the B playlists.
4. Those tracks are removed from A.

The comparison is done by **Spotify URI** — it matches exact tracks only, not name variants.

---

### How I Use It

The intended use of this feature was made personally for my needs. Spotify has a personalized playlist *Discovery Weekly* that refreshes every Monday morning. I manually add all the tracks from *Discovery Weekly* to my own playlist called *CRATEDIGGER*. 
I then, at my own pace, check out the tracks from *CRATEDIGGER* and if I like the track, I'll add to my main playlists.
Then, I'll use *filter sweep* to cross reference any songs I already added to my main playlists so they can be removed from my discovery playlist.

---


### Selecting Playlists

![Selected playlists](static/screenshots/FilterSweep.PNG)

**Source Playlist (Playlist A)**
- Displayed as a horizontal scrollable carousel
- Searchable by name
- Single select only

**Reference Playlists (Playlist B)**
- Displayed as a searchable list with checkboxes
- Multi-select — pick as many as you want
- Selected playlists appear as chips below the list
- **Deselect All** button to clear your selection

---

### Results

![Results Sweeped](static/screenshots/FilterSweepSuccess.PNG)

After the sweep runs, a summary shows:
- How many tracks were removed from Playlist A
- A full list of removed tracks with:
  - Track name
  - Artist(s)
  - How many times the track appeared in Playlist A (if more than once, all copies are removed)


---

## Notes

- **All copies** of a matching track are removed from Playlist A (not just one occurrence).
- Filter Sweep only modifies Playlist A — your reference playlists are never changed.
- Playlist A must be owned by you. Reference playlists can be followed playlists.
- If there is no overlap between Playlist A and your selected references, no changes are made.



import { useState, useEffect, useRef } from 'react'
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

// Color palette for pie chart slices
const COLORS = [
  'hsl(250, 60%, 55%)',
  'hsl(235, 60%, 55%)',
  'hsl(220, 60%, 55%)',
  'hsl(205, 60%, 55%)',
  'hsl(190, 60%, 55%)',
  'hsl(175, 60%, 55%)',
  'hsl(160, 60%, 55%)',
  'hsl(145, 60%, 55%)',
]

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-elevated border border-white/20 rounded-lg px-3 py-2 shadow-xl">
        <p className="text-sm text-white font-medium">{payload[0].name}</p>
        <p className="text-xs text-gray-400">{payload[0].value}%</p>
      </div>
    )
  }
  return null
}

// Function to extract parent genre from subgenre
const getParentGenre = (genre) => {
  if (!genre) return 'Unknown'

  // Common patterns: "adjective genre" -> "genre"
  // Examples: "progressive house" -> "house", "indie rock" -> "rock"
  const parts = genre.toLowerCase().split(' ')

  // If single word, return as-is (lowercase for grouping)
  if (parts.length === 1) return parts[0]

  // Return the last word as the parent genre (e.g., "progressive house" -> "house")
  return parts[parts.length - 1]
}

// Function to capitalize first letter
const capitalize = (str) => {
  if (!str) return str
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// Function to group genres by parent and sum percentages
const groupByParentGenre = (genres) => {
  const parentMap = {}

  genres.forEach(({ genre, percentage }) => {
    const parent = getParentGenre(genre)
    const parentKey = parent.toLowerCase() // Use lowercase as key for grouping

    if (!parentMap[parentKey]) {
      parentMap[parentKey] = {
        genre: capitalize(parent), // Store capitalized version for display
        percentage: 0,
        subgenres: []
      }
    }

    parentMap[parentKey].percentage += percentage || 0
    parentMap[parentKey].subgenres.push(genre)
  })

  // Convert to array and sort by percentage
  return Object.values(parentMap)
    .sort((a, b) => b.percentage - a.percentage)
    .map(({ genre, percentage, subgenres }) => ({
      genre,
      percentage: Math.round(percentage * 10) / 10, // Round to 1 decimal
      subgenreCount: subgenres.length,
      subgenres: subgenres // Keep subgenres list for displaying
    }))
}

function TopGenres({ genresData, activeSource, activeRange, rangeOptions, rangeLabels, onSourceChange, onRangeChange, compact }) {
  const [selectedGenre, setSelectedGenre] = useState(null)
  const popupRef = useRef(null)

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setSelectedGenre(null)
      }
    }

    if (selectedGenre) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [selectedGenre])

  const genreSourceLabels = {
    artists: 'Artists',
    tracks: 'Tracks'
  }
  const genreSourceOptions = ['artists', 'tracks']

  const sourceData = genresData[activeSource] || {}
  const rawGenres = sourceData[activeRange] || []
  const genres = groupByParentGenre(rawGenres)
  const displayGenres = compact ? genres.slice(0, 5) : genres

  if (compact) {
    return (
      <>
        <div className="card-header">
          <div className="spotlight-header w-full">
            <p className="feature-label m-0">Top genres</p>
            <div className="spotlight-actions">
              <select
                value={activeSource}
                onChange={(e) => onSourceChange(e.target.value)}
                className="genre-dropdown"
              >
                {genreSourceOptions.map(source => (
                  <option key={source} value={source}>{genreSourceLabels[source]}</option>
                ))}
              </select>
              <select
                value={activeRange}
                onChange={(e) => onRangeChange(e.target.value)}
                className="genre-dropdown"
              >
                {rangeOptions.map(range => (
                  <option key={range} value={range}>{rangeLabels[range] || range}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="card-content flex-1 flex items-center -mx-2">
          {displayGenres.length === 0 ? (
            <div className="text-xs text-gray-400">No data</div>
          ) : (
            <>
              <div className="flex-1 -mr-10">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Tooltip content={<CustomTooltip />} />
                    <Pie
                      data={displayGenres.map(g => ({ name: g.genre, value: g.percentage }))}
                      dataKey="value"
                      nameKey="name"
                      cx="42%"
                      cy="50%"
                      innerRadius={75}
                      outerRadius={130}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {displayGenres.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-col gap-2.5 pr-8 -ml-4">
                {displayGenres.map((genre, index) => (
                  <div key={index} className="relative" ref={selectedGenre === genre.genre ? popupRef : null}>
                    <div
                      className={`flex items-center gap-2.5 ${genre.subgenreCount > 1 ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                      onClick={() => genre.subgenreCount > 1 && setSelectedGenre(selectedGenre === genre.genre ? null : genre.genre)}
                    >
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <div className="flex flex-col">
                        <span className="text-base font-medium text-white truncate max-w-[160px]">
                          {genre.genre}
                          {genre.subgenreCount > 1 && (
                            <span className="text-xs text-gray-500 ml-1">
                              ({genre.subgenreCount})
                            </span>
                          )}
                        </span>
                        <span className="text-sm text-gray-400">
                          {genre.percentage}%
                        </span>
                      </div>
                    </div>
                    {selectedGenre === genre.genre && genre.subgenreCount > 1 && (
                      <div className="absolute left-0 top-full mt-1 bg-bg-elevated border border-white/20 rounded-lg px-3 py-2 shadow-xl z-10 min-w-[180px]">
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-2">Subgenres</div>
                        <div className="flex flex-col gap-1">
                          {genre.subgenres.map((subgenre, idx) => (
                            <div key={idx} className="text-xs text-white">
                              • {subgenre}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </>
    )
  }

  const renderGenreChart = () => {
    if (genres.length === 0) {
      return <div className="text-sm text-gray-400">Genre data unavailable.</div>
    }

    const maxPercentage = Math.max(...genres.map(g => g.percentage || 0)) || 1

    return (
      <div className="genre-chart">
        {genres.map((genre, index) => {
          const percentage = genre.percentage || 0
          const width = Math.max((percentage / maxPercentage) * 100, 2)
          const label = genre.genre || 'Unknown'
          const displayPercentage = genre.percentage != null ? `${genre.percentage}%` : ''

          // Color gradient based on ranking
          const hue = 250 - index * 10
          const saturation = Math.max(70 - index * 3, 45)
          const lightness = Math.min(55 + index * 2, 68)

          // Size-based hierarchy
          const baseHeight = 32
          const heightBonus = Math.max(0, (genres.length - index) * 2)
          const barHeight = baseHeight + heightBonus

          return (
            <div key={index} className="genre-bar-row" style={{ animationDelay: `${index * 0.08}s` }}>
              <div className="genre-bar-header">
                <div className="genre-bar-rank">{index + 1}</div>
                <div className="genre-bar-label">{label}</div>
                <div className="genre-bar-value">{displayPercentage}</div>
              </div>
              <div className="genre-bar-container" style={{ height: `${barHeight}px` }}>
                <div
                  className="genre-bar-fill"
                  style={{
                    width: `${width}%`,
                    background: `linear-gradient(90deg, hsl(${hue}, ${saturation}%, ${lightness}%) 0%, hsl(${hue}, ${saturation}%, ${lightness - 8}%) 100%)`,
                    boxShadow: `0 0 20px hsla(${hue}, ${saturation}%, ${lightness}%, 0.4)`
                  }}
                ></div>
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-semibold">Top Genres</h3>
          <div className="text-sm text-gray-400">
            {genreSourceLabels[activeSource] || activeSource} · {rangeLabels[activeRange] || activeRange}
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Source</div>
            <div className="flex gap-2">
              {genreSourceOptions.map(source => (
                <button
                  key={source}
                  type="button"
                  className={`range-chip ${activeSource === source ? 'range-chip--active' : ''}`}
                  onClick={() => onSourceChange(source)}
                >
                  {genreSourceLabels[source] || source}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Range</div>
            <div className="flex gap-2">
              {rangeOptions.map(range => (
                <button
                  key={range}
                  type="button"
                  className={`range-chip ${activeRange === range ? 'range-chip--active' : ''}`}
                  onClick={() => onRangeChange(range)}
                >
                  {rangeLabels[range] || range}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      {renderGenreChart()}
    </div>
  )
}

export default TopGenres

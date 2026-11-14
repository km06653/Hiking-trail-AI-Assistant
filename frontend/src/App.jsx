import { useRef, useState } from 'react'
import './index.css'
import TrailMateHero from './TrailMateHero'
import TrailMateChat from './components/TrailMateChat'
import ParkHero from './ParkHero'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [guide, setGuide] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const requestRef = useRef(null)

  const resetSearch = () => {
    requestRef.current?.abort()
    requestRef.current = null
    setShowResults(false)
    setGuide(null)
    setIsLoading(false)
  }

  const fetchHikingGuide = async (destination) => {
    const name = destination.trim()
    if (!name) return

    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller

    setSearchQuery(name)
    setSearchInput(name)
    setShowResults(true)
    setIsLoading(true)
    setGuide(null)

    try {
      const response = await fetch(
        'http://localhost:8000/api/hike-guide',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: `Create a hiking guide for ${name}. You MUST use your tools to lookup the coordinates and fetch the live weather forecast. Do not leave the weather data empty!`,
            hike_date: new Date().toISOString().split('T')[0],
          }),
        }
      )

      if (!response.ok) {
        throw new Error('Failed to fetch guide')
      }

      const data = await response.json()

      if (requestRef.current === controller) {
        setGuide(data)
      }
    } catch (error) {
      if (
        error.name !== 'AbortError' &&
        requestRef.current === controller
      ) {
        console.error('API Error:', error)
        alert('Could not load the hiking guide. Check your backend.')
        setShowResults(false)
      }
    } finally {
      if (requestRef.current === controller) {
        setIsLoading(false)
      }
    }
  }

  const handleSearch = (event) => {
    event.preventDefault()
    fetchHikingGuide(searchInput)
  }

  return (
    <div className="min-h-screen bg-sand text-bark font-sans pb-20">
      {!showResults ? (
        <TrailMateHero onPlanTrip={fetchHikingGuide} />
      ) : (
        <>
          {/* Header with destination search */}
          <nav
            className="sticky top-0 z-30 border-b shadow-sm"
            style={{
              backgroundColor: '#f4f1e9',
              borderColor: '#d8dfd5',
              padding: '16px 24px',
            }}
          >
            <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={resetSearch}
                className="text-xl font-bold"
                style={{ color: '#2e4b3e' }}
              >
                TrailMate AI 🌲
              </button>

              <form
                onSubmit={handleSearch}
                className="flex items-center gap-2 ml-auto"
                style={{ maxWidth: '100%' }}
              >
                <input
                  type="search"
                  aria-label="Search for a park"
                  placeholder="Search another park…"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="rounded-full border px-4 py-2 text-sm"
                  style={{
                    width: 'min(240px, 45vw)',
                    backgroundColor: '#fff',
                    color: '#263c30',
                    borderColor: '#b9c5b5',
                  }}
                />

                <button
                  type="submit"
                  disabled={!searchInput.trim()}
                  className="rounded-full px-4 py-2 text-sm font-bold disabled:opacity-50"
                  style={{
                    backgroundColor: '#2e4b3e',
                    color: '#fff',
                  }}
                >
                  Search
                </button>

                <button
                  type="button"
                  onClick={resetSearch}
                  className="text-sm font-bold whitespace-nowrap"
                  style={{ color: '#2e4b3e' }}
                >
                  ← New Search
                </button>
              </form>
            </div>
          </nav>

          <main className="pt-8 px-4 max-w-5xl mx-auto">
            {isLoading ? (
              <div className="mt-20 flex flex-col items-center animate-pulse text-center">
                <div className="text-6xl mb-6">🏕️</div>
                <h2 className="text-3xl font-bold text-forest mb-4">
                  Gemini is researching {searchQuery}...
                </h2>
                <p className="text-sage text-lg">
                  Checking live weather, park rules, and trail conditions.
                </p>
              </div>
            ) : guide ? (
              <div className="w-full animate-fade-in">
                <ParkHero
                  key={searchQuery}
                  destination={searchQuery}
                  title={guide.destination}
                  overview={guide.overview}
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Trails */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h3 className="text-2xl font-bold text-forest mb-5">
                        🥾 Top Trails
                      </h3>

                      {guide.trails?.map((trail, index) => (
                        <div
                          key={index}
                          className="mb-5 pb-5 border-b border-sage/10 last:border-0 last:mb-0 last:pb-0"
                        >
                          <h4 className="font-bold text-xl mb-1 flex justify-between gap-2">
                            {trail.name}
                            {trail.verification_status === 'Verified' && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                                Verified
                              </span>
                            )}
                          </h4>

                          <p className="text-sm font-semibold text-sage mb-2 uppercase tracking-wide">
                            {trail.difficulty} • {trail.distance} •{' '}
                            {trail.estimated_duration} • {trail.elevation_gain}
                          </p>

                          <p className="text-bark mb-3">{trail.description}</p>

                          <div className="bg-sand/50 p-3 rounded-xl border border-sage/10">
                            <span className="font-bold text-sm text-forest">
                              Highlights:{' '}
                            </span>
                            <span className="text-sm text-bark">
                              {trail.highlights?.join(', ')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Safety */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h3 className="text-2xl font-bold text-forest mb-5">
                        ⚠️ Safety Tips
                      </h3>

                      <div className="grid gap-4">
                        {guide.safety_tips?.map((tip, index) => (
                          <div
                            key={index}
                            className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100"
                          >
                            <h4 className="font-bold text-orange-800 mb-1">
                              {tip.title}
                            </h4>
                            <p className="text-sm text-orange-900">
                              {tip.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Weather */}
                    {guide.weather && (
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                        <h3 className="text-xl font-bold text-forest mb-3">
                          ☀️ Live Weather
                        </h3>

                        <div className="text-bark bg-sand/30 p-4 rounded-2xl border border-sage/10">
                          <p className="text-sm font-bold text-sage uppercase tracking-wide mb-1">
                            {guide.weather.forecast_date}
                          </p>

                          <p className="font-extrabold text-4xl text-forest mb-2">
                            {guide.weather.temperature_max}°
                            <span className="text-lg text-sage ml-1">
                              / {guide.weather.temperature_min}°
                            </span>
                          </p>

                          <p className="font-bold text-lg mb-1 capitalize">
                            {guide.weather.weather_summary}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-sage font-medium mt-3 pt-3 border-t border-sage/20">
                            <span>
                              💧 {guide.weather.precipitation_probability}% Rain
                            </span>
                            <span>
                              💨 {guide.weather.wind_speed_max} mph
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Packing */}
                    <div className="bg-forest text-sand p-6 rounded-3xl shadow-sm">
                      <h3 className="text-xl font-bold mb-4">
                        🎒 Packing List
                      </h3>

                      <ul className="space-y-4">
                        {guide.packing_list?.map((item, index) => (
                          <li
                            key={index}
                            className="flex flex-col gap-1 border-b border-sand/20 pb-3 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">{item.item}</span>
                              {item.essential && (
                                <span className="text-xs bg-sand text-forest px-2 py-0.5 rounded-full font-bold">
                                  Essential
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-sand/80">
                              {item.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Rules */}
                    <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h3 className="text-xl font-bold text-forest mb-4">
                        📜 Park Rules
                      </h3>

                      <ul className="text-sm space-y-3 text-bark">
                        {guide.park_rules?.map((rule, index) => (
                          <li key={index} className="flex flex-col">
                            <span className="font-bold">{rule.rule}</span>
                            <span className="text-xs text-sage uppercase">
                              {rule.category}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <TrailMateChat hikingContext={guide} />
                  </div>
                </div>
              </div>
            ) : null}
          </main>
        </>
      )}
    </div>
  )
}

export default App
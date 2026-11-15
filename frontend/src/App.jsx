import { useRef, useState } from 'react'
import './index.css'
import TrailMateHero from './TrailMateHero'
import TrailMateChat from './components/TrailMateChat'
import ParkHero from './ParkHero'
import VisitCalendar, {
  localDateString,
  formatVisitDate,
} from './components/VisitCalendar'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [guide, setGuide] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [visitDate, setVisitDate] = useState(() => localDateString())
  const [loadedDate, setLoadedDate] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const requestRef = useRef(null)

  const hasDateChanged = Boolean(
    guide && visitDate !== loadedDate
  )

  function resetSearch() {
    requestRef.current?.abort()
    requestRef.current = null

    setShowResults(false)
    setGuide(null)
    setLoadedDate('')
    setIsLoading(false)
    setErrorMessage('')
  }

  async function fetchHikingGuide(
    destination,
    requestedDate = visitDate,
    keepCurrentGuide = false
  ) {
    const name = destination.trim()

    if (!name) return

    if (!requestedDate || requestedDate < localDateString()) {
      setErrorMessage('Choose today or a future date for your visit.')
      return
    }

    requestRef.current?.abort()

    const controller = new AbortController()
    requestRef.current = controller

    setSearchQuery(name)
    setSearchInput(name)
    setShowResults(true)
    setIsLoading(true)
    setErrorMessage('')

    if (!keepCurrentGuide) {
      setGuide(null)
      setLoadedDate('')
    }

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
            message: [
              `Create a hiking guide for ${name}.`,
              `The visit date is ${requestedDate}.`,
              'Use your tools to look up the coordinates and fetch',
              'the weather forecast for that selected date.',
              'Use the forecast when recommending packing items.',
              'If a forecast is unavailable for that date, say so.',
              'Do not substitute today’s weather or invent a forecast.',
            ].join(' '),
            hike_date: requestedDate,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`Guide request failed (${response.status})`)
      }

      const data = await response.json()

      if (requestRef.current === controller) {
        setGuide(data)
        setLoadedDate(requestedDate)
      }
    } catch (error) {
      if (
        error.name !== 'AbortError' &&
        requestRef.current === controller
      ) {
        console.error('API Error:', error)

        setErrorMessage(
          'Could not load the guide. Check that your backend is running, then try again.'
        )
      }
    } finally {
      if (requestRef.current === controller) {
        setIsLoading(false)
        requestRef.current = null
      }
    }
  }

  function handleSearch(event) {
    event.preventDefault()
    fetchHikingGuide(searchInput, visitDate)
  }

  function handleUpdateGuide() {
    fetchHikingGuide(searchQuery, visitDate, true)
  }

  const forecastMatchesDate = Boolean(
    guide?.weather &&
      guide.weather.forecast_date === loadedDate
  )

  const navigation = (
    <nav
      className="destination-nav"
      aria-label="Destination navigation"
    >
      <button
        type="button"
        onClick={resetSearch}
        className="destination-brand"
        aria-label="TrailMate home"
      >
        <svg
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 30 17 7l9 15 5-8 8 16H3Z" />
          <path d="m11 18 6 4 5-5M7 35h28" />
        </svg>

        <span>TrailMate AI</span>
      </button>

      <form
        onSubmit={handleSearch}
        className="destination-search"
      >
        <input
          type="search"
          aria-label="Search for a park"
          placeholder="Find another adventure…"
          value={searchInput}
          onChange={(event) => {
            setSearchInput(event.target.value)
          }}
        />

        <button
          type="submit"
          disabled={!searchInput.trim()}
          className="destination-search-submit"
        >
          Search
        </button>

        <button
          type="button"
          onClick={resetSearch}
          className="destination-home"
        >
          ← Home
        </button>
      </form>
    </nav>
  )

  return (
    <div className="min-h-screen bg-sand text-bark font-sans pb-20">
      {!showResults ? (
        <TrailMateHero
          onPlanTrip={(destination) => {
            fetchHikingGuide(destination, visitDate)
          }}
        />
      ) : (
        <>
          {/* Full-width hero with navigation over the photograph */}
          {guide ? (
            <ParkHero
              key={searchQuery}
              destination={searchQuery}
              title={guide.destination}
              overview={guide.overview}
              navigation={navigation}
            />
          ) : (
            <header className="destination-loading-header">
              <div className="destination-loading-header-inner">
                {navigation}
              </div>
            </header>
          )}

          {/* Everything below the hero remains centered */}
          <main className="destination-guide">
            {errorMessage && (
              <div
                className="tm-status-message is-error mt-6"
                role="alert"
              >
                <p>{errorMessage}</p>

                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => {
                    fetchHikingGuide(
                      searchQuery,
                      visitDate,
                      Boolean(guide)
                    )
                  }}
                  className="mt-2 font-bold underline disabled:opacity-50"
                >
                  Try again
                </button>
              </div>
            )}

            {isLoading && !guide ? (
              <div
                className="mt-20 flex flex-col items-center animate-pulse text-center"
                role="status"
              >
                <div className="text-6xl mb-6">🏕️</div>

                <h2 className="text-3xl font-bold text-forest mb-4">
                  Gemini is researching {searchQuery}…
                </h2>

                <p className="text-sage text-lg">
                  Planning for {formatVisitDate(visitDate)}.
                </p>

                <p className="text-sage mt-2">
                  Gathering weather, park information, and trail details.
                </p>
              </div>
            ) : guide ? (
              <div className="w-full">
                <section
                  className="tm-visit-bar"
                  aria-label="Choose your visit date"
                >
                  <div className="tm-visit-label">
                    <strong>Your visit</strong>
                    <span>A little planning. More exploring.</span>
                  </div>

                  <div className="tm-visit-date">
                    <VisitCalendar
                      value={visitDate}
                      onChange={setVisitDate}
                    />
                  </div>

                  <button
                    type="button"
                    className="tm-update-guide"
                    onClick={handleUpdateGuide}
                    disabled={isLoading || !hasDateChanged}
                  >
                    {isLoading
                      ? 'Updating…'
                      : hasDateChanged
                        ? 'Update guide ↗'
                        : 'Guide up to date ✓'}
                  </button>

                  <p className="tm-visit-note">
                    Choose a date, then update your guide.
                    Forecast availability depends on how far ahead
                    you are planning.
                  </p>
                </section>

                {isLoading && (
                  <div className="tm-status-message" role="status">
                    Updating your guide for{' '}
                    {formatVisitDate(visitDate)}. The previous guide
                    remains visible below until the update finishes.
                  </div>
                )}

                {hasDateChanged && !isLoading && (
                  <div className="tm-status-message" role="status">
                    You selected {formatVisitDate(visitDate)}.
                    Click <strong>Update guide</strong> to apply it.
                    The information below is still the guide requested
                    for {formatVisitDate(loadedDate)}.
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 flex flex-col gap-6">
                    {/* Trails */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h2 className="text-2xl font-bold text-forest mb-5">
                        🥾 Top Trails
                      </h2>

                      {guide.trails?.map((trail, index) => (
                        <article
                          key={index}
                          className="mb-5 pb-5 border-b border-sage/10 last:border-0 last:mb-0 last:pb-0"
                        >
                          <h3 className="font-bold text-xl mb-1 flex justify-between gap-2">
                            {trail.name}

                            {trail.verification_status === 'Verified' && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full self-start">
                                Verified
                              </span>
                            )}
                          </h3>

                          <p className="text-sm font-semibold text-sage mb-2 uppercase tracking-wide">
                            {trail.difficulty} • {trail.distance} •{' '}
                            {trail.estimated_duration} •{' '}
                            {trail.elevation_gain}
                          </p>

                          <p className="text-bark mb-3">
                            {trail.description}
                          </p>

                          <div className="bg-sand/50 p-3 rounded-xl border border-sage/10">
                            <span className="font-bold text-sm text-forest">
                              Highlights:{' '}
                            </span>

                            <span className="text-sm text-bark">
                              {trail.highlights?.join(', ')}
                            </span>
                          </div>
                        </article>
                      ))}
                    </section>

                    {/* Safety */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h2 className="text-2xl font-bold text-forest mb-5">
                        ⚠️ Safety Tips
                      </h2>

                      <div className="grid gap-4">
                        {guide.safety_tips?.map((tip, index) => (
                          <div
                            key={index}
                            className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100"
                          >
                            <h3 className="font-bold text-orange-800 mb-1">
                              {tip.title}
                            </h3>

                            <p className="text-sm text-orange-900">
                              {tip.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="flex flex-col gap-6">
                    {/* Weather */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h2 className="text-xl font-bold text-forest mb-3">
                        ☀️ Visit Forecast
                      </h2>

                      {forecastMatchesDate ? (
                        <div className="text-bark bg-sand/30 p-4 rounded-2xl border border-sage/10">
                          <p className="text-sm font-bold text-sage uppercase tracking-wide mb-1">
                            {formatVisitDate(
                              guide.weather.forecast_date
                            )}
                          </p>

                          <p className="font-extrabold text-4xl text-forest mb-2">
                            {guide.weather.temperature_max ?? '—'}°
                            <span className="text-lg text-sage ml-1">
                              / {guide.weather.temperature_min ?? '—'}°
                            </span>
                          </p>

                          <p className="font-bold text-lg mb-1 capitalize">
                            {guide.weather.weather_summary}
                          </p>

                          <div className="flex flex-wrap gap-4 text-sm text-sage font-medium mt-3 pt-3 border-t border-sage/20">
                            <span>
                              💧{' '}
                              {guide.weather.precipitation_probability ??
                                '—'}
                              % Rain
                            </span>

                            <span>
                              💨 {guide.weather.wind_speed_max ?? '—'} mph
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-sage bg-sand/30 p-4 rounded-2xl">
                          {guide.weather_message || (
                            <>
                              A matching forecast was not returned for{' '}
                              {formatVisitDate(loadedDate)}.
                            </>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Packing */}
                    <section className="bg-forest text-sand p-6 rounded-3xl shadow-sm">
                      <h2 className="text-xl font-bold mb-4">
                        🎒 Packing List
                      </h2>

                      <ul className="space-y-4">
                        {guide.packing_list?.map((item, index) => (
                          <li
                            key={index}
                            className="flex flex-col gap-1 border-b border-sand/20 pb-3 last:border-0 last:pb-0"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold">
                                {item.item}
                              </span>

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
                    </section>

                    {/* Rules */}
                    <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                      <h2 className="text-xl font-bold text-forest mb-4">
                        📜 Park Rules
                      </h2>

                      <ul className="text-sm space-y-3 text-bark">
                        {guide.park_rules?.map((rule, index) => (
                          <li key={index} className="flex flex-col">
                            <span className="font-bold">
                              {rule.rule}
                            </span>

                            <span className="text-xs text-sage uppercase">
                              {rule.category}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>
                </div>
              </div>
            ) : null}
          </main>

          {/* Floating chat stays independent of the guide layout */}
          {guide && (
            <TrailMateChat
              key={`${searchQuery}-${loadedDate}`}
              hikingContext={guide}
            />
          )}
        </>
      )}
    </div>
  )
}

export default App
import { useState } from 'react'
import './index.css'
import TrailMateHero from './TrailMateHero'

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const [guide, setGuide] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchHikingGuide = async (destination) => {
    setSearchQuery(destination);
    setShowResults(true);
    setIsLoading(true);
    setGuide(null);

    try {
      const response = await fetch('http://localhost:8000/api/hike-guide', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // strict prompt + current date to force Gemini to use the Open-Meteo tool
        body: JSON.stringify({ 
          message: `Create a hiking guide for ${destination}. You MUST use your tools to lookup the coordinates and fetch the live weather forecast. Do not leave the weather data empty!`,
          hike_date: new Date().toISOString().split('T')[0] 
        })
      });

      if (!response.ok) {
        throw new Error("Failed to fetch guide");
      }

      const data = await response.json();
      setGuide(data);
      
    } catch (error) {
      console.error("API Error:", error);
      alert("Uh oh! Could not connect to the backend. Check the console.");
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-sand text-bark font-sans pb-20">
      
      {!showResults ? (
        <TrailMateHero onPlanTrip={fetchHikingGuide} />
      ) : (
        <>
          <nav className="p-6 border-b border-sage/30 bg-sand sticky top-0 z-10 shadow-sm flex justify-between items-center">
            <h1 className="text-2xl font-bold text-forest cursor-pointer" onClick={() => {setShowResults(false); setGuide(null);}}>
              TrailMate AI 🌲
            </h1>
            <button onClick={() => {setShowResults(false); setGuide(null);}} className="text-sm font-bold text-sage hover:text-forest transition-colors">
              ← New Search
            </button>
          </nav>

          <main className="flex flex-col items-center justify-center pt-8 px-4 max-w-5xl mx-auto">
            
            {isLoading ? (
              <div className="mt-20 flex flex-col items-center animate-pulse">
                <div className="text-6xl mb-6">🏕️</div>
                <h2 className="text-3xl font-bold text-forest mb-4">Gemini is researching {searchQuery}...</h2>
                <p className="text-sage text-lg">Checking live weather, park rules, and trail conditions.</p>
              </div>
            ) : (
              guide && (
                <div className="w-full animate-fade-in">
                  
                  {/* Hero Banner */}
                  <div 
                    className="w-full h-64 md:h-96 rounded-3xl mb-8 bg-cover bg-center relative overflow-hidden shadow-xl"
                    style={{ backgroundImage: `url('https://images.unsplash.com/photo-1505159940484-eb2b9f2588e2?q=80&w=2070&auto=format&fit=crop')` }}
                  >
                    <div className="absolute inset-0 bg-black/40 flex flex-col justify-end p-8 md:p-12">
                      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3 drop-shadow-lg">
                        {guide.destination}
                      </h2>
                      <p className="text-lg text-white/95 max-w-3xl drop-shadow-md font-medium leading-relaxed">
                        {guide.overview}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 flex flex-col gap-6">
                      
                      {/* Trails */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                        <h3 className="text-2xl font-bold text-forest mb-5 flex items-center gap-2">
                          🥾 Top Trails
                        </h3>
                        {guide.trails?.map((trail, index) => (
                          <div key={index} className="mb-5 pb-5 border-b border-sage/10 last:border-0 last:mb-0 last:pb-0">
                            <h4 className="font-bold text-xl mb-1 flex justify-between">
                              {trail.name}
                              {trail.verification_status === "Verified" && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Verified</span>}
                            </h4>
                            <p className="text-sm font-semibold text-sage mb-2 uppercase tracking-wide">
                              {trail.difficulty} • {trail.distance} • {trail.estimated_duration} • {trail.elevation_gain}
                            </p>
                            <p className="text-bark mb-3">{trail.description}</p>
                            <div className="bg-sand/50 p-3 rounded-xl border border-sage/10">
                              <span className="font-bold text-sm text-forest">Highlights: </span>
                              <span className="text-sm text-bark">{trail.highlights?.join(", ")}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Safety Tips */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                        <h3 className="text-2xl font-bold text-forest mb-5 flex items-center gap-2">
                          ⚠️ Safety Tips
                        </h3>
                        <div className="grid gap-4">
                          {guide.safety_tips?.map((tip, index) => (
                            <div key={index} className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                              <h4 className="font-bold text-orange-800 mb-1">{tip.title}</h4>
                              <p className="text-sm text-orange-900">{tip.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>

                    <div className="flex flex-col gap-6">
                      
                      {/* Weather */}
                      {guide.weather && (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                          <h3 className="text-xl font-bold text-forest mb-3 flex items-center gap-2">☀️ Live Weather</h3>
                          <div className="text-bark bg-sand/30 p-4 rounded-2xl border border-sage/10">
                            <div className="flex justify-between items-end mb-2">
                              <div>
                                <p className="text-sm font-bold text-sage uppercase tracking-wide mb-1">
                                  {guide.weather.forecast_date}
                                </p>
                                <p className="font-extrabold text-4xl text-forest">
                                  {guide.weather.temperature_max}°
                                  <span className="text-lg text-sage ml-1">
                                    / {guide.weather.temperature_min}°
                                  </span>
                                </p>
                              </div>
                            </div>
                            <p className="font-bold text-lg mb-1 capitalize">{guide.weather.weather_summary}</p>
                            <div className="flex gap-4 text-sm text-sage font-medium mt-3 pt-3 border-t border-sage/20">
                               <span>💧 {guide.weather.precipitation_probability}% Rain</span>
                               <span>💨 {guide.weather.wind_speed_max} mph</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Packing List */}
                      <div className="bg-forest text-sand p-6 rounded-3xl shadow-sm">
                        <h3 className="text-xl font-bold mb-4">🎒 Packing List</h3>
                        <ul className="space-y-4">
                          {guide.packing_list?.map((item, index) => (
                            <li key={index} className="flex flex-col gap-1 border-b border-sand/20 pb-3 last:border-0 last:pb-0">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{item.item}</span>
                                {item.essential && <span className="text-xs bg-sand text-forest px-2 py-0.5 rounded-full font-bold">Essential</span>}
                              </div>
                              <span className="text-xs text-sand/80">{item.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Rules */}
                      <div className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
                        <h3 className="text-xl font-bold text-forest mb-4">📜 Park Rules</h3>
                        <ul className="text-sm space-y-3 text-bark">
                          {guide.park_rules?.map((rule, index) => (
                            <li key={index} className="flex flex-col">
                              <span className="font-bold">{rule.rule}</span>
                              <span className="text-xs text-sage uppercase">{rule.category}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                    </div>
                  </div>
                </div>
              )
            )}
          </main>
        </>
      )}
    </div>
  )
}

export default App

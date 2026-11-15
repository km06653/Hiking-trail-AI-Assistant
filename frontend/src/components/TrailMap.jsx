
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default Leaflet marker icons in Vite.
const destinationIcon = new L.Icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

function TrailMap({ destination, latitude, longitude }) {
  const hasCoordinates =
    typeof latitude === 'number' &&
    typeof longitude === 'number'

  if (!hasCoordinates) {
    return (
      <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
        <h2 className="text-2xl font-bold text-forest mb-3">
          📍 Destination Map
        </h2>
        <p className="text-sage">
          Map coordinates are currently unavailable for this destination.
        </p>
      </section>
    )
  }

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`

  return (
    <section className="bg-white p-6 rounded-3xl shadow-sm border border-sage/20">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-forest">
            📍 Destination Map
          </h2>
          <p className="text-sm text-sage mt-1">
            Explore the location of {destination}.
          </p>
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-forest text-white px-4 py-2 rounded-xl font-semibold hover:bg-forest/90 transition"
        >
          Get Directions ↗
        </a>
      </div>

      <div className="h-[350px] w-full rounded-2xl overflow-hidden border border-sage/20">
        <MapContainer
          center={[latitude, longitude]}
          zoom={14}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker
            position={[latitude, longitude]}
            icon={destinationIcon}
          >
            <Popup>
              <div className="text-center">
                <strong>{destination}</strong>
                <br />
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Get Directions
                </a>
              </div>
            </Popup>
          </Marker>
        </MapContainer>
      </div>

      <p className="text-xs text-sage mt-3">
        Map data © OpenStreetMap contributors.
      </p>
    </section>
  )
}

export default TrailMap

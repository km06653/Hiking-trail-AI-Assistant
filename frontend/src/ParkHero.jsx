import { useEffect, useState } from 'react'
import './ParkHero.css'

const parkNames = [
  ['point lobos', 'Point Lobos'],
  ['kings canyon', 'Kings Canyon National Park'],
  ['yosemite', 'Yosemite National Park'],
  ['zion', 'Zion National Park'],
  ['big sur', 'Big Sur'],
  ['sequoia', 'Sequoia National Park'],
  ['yellowstone', 'Yellowstone National Park'],
  ['grand canyon', 'Grand Canyon National Park'],
]

async function wikiRequest(params, signal) {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    formatversion: '2',
    origin: '*',
    ...params,
  })

  const response = await fetch(
    `https://en.wikipedia.org/w/api.php?${query}`,
    { signal }
  )

  if (!response.ok) {
    throw new Error(`Wikipedia returned ${response.status}`)
  }

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error.info)
  }

  return data
}

function plainText(value) {
  return (
    new DOMParser()
      .parseFromString(value || '', 'text/html')
      .body.textContent?.trim() || ''
  )
}

export default function ParkHero({
  destination,
  title,
  overview,
  navigation,
}) {
  const [photo, setPhoto] = useState(null)
  const [credits, setCredits] = useState(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    const controller = new AbortController()
    let active = true

    setPhoto(null)
    setCredits(null)
    setStatus('loading')

    async function loadPhoto() {
      try {
        const name = destination?.trim()

        if (!name) {
          throw new Error('Missing destination')
        }

        const matchedTitle = parkNames.find(([match]) =>
          name.toLowerCase().includes(match)
        )?.[1]

        let data = await wikiRequest(
          {
            titles: matchedTitle || name,
            redirects: '1',
            prop: 'pageimages',
            piprop: 'thumbnail|original|name',
            pithumbsize: '1600',
            pilicense: 'free',
          },
          controller.signal
        )

        let page = data.query?.pages?.[0]

        if (!page?.thumbnail?.source && !page?.original?.source) {
          data = await wikiRequest(
            {
              generator: 'search',
              gsrsearch: matchedTitle || name,
              gsrnamespace: '0',
              gsrlimit: '5',
              prop: 'pageimages',
              piprop: 'thumbnail|original|name',
              pithumbsize: '1600',
              pilicense: 'free',
            },
            controller.signal
          )

          page = [...(data.query?.pages || [])]
            .sort((a, b) => (a.index ?? 99) - (b.index ?? 99))
            .find(
              (item) =>
                item.thumbnail?.source || item.original?.source
            )
        }

        const imageUrl =
          page?.thumbnail?.source || page?.original?.source

        if (!imageUrl) {
          throw new Error(`No photo found for ${name}`)
        }

        if (!active) return

        setPhoto({
          url: imageUrl,
          originalUrl: page.original?.source,
          creditUrl: page.pageimage
            ? `https://en.wikipedia.org/wiki/File:${encodeURIComponent(
                page.pageimage
              )}`
            : `https://en.wikipedia.org/wiki/${encodeURIComponent(
                page.title || name
              )}`,
        })

        setStatus('ready')

        if (!page.pageimage) return

        try {
          const creditData = await wikiRequest(
            {
              titles: `File:${page.pageimage}`,
              prop: 'imageinfo',
              iiprop: 'url|extmetadata',
            },
            controller.signal
          )

          const info =
            creditData.query?.pages?.[0]?.imageinfo?.[0]

          if (active && info) {
            setCredits({
              author: plainText(info.extmetadata?.Artist?.value),
              license: plainText(
                info.extmetadata?.LicenseShortName?.value
              ),
              url: info.descriptionurl,
            })
          }
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.warn('Photo credits unavailable:', error)
          }
        }
      } catch (error) {
        if (active && error.name !== 'AbortError') {
          console.error('Park photo failed:', destination, error)
          setStatus('error')
        }
      }
    }

    loadPhoto()

    return () => {
      active = false
      controller.abort()
    }
  }, [destination])

  function handleImageError() {
    if (photo?.originalUrl && photo.url !== photo.originalUrl) {
      setPhoto((current) => ({
        ...current,
        url: current.originalUrl,
      }))
    } else {
      setPhoto(null)
      setStatus('error')
    }
  }

  return (
    <section className="park-cover">
      {photo && (
        <img
          key={photo.url}
          src={photo.url}
          alt={`${destination} scenery`}
          onError={handleImageError}
          className="park-cover-photo"
          decoding="async"
          fetchPriority="high"
        />
      )}

      <div className="park-cover-overlay" aria-hidden="true" />

      <div className="park-cover-navigation">
        {navigation}
      </div>

      <div className="park-cover-content">
        <div className="park-cover-eyebrow">
          Find your kind of outside
        </div>

        <h1>{title || destination}</h1>

        <p className="park-cover-tagline">
          A great day outside starts here.
        </p>

        <p className="park-cover-overview">
          {overview}
        </p>

        {status !== 'ready' && (
          <p role="status" className="park-cover-status">
            {status === 'loading'
              ? `Finding a photo of ${destination}…`
              : `Photo unavailable for ${destination}`}
          </p>
        )}

        {photo && (
          <a
            href={credits?.url || photo.creditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="park-cover-credit"
          >
            Photo: {credits?.author || 'View photo credits'}
            {credits?.license ? ` · ${credits.license}` : ''}
          </a>
        )}
      </div>
    </section>
  )
}
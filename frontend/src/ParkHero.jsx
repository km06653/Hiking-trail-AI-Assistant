import { useEffect, useState } from 'react'

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
  return new DOMParser()
    .parseFromString(value || '', 'text/html')
    .body.textContent?.trim() || ''
}

export default function ParkHero({ destination, title, overview }) {
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
        if (!name) throw new Error('Missing destination')

        const matchedTitle = parkNames.find(([match]) =>
          name.toLowerCase().includes(match)
        )?.[1]

        // First try the park's exact article.
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

        // Search if there was no photo on the exact article.
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
            .find((item) =>
              item.thumbnail?.source || item.original?.source
            )
        }

        const imageUrl = page?.thumbnail?.source || page?.original?.source

        if (!imageUrl) {
          throw new Error(`No photo found for ${name}`)
        }

        if (!active) return

        // Show the image immediately.
        setPhoto({
          url: imageUrl,
          originalUrl: page.original?.source,
          creditUrl: `https://en.wikipedia.org/wiki/File:${encodeURIComponent(
            page.pageimage
          )}`,
        })
        setStatus('ready')

        // Credits are optional: failure here must not hide the photo.
        try {
          const creditData = await wikiRequest(
            {
              titles: `File:${page.pageimage}`,
              prop: 'imageinfo',
              iiprop: 'url|extmetadata',
            },
            controller.signal
          )

          const info = creditData.query?.pages?.[0]?.imageinfo?.[0]

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

  const handleImageError = () => {
    // Try the original image if the thumbnail fails.
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
    <section
      className="relative w-full rounded-3xl mb-8 overflow-hidden shadow-xl"
      style={{ backgroundColor: '#2e4b3e' }}
    >
      {photo && (
        <img
          key={photo.url}
          src={photo.url}
          alt={`${destination} scenery`}
          onError={handleImageError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, rgba(0,0,0,.88), rgba(0,0,0,.25) 65%, rgba(0,0,0,.08))',
        }}
      />

      <div
        className="relative z-10 flex flex-col justify-end p-8 md:p-12"
        style={{ minHeight: '380px', color: '#fff' }}
      >
        {status !== 'ready' && (
          <p role="status" className="text-sm mb-3">
            {status === 'loading'
              ? `Finding a photo of ${destination}…`
              : `Photo unavailable for ${destination}`}
          </p>
        )}

        <h2 className="text-4xl md:text-5xl font-extrabold mb-3">
          {title || destination}
        </h2>

        <p className="text-lg max-w-3xl font-medium leading-relaxed">
          {overview}
        </p>

        {photo && (
          <a
            href={credits?.url || photo.creditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="self-start mt-4 text-xs underline"
            style={{ color: '#fff' }}
          >
            Photo: {credits?.author || 'View photo credits'}
            {credits?.license ? ` · ${credits.license}` : ''}
          </a>
        )}
      </div>
    </section>
  )
}
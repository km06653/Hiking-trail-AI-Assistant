import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import {
  geoEquirectangular,
  geoGraticule,
  geoPath,
} from 'd3-geo'
import { feature } from 'topojson-client'
import landTopology from 'world-atlas/land-110m.json'
import { formatVisitDate } from './VisitCalendar'
import './LoadingGuide.css'

function createEarthTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 2048
  canvas.height = 1024

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Could not create the globe texture.')
  }

  context.fillStyle = '#5b8988'
  context.fillRect(0, 0, canvas.width, canvas.height)

  const land = feature(landTopology, landTopology.objects.land)

  const projection = geoEquirectangular()
    .scale(canvas.width / (2 * Math.PI))
    .translate([canvas.width / 2, canvas.height / 2])

  const path = geoPath(projection, context)

  context.beginPath()
  path(land)
  context.fillStyle = '#355c3d'
  context.fill()

  context.strokeStyle = '#77936a'
  context.lineWidth = 1.2
  context.stroke()

  context.beginPath()
  path(geoGraticule().step([30, 30])())
  context.strokeStyle = 'rgba(220, 237, 198, 0.13)'
  context.lineWidth = 0.8
  context.stroke()

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  return texture
}

function addDecorativePin(earth) {
  // Decorative California-area marker, not live destination tracking.
  const latitude = THREE.MathUtils.degToRad(37)
  const longitude = THREE.MathUtils.degToRad(-119 + 180)

  const normal = new THREE.Vector3(
    -Math.cos(longitude) * Math.cos(latitude),
    Math.sin(latitude),
    Math.sin(longitude) * Math.cos(latitude)
  )

  const pin = new THREE.Group()

  pin.position.copy(normal.clone().multiplyScalar(1.08))
  pin.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    normal
  )

  const material = new THREE.MeshStandardMaterial({
    color: '#daef9b',
    emissive: '#4b5c22',
    emissiveIntensity: 0.3,
    roughness: 0.5,
  })

  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.009, 0.14, 12),
    material
  )

  stem.position.y = 0.07

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.045, 20, 16),
    material
  )

  head.position.y = 0.155

  pin.add(stem, head)
  earth.add(pin)
}

function LoadingGlobe() {
  const containerRef = useRef(null)
  const [unavailable, setUnavailable] = useState(false)

  useEffect(() => {
    const container = containerRef.current

    if (!container) return undefined

    let renderer
    let scene
    let texture
    let observer
    let frameId = null
    let disposed = false
    let previousTime = null

    const motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    )

    let updateMotion = () => {}

    function cleanup() {
      disposed = true

      if (frameId !== null) {
        cancelAnimationFrame(frameId)
      }

      observer?.disconnect()
      motionPreference.removeEventListener('change', updateMotion)

      const geometries = new Set()
      const materials = new Set()

      scene?.traverse((object) => {
        if (object.geometry) {
          geometries.add(object.geometry)
        }

        if (object.material) {
          const objectMaterials = Array.isArray(object.material)
            ? object.material
            : [object.material]

          objectMaterials.forEach((material) => {
            materials.add(material)
          })
        }
      })

      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      texture?.dispose()

      if (renderer) {
        renderer.dispose()
        renderer.domElement.remove()
      }
    }

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
      })

      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, 2)
      )
      renderer.setClearColor(0x000000, 0)
      renderer.outputColorSpace = THREE.SRGBColorSpace

      container.appendChild(renderer.domElement)

      scene = new THREE.Scene()

      const camera = new THREE.PerspectiveCamera(
        35,
        1,
        0.1,
        50
      )

      camera.position.set(0, 0.12, 4.9)

      const ambientLight = new THREE.HemisphereLight(
        0xfff7df,
        0x40583f,
        2.4
      )

      const sunlight = new THREE.DirectionalLight(
        0xfff8e8,
        3.2
      )

      sunlight.position.set(-3, 4, 5)

      scene.add(ambientLight, sunlight)

      texture = createEarthTexture()
      texture.anisotropy =
        renderer.capabilities.getMaxAnisotropy()

      const earth = new THREE.Group()
      earth.rotation.z = -0.15
      earth.rotation.y = 0.1

      const globe = new THREE.Mesh(
        new THREE.SphereGeometry(1.08, 80, 56),
        new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.83,
          metalness: 0.03,
        })
      )

      earth.add(globe)
      addDecorativePin(earth)
      scene.add(earth)

      function render() {
        if (!disposed) {
          renderer.render(scene, camera)
        }
      }

      function resize() {
        const width = container.clientWidth
        const height = container.clientHeight

        if (!width || !height) return

        renderer.setSize(width, height, false)

        camera.aspect = width / height
        camera.updateProjectionMatrix()

        render()
      }

      function animate(time) {
        if (disposed) return

        const delta =
          previousTime === null
            ? 0
            : Math.min((time - previousTime) / 1000, 0.06)

        previousTime = time

        if (!document.hidden) {
          earth.rotation.y += delta * 0.15
          render()
        }

        frameId = requestAnimationFrame(animate)
      }

      updateMotion = () => {
        if (frameId !== null) {
          cancelAnimationFrame(frameId)
          frameId = null
        }

        previousTime = null

        if (motionPreference.matches) {
          render()
        } else {
          frameId = requestAnimationFrame(animate)
        }
      }

      observer = new ResizeObserver(resize)
      observer.observe(container)

      motionPreference.addEventListener('change', updateMotion)

      resize()
      updateMotion()
    } catch (error) {
      console.warn('3D globe unavailable:', error)
      cleanup()
      setUnavailable(true)
    }

    return cleanup
  }, [])

  return (
    <div className="loading-globe-stage" aria-hidden="true">
      <div className="loading-globe-shadow" />

      <div
        ref={containerRef}
        className="loading-globe-canvas"
      />

      {unavailable && (
        <div className="loading-globe-fallback" />
      )}
    </div>
  )
}

export default function LoadingGuide({
  destination,
  visitDate,
  onHome,
}) {
  return (
    <section className="loading-guide">
      <header className="loading-guide-header">
        <div className="loading-guide-header-inner">
          <button
            type="button"
            onClick={onHome}
            className="loading-guide-brand"
            aria-label="Cancel search and return home"
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

          <span className="loading-guide-header-label">
            Preparing your trip
          </span>
        </div>
      </header>

      <div className="loading-guide-content">
        <div className="loading-guide-destination">
          <svg
            viewBox="0 0 24 24"
            width="17"
            height="17"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>

          <span>{destination || 'Your next adventure'}</span>
        </div>

        <LoadingGlobe />

        <h1>Finding your next adventure.</h1>

        <p className="loading-guide-tagline">
          A whole world of outside.
        </p>

        <p
          className="loading-guide-status"
          role="status"
          aria-live="polite"
        >
          Preparing your trails, forecast, and packing guide…
        </p>

        <div className="loading-guide-date">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M8 3v4M16 3v4M3 11h18" />
          </svg>

          <span>{formatVisitDate(visitDate)}</span>
        </div>
      </div>
    </section>
  )
}
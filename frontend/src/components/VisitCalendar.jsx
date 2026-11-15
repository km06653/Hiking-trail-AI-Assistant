
import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import './VisitCalendar.css'

export function localDateString(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function formatVisitDate(value) {
  if (!value) return 'Choose a date'

  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function VisitCalendar({ value, onChange }) {
  const headingId = useId()

  const triggerRef = useRef(null)
  const popoverRef = useRef(null)

  const today = localDateString()
  const selected = new Date(`${value || today}T12:00:00`)

  const [isOpen, setIsOpen] = useState(false)

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  )

  const [position, setPosition] = useState({
    top: 0,
    left: 0,
  })

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()

  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const currentDate = new Date()

  const canGoBack =
    year * 12 + month >
    currentDate.getFullYear() * 12 + currentDate.getMonth()

  function updatePosition() {
    if (!triggerRef.current) return

    const rect = triggerRef.current.getBoundingClientRect()

    const popupWidth = Math.min(330, window.innerWidth - 32)
    const popupHeight = 390
    const spacing = 10

    let left = rect.left

    // Keep the calendar inside the horizontal viewport.
    left = Math.max(
      16,
      Math.min(left, window.innerWidth - popupWidth - 16)
    )

    // Show below the button unless there isn't enough room.
    let top = rect.bottom + spacing

    if (top + popupHeight > window.innerHeight - 16) {
      top = rect.top - popupHeight - spacing
    }

    // Prevent the calendar from going above the viewport.
    top = Math.max(16, top)

    setPosition({ top, left })
  }

  function openCalendar() {
    setVisibleMonth(
      new Date(selected.getFullYear(), selected.getMonth(), 1)
    )

    setIsOpen(true)
  }

  function closeCalendar() {
    setIsOpen(false)
  }

  function selectDay(day) {
    const nextDate = localDateString(new Date(year, month, day))

    if (nextDate < today) return

    onChange(nextDate)
    closeCalendar()
  }

  // Position the popup and keep it correctly positioned while scrolling.
  useEffect(() => {
    if (!isOpen) return

    updatePosition()

    function handleResize() {
      updatePosition()
    }

    function handleScroll() {
      updatePosition()
    }

    window.addEventListener('resize', handleResize)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [isOpen, visibleMonth])

  // Close when the user clicks outside the trigger and calendar.
  useEffect(() => {
    if (!isOpen) return

    function handlePointerDown(event) {
      const clickedTrigger = triggerRef.current?.contains(event.target)
      const clickedPopover = popoverRef.current?.contains(event.target)

      if (!clickedTrigger && !clickedPopover) {
        closeCalendar()
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        closeCalendar()
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const calendarPopover = isOpen ? (
    <div
      ref={popoverRef}
      className="tm-calendar-popover"
      style={{
        position: 'fixed',
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      role="dialog"
      aria-label="Choose your visit date"
    >
      <div className="tm-calendar-heading">
        <button
          type="button"
          aria-label="Previous month"
          disabled={!canGoBack}
          onClick={() => {
            setVisibleMonth(new Date(year, month - 1, 1))
          }}
        >
          ‹
        </button>

        <h3 id={headingId} aria-live="polite">
          {visibleMonth.toLocaleDateString(undefined, {
            month: 'long',
            year: 'numeric',
          })}
        </h3>

        <button
          type="button"
          aria-label="Next month"
          onClick={() => {
            setVisibleMonth(new Date(year, month + 1, 1))
          }}
        >
          ›
        </button>
      </div>

      <div
        className="tm-calendar-grid"
        role="group"
        aria-labelledby={headingId}
      >
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <span
            key={day}
            className="tm-calendar-weekday"
            aria-hidden="true"
          >
            {day}
          </span>
        ))}

        {Array.from({ length: firstWeekday }, (_, index) => (
          <span key={`blank-${index}`} aria-hidden="true" />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1
          const date = new Date(year, month, day)
          const dateString = localDateString(date)

          const isSelected = dateString === value
          const isToday = dateString === today

          return (
            <button
              key={day}
              type="button"
              className={[
                'tm-calendar-day',
                isSelected ? 'is-selected' : '',
                isToday ? 'is-today' : '',
              ].join(' ')}
              disabled={dateString < today}
              aria-label={date.toLocaleDateString(undefined, {
                dateStyle: 'full',
              })}
              aria-pressed={isSelected}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => selectDay(day)}
            >
              {day}
            </button>
          )
        })}
      </div>

      <div className="tm-calendar-footer">
        <button
          type="button"
          onClick={() => {
            onChange(today)
            closeCalendar()
          }}
        >
          Today
        </button>

        <span>Choose your day outside.</span>
      </div>
    </div>
  ) : null

  return (
    <div className={`tm-calendar ${isOpen ? 'is-open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className="tm-calendar-trigger"
        aria-label={`Visit date: ${formatVisitDate(value)}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => {
          if (isOpen) {
            closeCalendar()
          } else {
            openCalendar()
          }
        }}
      >
        <svg
          width="21"
          height="21"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="16" rx="3" />
          <path d="M8 3v4M16 3v4M3 11h18" />
        </svg>

        <span>{formatVisitDate(value)}</span>

        <svg
          className="tm-calendar-chevron"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {isOpen &&
        createPortal(calendarPopover, document.body)}
    </div>
  )
}

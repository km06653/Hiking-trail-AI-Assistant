import { useId, useRef, useState } from 'react'
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
  const detailsRef = useRef(null)
  const today = localDateString()
  const selected = new Date(`${value || today}T12:00:00`)

  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  )

  const year = visibleMonth.getFullYear()
  const month = visibleMonth.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const currentDate = new Date()
  const canGoBack =
    year * 12 + month >
    currentDate.getFullYear() * 12 + currentDate.getMonth()

  function closeCalendar() {
    if (!detailsRef.current) return

    detailsRef.current.open = false
    detailsRef.current.querySelector('summary')?.focus()
  }

  function selectDay(day) {
    const nextDate = localDateString(new Date(year, month, day))

    if (nextDate < localDateString()) return

    onChange(nextDate)
    closeCalendar()
  }

  return (
    <details
      ref={detailsRef}
      className="tm-calendar"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          closeCalendar()
        }
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          event.currentTarget.open = false
        }
      }}
    >
      <summary
        className="tm-calendar-trigger"
        aria-label={`Visit date: ${formatVisitDate(value)}`}
        onClick={() => {
          setVisibleMonth(
            new Date(selected.getFullYear(), selected.getMonth(), 1)
          )
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
      </summary>

      <div className="tm-calendar-popover">
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
              onChange(localDateString())
              closeCalendar()
            }}
          >
            Today
          </button>

          <span>Choose your day outside.</span>
        </div>
      </div>
    </details>
  )
}
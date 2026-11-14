import { useState } from "react";
import "./TrailMateHero.css";

export default function TrailMateHero({
  onPlanTrip,
  onSavedPlaces,
}) {
  const [destination, setDestination] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (destination.trim()) {
      onPlanTrip?.(destination.trim());
    }
  }

  return (
    <section className="trailmate-hero">
      <nav className="trailmate-nav">
        <a className="trailmate-brand" href="/" aria-label="TrailMate home">
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

          <span>TrailMate</span>
          <span className="trailmate-ai">AI</span>
        </a>

        <div className="trailmate-links">
          <a className="active" href="#explore">Explore</a>
          <a href="#how">How it works</a>

          <button
            className="saved-places"
            type="button"
            onClick={onSavedPlaces}
          >
            ♡ Saved places
          </button>
        </div>
      </nav>

      <div className="trailmate-content">
        <div className="trailmate-eyebrow">
          Less planning. More wandering.
        </div>

        <h1>
          Your next adventure.
          <br />
          <em>A little more wild.</em>
        </h1>

        <p className="trailmate-description">
          Find your kind of outside. Meet the trail companion that helps
          turn “we should go” into a plan.
        </p>

        <form className="trailmate-search" onSubmit={handleSubmit}>
          <svg
            className="search-location"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="7" />
            <path d="M12 1v22M1 12h22" />
          </svg>

          <input
            aria-label="Where do you want to explore?"
            placeholder="Where do you want to explore?"
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            required
          />

          <button type="submit">
            Plan my adventure <span aria-hidden="true">↗</span>
          </button>
        </form>

        <div className="trailmate-suggestions">
          <span>A little inspiration</span>

          {["Big Sur", "Yosemite", "Lake Tahoe"].map((place) => (
            <button
              key={place}
              type="button"
              onClick={() => setDestination(place)}
            >
              {place} <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>

      <a className="trailmate-scroll" href="#explore">
        Take the scenic route ↓
      </a>

      <div className="trailmate-caption">
        <span aria-hidden="true">⌖</span>
        <p>
          OUT THERE IS A GOOD PLACE TO BE.
          <br />
          Find a moment that feels like this.
        </p>
      </div>
    </section>
  );
}
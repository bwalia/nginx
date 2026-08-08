import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { categoryLabels, slides } from '../data/features'

export function Walkthrough() {
  const [index, setIndex] = useState(0)
  const slide = slides[index]
  const progress = useMemo(
    () => ((index + 1) / slides.length) * 100,
    [index],
  )

  const go = useCallback((next: number) => {
    setIndex(Math.max(0, Math.min(slides.length - 1, next)))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        go(index + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        go(index - 1)
      } else if (e.key === 'Home') {
        go(0)
      } else if (e.key === 'End') {
        go(slides.length - 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, index])

  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">Feature walkthrough</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Every capability, slide by slide
        </h1>
        <p className="lede">
          Use arrow keys or the rail. {slides.length} slides covering WAF, bots,
          DoS, API security, privacy, and operations.
        </p>
      </section>

      <div className="deck">
        <aside className="panel deck-rail" aria-label="Slide list">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`rail-item ${i === index ? 'active' : ''}`}
              onClick={() => go(i)}
            >
              <span className="idx">
                {String(i + 1).padStart(2, '0')} · {categoryLabels[s.category]}
              </span>
              <span className="ttl">{s.title}</span>
            </button>
          ))}
        </aside>

        <article className="panel slide" aria-live="polite">
          <div className="progress" aria-hidden>
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="slide-body">
            <span className="slide-category">{slide.eyebrow}</span>
            <h2>{slide.title}</h2>
            <p className="subtitle">{slide.subtitle}</p>
            <ul className="bullets">
              {slide.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>

            {(slide.policySnippet || slide.metric) && (
              <div className="slide-grid">
                {slide.policySnippet ? (
                  <pre className="snippet">{slide.policySnippet}</pre>
                ) : (
                  <div />
                )}
                {slide.metric ? (
                  <div className="slide-metric">
                    <strong>{slide.metric.value}</strong>
                    <span>{slide.metric.label}</span>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="slide-footer">
            <p className="hint">{slide.demoHint}</p>
            <div className="cta-row" style={{ marginTop: 0 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => go(index - 1)}
                disabled={index === 0}
              >
                Previous
              </button>
              {index < slides.length - 1 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => go(index + 1)}
                >
                  Next
                </button>
              ) : (
                <Link className="btn btn-primary" to="/lab">
                  Open attack lab
                </Link>
              )}
            </div>
          </div>
        </article>
      </div>
    </>
  )
}

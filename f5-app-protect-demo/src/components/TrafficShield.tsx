import { useEffect, useState } from 'react'

const stages = ['Client', 'NGINX Plus', 'App Protect', 'Upstream']

export function TrafficShield() {
  const [active, setActive] = useState(0)
  const [blocking, setBlocking] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setActive((prev) => {
        const next = (prev + 1) % 8
        setBlocking(next === 2 || next === 3)
        return next % 4
      })
    }, 900)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="panel shield">
      <div className="shield-title">
        <h3>Live inspection path</h3>
        <span>sim · enforcement engine</span>
      </div>
      <div className="packets" aria-hidden>
        <span className="packet" />
        <span className="packet bad" />
        <span className="packet" />
        <span className="packet bad" />
      </div>
      <div className="pipeline">
        {stages.map((stage, i) => (
          <div
            key={stage}
            className={`stage ${active === i ? 'active' : ''} ${
              blocking && i === 2 ? 'blocking' : ''
            }`}
          >
            <div className="label">Hop {i + 1}</div>
            <div className="name">{stage}</div>
          </div>
        ))}
      </div>
      <p className="lede" style={{ marginTop: '1.1rem', fontSize: '0.88rem' }}>
        Clean traffic passes through. Signature hits, bots, schema violations, and
        geo/IP intel decisions stop at the App Protect stage — without an extra proxy hop.
      </p>
    </div>
  )
}

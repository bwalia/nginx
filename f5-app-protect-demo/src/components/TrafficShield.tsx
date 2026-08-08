import { useEffect, useState } from 'react'

const stages = ['TPP / Client', 'NGINX Plus', 'App Protect', 'Bank upstream']

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
        <h3>Meridian inspection path</h3>
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
        Licensed TPP and retail traffic pass. Stuffing bots, XXE in SEPA, forged JWTs,
        and schema violations stop at App Protect — before core banking upstreams.
      </p>
    </div>
  )
}

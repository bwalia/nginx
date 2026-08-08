import { useState } from 'react'
import { nginxSnippet, policies } from '../data/policies'

export function Policies() {
  const [activeId, setActiveId] = useState(policies[0].id)
  const [showNginx, setShowNginx] = useState(false)
  const active = policies.find((p) => p.id === activeId) ?? policies[0]

  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">Policy explorer</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Declarative security as code
        </h1>
        <p className="lede">
          Sample App Protect policies in JSON — baseline blocking, OpenAPI API guard,
          transparent onboarding, and geo/IP intelligence.
        </p>
      </section>

      <div className="chips" role="tablist" aria-label="Policies">
        {policies.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activeId === p.id}
            className={`chip ${activeId === p.id ? 'active' : ''}`}
            onClick={() => {
              setActiveId(p.id)
              setShowNginx(false)
            }}
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          className={`chip ${showNginx ? 'active' : ''}`}
          onClick={() => setShowNginx(true)}
        >
          nginx.conf
        </button>
      </div>

      <div className="panel" style={{ padding: '1.25rem' }}>
        {showNginx ? (
          <>
            <h2 style={{ fontSize: '1.25rem' }}>NGINX Plus snippet</h2>
            <p className="lede" style={{ fontSize: '0.92rem' }}>
              Load the App Protect module, enable the policy file, and stream security
              logs — then turn protection on per location.
            </p>
            <pre className="snippet" style={{ marginTop: '1rem' }}>
              {nginxSnippet}
            </pre>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem' }}>{active.name}</h2>
                <p className="lede" style={{ fontSize: '0.92rem' }}>
                  {active.summary}
                </p>
              </div>
              <div className="chips" style={{ margin: 0 }}>
                {active.tags.map((t) => (
                  <span key={t} className="chip" style={{ cursor: 'default' }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
            <pre className="snippet" style={{ marginTop: '1rem' }}>
              {active.json}
            </pre>
          </>
        )}
      </div>
    </>
  )
}

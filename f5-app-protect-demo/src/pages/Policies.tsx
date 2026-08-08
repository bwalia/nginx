import { useState } from 'react'
import { bank } from '../data/banking'
import { nginxSnippet, policies } from '../data/policies'

export function Policies() {
  const [activeId, setActiveId] = useState(policies[0].id)
  const [showNginx, setShowNginx] = useState(false)
  const active = policies.find((p) => p.id === activeId) ?? policies[0]

  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">{bank.name} · Policy explorer</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Service-scoped declarative policies
        </h1>
        <p className="lede">
          PCI retail, FAPI Open Banking, card acquiring, SEPA/sanctions, wealth GraphQL,
          and a transparent onboarding pack — versioned beside each service’s OpenAPI.
        </p>
      </section>

      <div className="chips" role="tablist" aria-label="Policies">
        {policies.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={activeId === p.id && !showNginx}
            className={`chip ${activeId === p.id && !showNginx ? 'active' : ''}`}
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
          nginx.conf (OB edge)
        </button>
      </div>

      <div className="panel" style={{ padding: '1.25rem' }}>
        {showNginx ? (
          <>
            <h2 style={{ fontSize: '1.25rem' }}>Open Banking edge snippet</h2>
            <p className="lede" style={{ fontSize: '0.92rem' }}>
              Load App Protect, attach the FAPI policy, stream verbose logs to the Meridian
              SIEM, and optionally enable behavioural DoS on AIS.
            </p>
            <pre className="snippet" style={{ marginTop: '1rem' }}>
              {nginxSnippet}
            </pre>
          </>
        ) : (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
              }}
            >
              <div>
                <div className="tag" style={{ color: 'var(--teal)' }}>
                  {active.service}
                </div>
                <h2 style={{ fontSize: '1.25rem', marginTop: '0.35rem' }}>
                  {active.name}
                </h2>
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

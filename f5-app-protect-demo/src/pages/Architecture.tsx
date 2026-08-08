import { Link } from 'react-router-dom'
import { bank, services } from '../data/banking'

const packages = [
  'app-protect-engine',
  'app-protect-plugin',
  'app-protect-attack-signatures',
  'app-protect-bot-signatures',
  'app-protect-threat-campaigns',
  'app-protect-geoip',
  'app-protect-graphql',
  'app-protect-ip-intelligence',
]

const flows = [
  {
    title: 'Retail APP-fraud chain',
    steps: ['Stuffing /auth/login', 'OTP spray /sca/verify', 'XSS memo', 'PIS JWT forge'],
    control: 'Bots + brute-force + signatures + JWT + OpenAPI',
  },
  {
    title: 'Open Banking TPP abuse',
    steps: ['alg=none JWT', 'BOLA balances', 'Mass-assign skipSca', 'H1 smuggling'],
    control: 'JWT + URL params + OpenAPI + HTTP compliance',
  },
  {
    title: 'Corporate treasury attack',
    steps: ['XXE pain.001', 'Negative amount', 'Sanctioned geo', 'High-value wire'],
    control: 'XML profile + schema + geo/IP intel',
  },
]

export function Architecture() {
  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">{bank.name} · Architecture</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Reference topology for a digital bank
        </h1>
        <p className="lede">
          Dual-edge pattern: NGINX Plus + App Protect at the internet edge and again on
          the Kubernetes Ingress for cloud-native Open Banking and mobile BFFs. Optional
          F5 DoS for NGINX on login and AIS protected objects.
        </p>
      </section>

      <div className="panel" style={{ padding: '1.25rem' }}>
        <h3>Request path</h3>
        <div className="arch-flow">
          <div className="arch-node">
            <div className="n">Client / TPP</div>
            <div className="d">Browser · app · licensed TPP</div>
          </div>
          <div className="arch-node">
            <div className="n">NGINX Plus</div>
            <div className="d">TLS · mTLS · routing</div>
          </div>
          <div className="arch-node accent">
            <div className="n">App Protect</div>
            <div className="d">WAF · bots · schemas</div>
          </div>
          <div className="arch-node">
            <div className="n">DoS engine</div>
            <div className="d">L7 stress · bad actors</div>
          </div>
          <div className="arch-node">
            <div className="n">Bank upstreams</div>
            <div className="d">RIB · OB · PAY · WIRE · WM</div>
          </div>
        </div>
      </div>

      <h2 style={{ margin: '2rem 0 0.75rem' }}>Service map</h2>
      <div className="deploy-grid">
        {services.map((s) => (
          <article key={s.id} className="feature-card">
            <div className="tag">{s.short}</div>
            <h3 style={{ marginTop: '0.45rem' }}>{s.name}</h3>
            <p className="mono host" style={{ marginTop: '0.35rem' }}>
              {s.host}
            </p>
            <p>{s.description}</p>
            <div className="chips" style={{ marginBottom: 0 }}>
              {s.compliance.map((c) => (
                <span key={c} className="chip" style={{ cursor: 'default' }}>
                  {c}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <h2 style={{ margin: '2rem 0 0.75rem' }}>Attack narratives → controls</h2>
      <div className="deploy-grid">
        {flows.map((f) => (
          <article key={f.title} className="feature-card">
            <h3>{f.title}</h3>
            <ol className="flow-steps">
              {f.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            <p>
              <strong>Controls: </strong>
              {f.control}
            </p>
          </article>
        ))}
      </div>

      <h2 style={{ margin: '2rem 0 0.75rem' }}>Security packages</h2>
      <div className="panel" style={{ padding: '1.15rem' }}>
        <div className="chips" style={{ margin: 0 }}>
          {packages.map((p) => (
            <span key={p} className="chip" style={{ cursor: 'default' }}>
              {p}
            </span>
          ))}
        </div>
      </div>

      <div className="cta-row" style={{ marginTop: '1.5rem' }}>
        <Link className="btn btn-primary" to="/lab">
          Banking attack lab
        </Link>
        <Link className="btn btn-secondary" to="/walkthrough">
          Feature walkthrough
        </Link>
      </div>

      <p className="footer-note">
        Based on public F5 WAF for NGINX documentation. Meridian Digital Bank is a
        fictional reference customer for demo purposes.
      </p>
    </>
  )
}

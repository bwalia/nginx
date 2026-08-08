import { Link } from 'react-router-dom'
import { TrafficShield } from '../components/TrafficShield'
import { attacks } from '../data/attacks'
import { bank, services } from '../data/banking'

const highlights = [
  {
    tag: 'ATO & fraud',
    title: 'Credential stuffing → APP fraud',
    body: 'Bot defence and brute-force on login/SCA break authorised-push-payment chains before the wire.',
  },
  {
    tag: 'Open Banking',
    title: 'FAPI / OBIE contract security',
    body: 'OpenAPI positive security, JWT shape checks, and BOLA-oriented URL rules on AIS/PIS.',
  },
  {
    tag: 'PCI',
    title: 'Data Guard on receipts',
    body: 'Mask PANs and national IDs when upstream APIs accidentally echo cardholder or KYC data.',
  },
  {
    tag: 'Corporate',
    title: 'SEPA XXE & sanctions geo',
    body: 'XML profiles for pain.001 plus geolocation / IP intelligence on high-value wires.',
  },
  {
    tag: 'Wealth',
    title: 'GraphQL enumeration defence',
    body: 'No introspection, capped depth/batch — stop HNW balance harvesting.',
  },
  {
    tag: 'Mobile',
    title: 'gRPC protobuf awareness',
    body: 'IDL-backed parsing rejects malformed mobile Banking RPCs at the BFF edge.',
  },
]

export function Home() {
  const critical = attacks.filter((a) => a.severity === 'critical').length

  return (
    <>
      <section className="page-hero bank-hero">
        <div className="eyebrow">{bank.name}</div>
        <h1>App Protect for banking web services</h1>
        <p className="lede">
          A sophisticated F5 WAF for NGINX demo modelled on a regulated digital bank —
          retail portal, Open Banking APIs, card acquiring, mobile BFF, corporate SEPA,
          and wealth GraphQL — with {attacks.length} complex attack and allow scenarios.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/walkthrough">
            Feature walkthrough
          </Link>
          <Link className="btn btn-secondary" to="/lab">
            Open banking attack lab
          </Link>
        </div>
      </section>

      <div className="metric-strip">
        <div className="metric">
          <strong>{services.length}</strong>
          <span>Banking services</span>
        </div>
        <div className="metric">
          <strong>{attacks.length}</strong>
          <span>Lab scenarios</span>
        </div>
        <div className="metric">
          <strong>{critical}</strong>
          <span>Critical severity</span>
        </div>
        <div className="metric">
          <strong>PCI+PSD2</strong>
          <span>Control themes</span>
        </div>
      </div>

      <div className="grid-2">
        <TrafficShield />
        <div className="panel" style={{ padding: '1.25rem' }}>
          <h3>Meridian protected estate</h3>
          <ul className="service-list">
            {services.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>
                    <span className="svc-code">{s.short}</span>
                    {s.name}
                  </strong>
                  <span className="mono host">{s.host}</span>
                </div>
                <p>{s.description}</p>
              </li>
            ))}
          </ul>
          <div className="cta-row">
            <Link className="btn btn-ghost" to="/architecture">
              Reference architecture
            </Link>
            <Link className="btn btn-ghost" to="/policies">
              Service policies
            </Link>
          </div>
        </div>
      </div>

      <h2 style={{ margin: '2.25rem 0 1rem' }}>Complex cases this demo covers</h2>
      <div className="grid-3">
        {highlights.map((item) => (
          <article key={item.title} className="feature-card">
            <div className="tag">{item.tag}</div>
            <h3 style={{ marginTop: '0.55rem' }}>{item.title}</h3>
            <p>{item.body}</p>
          </article>
        ))}
      </div>

      <p className="footer-note">
        Educational simulation for {bank.legal}. Not affiliated with F5, Inc. Feature
        names map to public F5 WAF for NGINX documentation. No real customer data.
      </p>
    </>
  )
}

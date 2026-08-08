import { Link } from 'react-router-dom'
import { TrafficShield } from '../components/TrafficShield'

const highlights = [
  {
    tag: 'WAF',
    title: 'Attack signatures & OWASP',
    body: '7,800+ signatures, threat campaigns, evasion checks, and response inspection.',
  },
  {
    tag: 'Bots & DoS',
    title: 'Automation & L7 stress',
    body: 'Classify bots and mitigate Layer 7 DoS with behavioral analytics.',
  },
  {
    tag: 'API',
    title: 'OpenAPI, GraphQL, gRPC, JWT',
    body: 'Contract-first positive security plus protobuf- and token-aware checks.',
  },
  {
    tag: 'Privacy',
    title: 'Data Guard',
    body: 'Mask credit cards, SSNs, and custom patterns before responses leave.',
  },
  {
    tag: 'Access',
    title: 'Geo, IP intel, brute force',
    body: 'Reputation, country rules, cookie integrity, and login abuse controls.',
  },
  {
    tag: 'Ops',
    title: 'Security as code',
    body: 'Declarative JSON policies for GitOps on VM, Docker, or Kubernetes.',
  },
]

export function Home() {
  return (
    <>
      <section className="page-hero">
        <div className="eyebrow">F5 WAF for NGINX</div>
        <h1>App Protect Platform Demo</h1>
        <p className="lede">
          An interactive walkthrough of every major capability — signatures, bots,
          DoS, API schemas, Data Guard, geo/IP intel — plus a simulated attack lab
          and declarative policy explorer.
        </p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/walkthrough">
            Start feature walkthrough
          </Link>
          <Link className="btn btn-secondary" to="/lab">
            Open attack lab
          </Link>
        </div>
      </section>

      <div className="metric-strip">
        <div className="metric">
          <strong>22</strong>
          <span>Walkthrough slides</span>
        </div>
        <div className="metric">
          <strong>13</strong>
          <span>Attack scenarios</span>
        </div>
        <div className="metric">
          <strong>4</strong>
          <span>Sample policies</span>
        </div>
        <div className="metric">
          <strong>3</strong>
          <span>Deploy topologies</span>
        </div>
      </div>

      <div className="grid-2">
        <TrafficShield />
        <div className="panel" style={{ padding: '1.25rem' }}>
          <h3>How to use this demo</h3>
          <ol className="bullets" style={{ marginTop: '1rem' }}>
            <li>Walk the slides — every platform feature, in order.</li>
            <li>Fire attack scenarios in the lab and read security events.</li>
            <li>Inspect declarative policies and an nginx.conf snippet.</li>
            <li>Review VM, Docker, and Kubernetes deployment shapes.</li>
          </ol>
          <div className="cta-row">
            <Link className="btn btn-ghost" to="/policies">
              Policy explorer
            </Link>
            <Link className="btn btn-ghost" to="/architecture">
              Architecture
            </Link>
          </div>
        </div>
      </div>

      <h2 style={{ margin: '2.25rem 0 1rem' }}>Capability map</h2>
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
        Educational simulation of F5 WAF for NGINX (formerly NGINX App Protect WAF).
        Not affiliated with F5, Inc. Feature names map to public product documentation.
      </p>
    </>
  )
}

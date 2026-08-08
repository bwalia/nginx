import { Link } from 'react-router-dom'

const deploys = [
  {
    title: 'VM / bare metal',
    body: 'NGINX Plus and App Protect packages on the host. Ideal when you already run NGINX as an edge or reverse proxy.',
  },
  {
    title: 'Docker',
    body: 'Container image with NGINX + WAF components. Fits staged environments and immutable infrastructure pipelines.',
  },
  {
    title: 'Kubernetes',
    body: 'NGINX Ingress Controller with native App Protect. Bind policies per Ingress via annotations or CRDs.',
  },
]

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

export function Architecture() {
  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">Architecture</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Native protection in the data path
        </h1>
        <p className="lede">
          App Protect is a dynamic module on NGINX Plus — not a separate proxy tier.
          Optional F5 DoS for NGINX adds behavioral Layer 7 mitigation on the same node.
        </p>
      </section>

      <div className="panel" style={{ padding: '1.25rem' }}>
        <h3>Request path</h3>
        <div className="arch-flow">
          <div className="arch-node">
            <div className="n">Client</div>
            <div className="d">Browser / API / bot</div>
          </div>
          <div className="arch-node">
            <div className="n">NGINX Plus</div>
            <div className="d">TLS, routing, proxy</div>
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
            <div className="n">Upstream</div>
            <div className="d">App / API / mesh</div>
          </div>
        </div>
        <p className="hint">
          The plugin bridges NGINX to the enforcement engine. The compiler agent turns
          declarative JSON/YAML into runtime policy. Signature packages update independently.
        </p>
      </div>

      <h2 style={{ margin: '2rem 0 0.75rem' }}>Deployment options</h2>
      <div className="deploy-grid">
        {deploys.map((d) => (
          <article key={d.title} className="feature-card">
            <h3>{d.title}</h3>
            <p>{d.body}</p>
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
        <Link className="btn btn-primary" to="/walkthrough">
          Feature walkthrough
        </Link>
        <Link className="btn btn-secondary" to="/lab">
          Attack lab
        </Link>
      </div>

      <p className="footer-note">
        Based on public F5 WAF for NGINX documentation (docs.nginx.com/waf). Package
        names and feature set reflect current product specs.
      </p>
    </>
  )
}

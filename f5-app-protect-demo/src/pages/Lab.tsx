import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  attacks,
  categories,
  severities,
  simulateLatency,
  type AttackScenario,
  type Severity,
  type Verdict,
} from '../data/attacks'
import { bank, serviceMap, services, type BankingService } from '../data/banking'

interface LogEvent {
  id: string
  ts: string
  scenario: AttackScenario
}

type RunMode = 'idle' | 'single' | 'all'

function supportId() {
  return `aps-${Math.random().toString(16).slice(2, 10)}`
}

function stamp() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19)
}

export function Lab() {
  const [selectedId, setSelectedId] = useState(attacks[0].id)
  const [mode, setMode] = useState<RunMode>('idle')
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [phase, setPhase] = useState(0)
  const [result, setResult] = useState<AttackScenario | null>(null)
  const [events, setEvents] = useState<LogEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState('Idle')
  const [serviceFilter, setServiceFilter] = useState<'all' | BankingService>('all')
  const [categoryFilter, setCategoryFilter] = useState<'all' | string>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | Severity>('all')
  const [query, setQuery] = useState('')
  const [verdictFilter, setVerdictFilter] = useState<'all' | Verdict>('all')
  const runToken = useRef(0)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return attacks.filter((a) => {
      if (serviceFilter !== 'all' && a.service !== serviceFilter) return false
      if (categoryFilter !== 'all' && a.category !== categoryFilter) return false
      if (severityFilter !== 'all' && a.severity !== severityFilter) return false
      if (verdictFilter !== 'all' && a.verdict !== verdictFilter) return false
      if (!q) return true
      const hay = [
        a.name,
        a.description,
        a.path,
        a.feature,
        a.violation,
        a.owasp ?? '',
        a.businessImpact,
        serviceMap[a.service].name,
      ]
        .join(' ')
        .toLowerCase()
      return hay.includes(q)
    })
  }, [serviceFilter, categoryFilter, severityFilter, verdictFilter, query])

  const selected =
    filtered.find((a) => a.id === selectedId) ??
    filtered[0] ??
    attacks.find((a) => a.id === selectedId) ??
    attacks[0]

  const running = mode !== 'idle'

  const barWidth = running
    ? mode === 'all'
      ? Math.max(
          8,
          ((progress.current - 1 + phase / 3) / Math.max(progress.total, 1)) * 100,
        )
      : Math.max(12, (phase / 3) * 100)
    : result
      ? 100
      : 0

  const stats = useMemo(() => {
    const blocked = attacks.filter((a) => a.verdict === 'block').length
    const masked = attacks.filter((a) => a.verdict === 'mask').length
    const allowed = attacks.filter((a) => a.verdict === 'allow').length
    return { total: attacks.length, blocked, masked, allowed }
  }, [])

  const appendEvent = useCallback((scenario: AttackScenario) => {
    setEvents((prev) =>
      [
        {
          id: supportId(),
          ts: stamp(),
          scenario,
        },
        ...prev,
      ].slice(0, 60),
    )
  }, [])

  const execute = useCallback(
    async (scenario: AttackScenario, token: number) => {
      setPhase(1)
      setStage(`${serviceMap[scenario.service].short} edge · TLS terminate`)
      await simulateLatency(110)
      if (runToken.current !== token) return false

      setPhase(2)
      setStage(`App Protect · ${scenario.feature}`)
      await simulateLatency(scenario.verdict === 'allow' ? 160 : 300)
      if (runToken.current !== token) return false

      setPhase(3)
      setStage(
        scenario.verdict === 'allow'
          ? `Allow → ${serviceMap[scenario.service].upstream}`
          : scenario.verdict === 'mask'
            ? 'Data Guard mask · forward redacted body'
            : `Block · ${scenario.violation}`,
      )
      await simulateLatency(120)
      if (runToken.current !== token) return false

      setResult(scenario)
      appendEvent(scenario)
      setStage('Complete')
      return true
    },
    [appendEvent],
  )

  const runOne = useCallback(
    async (scenario: AttackScenario) => {
      const token = ++runToken.current
      setMode('single')
      setError(null)
      setResult(null)
      setProgress({ current: 1, total: 1 })
      setPhase(0)
      setSelectedId(scenario.id)

      try {
        await execute(scenario, token)
      } catch (err) {
        if (runToken.current === token) {
          setError(err instanceof Error ? err.message : 'Simulation failed')
          setStage('Failed')
        }
      } finally {
        if (runToken.current === token) {
          setMode('idle')
          setProgress({ current: 0, total: 0 })
        }
      }
    },
    [execute],
  )

  const runVisible = useCallback(async () => {
    const list = filtered.length ? filtered : attacks
    const token = ++runToken.current
    setMode('all')
    setError(null)
    setResult(null)
    setProgress({ current: 0, total: list.length })
    setPhase(0)

    try {
      for (let i = 0; i < list.length; i++) {
        if (runToken.current !== token) return
        const scenario = list[i]
        setSelectedId(scenario.id)
        setResult(null)
        setPhase(0)
        setProgress({ current: i + 1, total: list.length })
        await execute(scenario, token)
      }
    } catch (err) {
      if (runToken.current === token) {
        setError(err instanceof Error ? err.message : 'Batch simulation failed')
        setStage('Failed')
      }
    } finally {
      if (runToken.current === token) {
        setMode('idle')
        setProgress({ current: 0, total: 0 })
        setStage('Complete')
      }
    }
  }, [execute, filtered])

  const cancel = useCallback(() => {
    runToken.current += 1
    setMode('idle')
    setProgress({ current: 0, total: 0 })
    setStage('Cancelled')
  }, [])

  useEffect(() => {
    void runOne(attacks[0])
    return () => {
      runToken.current += 1
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function selectScenario(scenario: AttackScenario) {
    if (running) cancel()
    void runOne(scenario)
  }

  const svc = serviceMap[selected.service]

  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">{bank.soc} · Attack Lab</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Banking threat simulation console
        </h1>
        <p className="lede">
          {stats.total} real-world cases across retail, Open Banking, cards, mobile,
          corporate SEPA, and wealth GraphQL. Click a scenario to inspect — or run the
          filtered set as a SOC exercise.
        </p>
        <div className="metric-strip lab-metrics">
          <div className="metric">
            <strong>{stats.total}</strong>
            <span>Scenarios</span>
          </div>
          <div className="metric">
            <strong>{stats.blocked}</strong>
            <span>Block</span>
          </div>
          <div className="metric">
            <strong>{stats.masked}</strong>
            <span>Data Guard</span>
          </div>
          <div className="metric">
            <strong>{stats.allowed}</strong>
            <span>Allow (regression)</span>
          </div>
        </div>
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={running}
            onClick={() => void runOne(selected)}
          >
            {mode === 'single' ? 'Inspecting…' : 'Replay scenario'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={running || filtered.length === 0}
            onClick={() => void runVisible()}
          >
            {mode === 'all'
              ? `Running ${progress.current}/${progress.total}…`
              : `Run filtered (${filtered.length})`}
          </button>
          {running ? (
            <button type="button" className="btn btn-ghost" onClick={cancel}>
              Cancel
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEvents([])
                setResult(null)
                setError(null)
                setStage('Idle')
              }}
            >
              Clear log
            </button>
          )}
        </div>
      </section>

      <div className="lab-filters panel">
        <label className="filter-field">
          <span>Search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BOLA, SEPA, JWT, PAN…"
          />
        </label>
        <label className="filter-field">
          <span>Service</span>
          <select
            value={serviceFilter}
            onChange={(e) =>
              setServiceFilter(e.target.value as 'all' | BankingService)
            }
          >
            <option value="all">All services</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.short} — {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Category</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Severity</span>
          <select
            value={severityFilter}
            onChange={(e) =>
              setSeverityFilter(e.target.value as 'all' | Severity)
            }
          >
            <option value="all">All severities</option>
            {severities.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Verdict</span>
          <select
            value={verdictFilter}
            onChange={(e) => setVerdictFilter(e.target.value as 'all' | Verdict)}
          >
            <option value="all">All verdicts</option>
            <option value="block">block</option>
            <option value="mask">mask</option>
            <option value="allow">allow</option>
            <option value="alarm">alarm</option>
          </select>
        </label>
      </div>

      <div className="lab-layout">
        <aside className="panel scenario-list" aria-label="Attack scenarios">
          {filtered.length === 0 ? (
            <p className="hint" style={{ padding: '0.75rem' }}>
              No scenarios match these filters.
            </p>
          ) : (
            filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                className={`scenario ${selected.id === a.id ? 'active' : ''}`}
                onClick={() => selectScenario(a)}
              >
                <span className="cat">
                  {serviceMap[a.service].short} · {a.category}
                </span>
                <span className="name">{a.name}</span>
                <span className={`sev sev-${a.severity}`}>{a.severity}</span>
                <span className={`scenario-badge ${a.verdict}`}>{a.verdict}</span>
              </button>
            ))
          )}
        </aside>

        <div className="panel lab-main">
          <div className="lab-main-head">
            <div>
              <div className="service-pill">
                <span>{svc.short}</span>
                {svc.name}
                <em>{svc.host}</em>
              </div>
              <h2 style={{ fontSize: '1.35rem', marginTop: '0.65rem' }}>
                {selected.name}
              </h2>
              <p className="lede" style={{ marginTop: '0.45rem', fontSize: '0.92rem' }}>
                {selected.description}
              </p>
            </div>
            <div className="lab-head-badges">
              <span className={`sev sev-${selected.severity}`}>{selected.severity}</span>
              {result && !running ? (
                <VerdictPill verdict={result.verdict} />
              ) : null}
              {running ? <span className="verdict alarm">Inspecting</span> : null}
            </div>
          </div>

          <div className="impact-banner">
            <strong>Business impact</strong>
            <span>{selected.businessImpact}</span>
          </div>

          <div className="lab-status" aria-live="polite">
            <div className="lab-status-track">
              <span
                className={`lab-status-bar ${running ? 'active' : ''}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <div className="lab-status-text mono">
              {running
                ? `${stage}${mode === 'all' ? ` · ${progress.current}/${progress.total}` : ''}`
                : result
                  ? `Last result: ${result.verdict.toUpperCase()} · ${result.violation}`
                  : 'Ready'}
            </div>
          </div>

          {error ? (
            <p className="lab-error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="req-box" style={{ marginTop: '1.15rem' }}>
            <dl className="kv">
              <dt>method</dt>
              <dd>{selected.method}</dd>
              <dt>path</dt>
              <dd>{selected.path}</dd>
              <dt>feature</dt>
              <dd>{selected.feature}</dd>
              <dt>upstream</dt>
              <dd>{svc.upstream}</dd>
              {selected.owasp ? (
                <>
                  <dt>OWASP</dt>
                  <dd>{selected.owasp}</dd>
                </>
              ) : null}
              {selected.mitre ? (
                <>
                  <dt>MITRE</dt>
                  <dd>{selected.mitre}</dd>
                </>
              ) : null}
              {selected.headers
                ? Object.entries(selected.headers).flatMap(([k, v]) => [
                    <dt key={`${k}-k`}>{k}</dt>,
                    <dd key={`${k}-v`}>{v}</dd>,
                  ])
                : null}
            </dl>
            {selected.payload ? (
              <pre className="snippet">{selected.payload}</pre>
            ) : null}
          </div>

          {result && !running ? (
            <div className="result-grid">
              <div>
                <h3>Enforcement result</h3>
                <dl className="kv" style={{ marginTop: '0.75rem' }}>
                  <dt>violation</dt>
                  <dd>{result.violation}</dd>
                  {result.signatureId ? (
                    <>
                      <dt>signature</dt>
                      <dd>{result.signatureId}</dd>
                    </>
                  ) : null}
                  <dt>detail</dt>
                  <dd>{result.detail}</dd>
                  {result.policyHint ? (
                    <>
                      <dt>policy</dt>
                      <dd>{result.policyHint}</dd>
                    </>
                  ) : null}
                </dl>
                {result.maskedResponse ? (
                  <>
                    <h3 style={{ marginTop: '1rem' }}>Masked response</h3>
                    <pre className="snippet" style={{ marginTop: '0.5rem' }}>
                      {result.maskedResponse}
                    </pre>
                  </>
                ) : null}
                {result.allowResponse && result.verdict === 'allow' ? (
                  <>
                    <h3 style={{ marginTop: '1rem' }}>Upstream body</h3>
                    <pre className="snippet" style={{ marginTop: '0.5rem' }}>
                      {result.allowResponse}
                    </pre>
                  </>
                ) : null}
              </div>
              <div className="soc-card">
                <h3>SOC notes</h3>
                <p>{result.socNotes}</p>
                <div className="compliance-row">
                  {svc.compliance.map((c) => (
                    <span key={c} className="chip" style={{ cursor: 'default' }}>
                      {c}
                    </span>
                  ))}
                </div>
                <pre className="snippet log-mini">
                  {JSON.stringify(
                    {
                      support_id: events[0]?.id ?? 'aps-pending',
                      vs_name: result.violation,
                      method: result.method,
                      uri: result.path,
                      service: result.service,
                      enforcementState:
                        result.verdict === 'allow' ? 'allow' : 'block',
                      severity: result.severity,
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          ) : null}

          <h3 style={{ marginTop: '1.4rem' }}>Security event console</h3>
          <div className="event-log" aria-live="polite">
            {events.length === 0 ? (
              <div className="event">waiting for traffic…</div>
            ) : (
              events.map((e) => (
                <div key={e.id} className={`event ${e.scenario.verdict}`}>
                  <span className="ts">{e.ts}</span>
                  {'  '}
                  [{serviceMap[e.scenario.service].short}]
                  {'  '}
                  support_id={e.id}
                  {'  '}
                  {e.scenario.verdict.toUpperCase()}
                  {'  '}
                  {e.scenario.violation}
                  {'  '}
                  {e.scenario.method} {e.scenario.path}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function VerdictPill({ verdict }: { verdict: Verdict }) {
  const label =
    verdict === 'block'
      ? 'Blocked'
      : verdict === 'mask'
        ? 'Masked'
        : verdict === 'alarm'
          ? 'Alarm'
          : 'Allowed'
  return <span className={`verdict ${verdict}`}>{label}</span>
}

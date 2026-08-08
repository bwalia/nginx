import { useMemo, useState } from 'react'
import { attacks, simulateLatency, type AttackScenario, type Verdict } from '../data/attacks'

interface LogEvent {
  id: string
  ts: string
  scenario: AttackScenario
}

function supportId() {
  return `aps-${Math.random().toString(16).slice(2, 10)}`
}

export function Lab() {
  const [selectedId, setSelectedId] = useState(attacks[0].id)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<AttackScenario | null>(null)
  const [events, setEvents] = useState<LogEvent[]>([])

  const selected = useMemo(
    () => attacks.find((a) => a.id === selectedId) ?? attacks[0],
    [selectedId],
  )

  async function run(scenario: AttackScenario) {
    setRunning(true)
    setResult(null)
    await simulateLatency(scenario.verdict === 'allow' ? 280 : 520)
    setResult(scenario)
    setEvents((prev) => [
      {
        id: supportId(),
        ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
        scenario,
      },
      ...prev,
    ].slice(0, 40))
    setRunning(false)
  }

  async function runAll() {
    setRunning(true)
    setResult(null)
    for (const scenario of attacks) {
      setSelectedId(scenario.id)
      await simulateLatency(320)
      setResult(scenario)
      setEvents((prev) => [
        {
          id: supportId(),
          ts: new Date().toISOString().replace('T', ' ').slice(0, 19),
          scenario,
        },
        ...prev,
      ].slice(0, 40))
    }
    setRunning(false)
  }

  return (
    <>
      <section className="page-hero" style={{ marginBottom: '1rem' }}>
        <div className="eyebrow">Attack lab</div>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', maxWidth: 'none' }}>
          Simulate traffic against App Protect
        </h1>
        <p className="lede">
          Educational simulation — select a scenario, inspect the request, and watch
          the enforcement verdict plus a security event stream.
        </p>
        <div className="cta-row">
          <button
            type="button"
            className="btn btn-primary"
            disabled={running}
            onClick={() => run(selected)}
          >
            {running ? 'Inspecting…' : 'Send request'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={running}
            onClick={runAll}
          >
            Run all scenarios
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setEvents([])
              setResult(null)
            }}
          >
            Clear log
          </button>
        </div>
      </section>

      <div className="lab-layout">
        <aside className="panel scenario-list" aria-label="Attack scenarios">
          {attacks.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`scenario ${selectedId === a.id ? 'active' : ''}`}
              onClick={() => {
                setSelectedId(a.id)
                setResult(null)
              }}
            >
              <span className="cat">{a.category}</span>
              <span className="name">{a.name}</span>
            </button>
          ))}
        </aside>

        <div className="panel lab-main">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontSize: '1.35rem' }}>{selected.name}</h2>
              <p className="lede" style={{ marginTop: '0.45rem', fontSize: '0.92rem' }}>
                {selected.description}
              </p>
            </div>
            {result ? <VerdictPill verdict={result.verdict} /> : null}
          </div>

          <div className="req-box" style={{ marginTop: '1.15rem' }}>
            <dl className="kv">
              <dt>method</dt>
              <dd>{selected.method}</dd>
              <dt>path</dt>
              <dd>{selected.path}</dd>
              <dt>feature</dt>
              <dd>{selected.feature}</dd>
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

          {result ? (
            <div style={{ marginTop: '1.15rem' }}>
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
              </dl>
              {result.maskedResponse ? (
                <pre className="snippet" style={{ marginTop: '0.75rem' }}>
                  {result.maskedResponse}
                </pre>
              ) : null}
            </div>
          ) : (
            <p className="hint" style={{ marginTop: '1.15rem' }}>
              Press <strong>Send request</strong> to run the App Protect simulation.
            </p>
          )}

          <h3 style={{ marginTop: '1.4rem' }}>Security event console</h3>
          <div className="event-log" aria-live="polite">
            {events.length === 0 ? (
              <div className="event">waiting for traffic…</div>
            ) : (
              events.map((e) => (
                <div key={e.id} className={`event ${e.scenario.verdict}`}>
                  <span className="ts">{e.ts}</span>
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

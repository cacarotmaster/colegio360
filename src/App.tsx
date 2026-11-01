import { useEffect, useMemo, useRef, useState } from 'react'
import casos from './content/casos.json'
import {
  applyAnswer,
  dayMedal,
  dayScore,
  EVIDENCE_BY_ZONE,
  gradeSim,
  loadProgress,
  markZoneDone,
  newProgress,
  nextZone,
  resetProgress,
  saveProgress,
  zoneCases,
} from './game'
import type { CaseItem, Progress, Role, ZoneId } from './types'
import { LEVELS, ROLE_META, ROUTES, ZONES } from './zones'

const ALL = [
  ...(casos as any).docente.map((c: any) => ({ ...c, role: 'docente' as Role })),
  ...(casos as any).coordinador.map((c: any) => ({ ...c, role: 'coordinador' as Role })),
] as (CaseItem & { role: Role })[]

type Screen = 'onboard' | 'map' | 'zone' | 'zoneend' | 'dayend' | 'sim' | 'simend'

function shuffled<T>(a: T[]): T[] {
  const x = [...a]
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[x[i], x[j]] = [x[j], x[i]]
  }
  return x
}

function Meter({ icon, label, value }: { icon: string; label: string; value: number }) {
  const color = value >= 70 ? '#10b981' : value >= 45 ? '#eab308' : '#ef4444'
  return (
    <div className="meter" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} title={`${label}: ${value}`}>
      <span className="mi" aria-hidden="true">{icon}</span>
      <div className="mbar"><span style={{ width: `${value}%`, background: color }} /></div>
      <b>{value}</b>
    </div>
  )
}

export default function App() {
  const [progress, setProgress] = useState<Progress | null>(() => loadProgress())
  const [screen, setScreen] = useState<Screen>(() => (loadProgress() ? 'map' : 'onboard'))
  const [role, setRole] = useState<Role>('docente')
  const [name, setName] = useState('')
  const [activeZone, setActiveZone] = useState<ZoneId | null>(null)
  const [zoneList, setZoneList] = useState<CaseItem[]>([])
  const [caseIdx, setCaseIdx] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [zoneGain, setZoneGain] = useState(0)

  const [simItems, setSimItems] = useState<CaseItem[]>([])
  const [simAnswers, setSimAnswers] = useState<number[]>([])
  const [simIdx, setSimIdx] = useState(0)
  const [simResult, setSimResult] = useState<{ score: number; byZone: Record<string, { ok: number; total: number }> } | null>(null)
  const simAnswersRef = useRef<number[]>([])
  const simDoneRef = useRef(false)

  useEffect(() => {
    if (progress) saveProgress(progress)
  }, [progress])

  if (!progress || screen === 'onboard') {
    return (
      <div className="onboard">
        <div className="onboard-card">
          <div className="eyebrow">Concurso docente · Decreto 1278 de 2002</div>
          <h1>Colegio <span className="amber">360</span></h1>
          <p className="lead">
            Un día completo en una institución educativa. Elige tu rol, recorre el colegio y decide.
            Cada actuación deja huella en el <b>clima</b>, el <b>aprendizaje</b> y la <b>gestión</b>.
          </p>

          <div className="roles">
            {(['docente', 'coordinador'] as Role[]).map((r) => (
              <button
                key={r}
                className={`rolecard ${role === r ? 'on' : ''}`}
                onClick={() => setRole(r)}
                type="button"
              >
                <span className="roleicon">{ROLE_META[r].icon}</span>
                <b>{ROLE_META[r].title}</b>
                <span>{ROLE_META[r].tagline}</span>
                {role === r && <span className="tick">✓</span>}
              </button>
            ))}
          </div>

          <label className="lbl" htmlFor="n">Tu nombre</label>
          <input id="n" value={name} maxLength={30} autoComplete="off" onChange={(e) => setName(e.target.value)} placeholder="Escribe tu nombre" />
          <button
            className="btn primary big"
            disabled={!name.trim()}
            onClick={() => {
              setProgress(newProgress(name, role))
              setScreen('map')
            }}
          >
            Entrar al colegio 🚪
          </button>
          <p className="tiny">Progreso guardado en este dispositivo. Sin cuentas ni datos personales.</p>
        </div>
      </div>
    )
  }

  const route = ROUTES[progress.role]
  const next = nextZone(progress)
  const score = dayScore(progress)
  const medal = dayMedal(score)

  function startZone(z: ZoneId) {
    const list = zoneCases(ALL.filter((c) => c.role === progress!.role), progress!.role, z).map((c) => ({ ...c, options: shuffled(c.options) }))
    if (!list.length) return
    setActiveZone(z)
    setZoneList(list)
    setCaseIdx(0)
    setChosen(null)
    setZoneGain(0)
    setScreen('zone')
  }

  function answer(i: number) {
    if (chosen !== null || !activeZone) return
    const item = zoneList[caseIdx]
    const before = progress!
    const after = applyAnswer(before, item, i)
    const delta = after.xp - before.xp
    setZoneGain((g) => g + delta)
    setProgress(after)
    setChosen(i)
  }

  function nextCase() {
    if (caseIdx + 1 < zoneList.length) {
      setCaseIdx(caseIdx + 1)
      setChosen(null)
    } else {
      if (activeZone) setProgress((p) => (p ? markZoneDone(p, activeZone) : p))
      setScreen('zoneend')
    }
  }

  function startSim() {
    const pool = ALL.filter((c) => c.role === progress!.role)
    const items = shuffled(pool).slice(0, Math.min(40, pool.length)).map((c) => ({ ...c, options: shuffled(c.options) }))
    if (!items.length) return
    setSimItems(items)
    simDoneRef.current = false
    simAnswersRef.current = Array(items.length).fill(-1)
    setSimAnswers(Array(items.length).fill(-1))
    setSimIdx(0)
    setSimResult(null)
    setScreen('sim')
  }

  function finishSim() {
    if (simDoneRef.current) return
    simDoneRef.current = true
    const res = gradeSim(simItems, simAnswersRef.current)
    setSimResult(res)
    setProgress((p) => (p ? { ...p, simBest: Math.max(p.simBest, res.score), simCount: p.simCount + 1 } : p))
    setScreen('simend')
  }

  if (screen === 'zone') {
    const item = zoneList[caseIdx]
    const zone = ZONES[item.zone]
    const selected = chosen !== null ? item.options[chosen] : null
    return (
      <div className="app" style={{ ['--zc' as any]: zone.color }}>
        <header className="topbar">
          <button className="icon-btn" onClick={() => setScreen('map')} aria-label="Volver al mapa">←</button>
          <div className="zbadge"><span>{zone.icon}</span> {zone.name}</div>
          <div className="moment">{item.moment}</div>
        </header>
        <div className="roomdoor" aria-hidden="true" />
        <main className={`scene ${chosen !== null ? (selected?.level === 3 ? 'good' : selected?.level === 2 ? 'ok' : 'bad') : ''}`}>
          <div className="progressline" role="progressbar" aria-label="Avance de la zona" aria-valuemin={0} aria-valuemax={zoneList.length} aria-valuenow={caseIdx + (chosen !== null ? 1 : 0)}><span style={{ width: `${((caseIdx + (chosen !== null ? 1 : 0)) / zoneList.length) * 100}%` }} /></div>
          <div className="casenum">Situación {caseIdx + 1} de {zoneList.length}</div>
          <div className="scenebox">
            <span className="scenelbl">📍 {zone.name} · {item.moment}</span>
            <p>{item.scene}</p>
          </div>
          <h2 className="prompt">{item.prompt}</h2>

          <div className="opts">
            {item.options.map((o, i) => {
              let cls = 'opt'
              if (chosen !== null) {
                if (o.level === 3) cls += ' best'
                else if (i === chosen) cls += ' chosen'
                else cls += ' dim'
              }
              return (
                <button key={i} className={cls} onClick={() => answer(i)} disabled={chosen !== null}>
                  <span className="letter">{String.fromCharCode(65 + i)}</span>
                  <span>{o.text}</span>
                </button>
              )
            })}
          </div>

          {selected && (
            <div className={`feedback lvl-${selected.level}`} aria-live="polite">
              <div className="fbhead">
                <span className="lvlicon">{LEVELS[selected.level].icon}</span>
                Desempeño {LEVELS[selected.level].name.toLowerCase()}
              </div>
              <p>{item.why}</p>
              {selected.level === 3 && (
                <div className="evidence">📎 Evidencia desbloqueada: <b>{EVIDENCE_BY_ZONE[item.zone]}</b></div>
              )}
              {selected.level < 3 && (
                <div className="evidence bad">📎 Sin evidencia: en el examen esta actuación probablemente se ubicaría por debajo del nivel avanzado.</div>
              )}
              <div className="src">Marco: {item.source}</div>
              <button className="btn primary" onClick={nextCase}>
                {caseIdx + 1 >= zoneList.length ? 'Salir de la zona' : 'Siguiente situación ▶'}
              </button>
            </div>
          )}
        </main>
      </div>
    )
  }

  if (screen === 'zoneend') {
    const zone = activeZone ? ZONES[activeZone] : null
    return (
      <div className="app center">
        <div className="card resultcard">
          <div className="bigicon">{zone?.icon ?? '✅'}</div>
          <h2>{zone?.name} completada</h2>
          <p className="lead">
            Ganaste <b>{zoneGain} puntos</b> de experiencia en esta zona. Tus medidores se movieron según la calidad de tus decisiones.
          </p>
          <div className="meters">
            <Meter icon="🌡️" label="Clima" value={progress.climate} />
            <Meter icon="📚" label="Aprendizaje" value={progress.learning} />
            <Meter icon="🧭" label="Gestión" value={progress.management} />
          </div>
          <button className="btn primary big" onClick={() => setScreen('map')}>Volver al mapa 🗺️</button>
          {progress.zonesDone.length >= route.length && (
            <button className="btn ghost-btn" onClick={() => setScreen('dayend')}>Ver informe del día 📋</button>
          )}
        </div>
      </div>
    )
  }

  if (screen === 'dayend') {
    return (
      <div className="app center">
        <div className="card resultcard">
          <div className="bigicon">{medal.icon}</div>
          <div className="eyebrow">{ROLE_META[progress.role].title} · {progress.name}</div>
          <h2>{medal.title}</h2>
          <div className="scorebig"><b>{score}</b><span>/100</span></div>
          <p className="lead">{medal.msg}</p>
          <div className="meters">
            <Meter icon="🌡️" label="Clima" value={progress.climate} />
            <Meter icon="📚" label="Aprendizaje" value={progress.learning} />
            <Meter icon="🧭" label="Gestión" value={progress.management} />
          </div>
          <h3>Evidencias que construiste ({progress.evidence.length})</h3>
          <div className="evidences">
            {progress.evidence.length ? progress.evidence.map((e) => <span key={e} className="ev">📎 {e}</span>) : <p className="tiny">Ninguna. Las evidencias se ganan con decisiones de nivel avanzado.</p>}
          </div>
          <div className="zonesummary">
            {route.map((z) => {
              const ans = progress.answers.filter((a) => a.zone === z)
              const best = ans.filter((a) => a.best).length
              return (
                <div key={z} className="zrow">
                  <span>{ZONES[z].icon} {ZONES[z].name}</span>
                  <b>{best}/{ans.length} avanzadas</b>
                </div>
              )
            })}
          </div>
          <button className="btn primary big" onClick={() => setScreen('map')}>Seguir explorando 🗺️</button>
          <button className="btn ghost-btn" onClick={startSim}>🏁 Hacer simulacro completo</button>
          <button
            className="btn ghost-btn"
            onClick={() => {
              if (confirm('¿Empezar un día nuevo con otro rol? Se borra el avance actual.')) {
                resetProgress()
                setProgress(null)
                setScreen('onboard')
              }
            }}
          >
            Cambiar de rol
          </button>
        </div>
      </div>
    )
  }

  if (screen === 'sim') {
    const item = simItems[simIdx]
    const zone = ZONES[item.zone]
    return (
      <div className="app" style={{ ['--zc' as any]: zone.color }}>
        <header className="topbar">
          <button className="icon-btn" onClick={() => { if (confirm('¿Salir del simulacro? Se perderán las respuestas.')) setScreen('map') }} aria-label="Salir del simulacro">✕</button>
          <div className="progress" role="progressbar" aria-label="Avance del simulacro" aria-valuemin={1} aria-valuemax={simItems.length} aria-valuenow={simIdx + 1}><span style={{ width: `${((simIdx + 1) / simItems.length) * 100}%` }} /></div>
          <div className="moment">{simIdx + 1}/{simItems.length}</div>
        </header>
        <main className="scene">
          <div className="casenum">{zone.icon} {zone.name} · {item.moment}</div>
          <div className="scenebox"><span className="scenelbl">Caso</span><p>{item.scene}</p></div>
          <h2 className="prompt">{item.prompt}</h2>
          <div className="opts">
            {item.options.map((o, i) => (
              <button
                key={i}
                className={`opt ${simAnswers[simIdx] === i ? 'picked' : ''}`}
                aria-pressed={simAnswers[simIdx] === i}
                onClick={() => {
                  const a = [...simAnswersRef.current]
                  a[simIdx] = i
                  simAnswersRef.current = a
                  setSimAnswers(a)
                }}
              >
                <span className="letter">{String.fromCharCode(65 + i)}</span>
                <span>{o.text}</span>
              </button>
            ))}
          </div>
          <div className="simnav">
            <button className="btn ghost-btn" disabled={simIdx === 0} onClick={() => setSimIdx(simIdx - 1)}>◀ Anterior</button>
            {simIdx + 1 < simItems.length ? (
              <button className="btn primary" onClick={() => setSimIdx(simIdx + 1)}>Siguiente ▶</button>
            ) : (
              <button
                className="btn primary"
                onClick={() => {
                  if (simAnswersRef.current.some((a) => a < 0) && !confirm('Quedan casos sin responder. ¿Entregar igual?')) return
                  finishSim()
                }}
              >
                Entregar ✅
              </button>
            )}
          </div>
        </main>
      </div>
    )
  }

  if (screen === 'simend' && simResult) {
    const r = simResult
    return (
      <div className="app center">
        <div className="card resultcard">
          <div className="bigicon">{r.score >= 80 ? '🏆' : r.score >= 60 ? '🥈' : '🧭'}</div>
          <h2>Resultado del simulacro</h2>
          <div className="scorebig"><b>{r.score}</b><span>/100</span></div>
          <p className="tiny">
            Sin responder: {simAnswers.filter((a) => a < 0).length} · Mejor marca: {Math.round(progress.simBest)}/100 · Intentos: {progress.simCount}
          </p>
          <p className="lead">
            {r.score >= 80
              ? 'Nivel avanzado sostenido. Así se ve una actuación que combina norma, pedagogía y trato digno.'
              : 'Revisa los casos por zona: los porcentajes más bajos indican dónde necesitas volver a estudiar la ruta.'}
          </p>
          <div className="zonesummary">
            {Object.entries(r.byZone).map(([z, v]) => (
              <div key={z} className="zrow">
                <span>{ZONES[z as ZoneId]?.icon} {ZONES[z as ZoneId]?.name}</span>
                <b>{v.ok}/{v.total}</b>
              </div>
            ))}
          </div>
          <button className="btn primary big" onClick={() => setScreen('map')}>Volver al mapa 🗺️</button>
          <button className="btn ghost-btn" onClick={startSim}>🔁 Otro simulacro</button>
        </div>
      </div>
    )
  }

  // MAP
  return (
    <div className="app">
      <header className="maphead">
        <div className="mh-top">
          <div>
            <div className="eyebrow">{ROLE_META[progress.role].icon} {ROLE_META[progress.role].title}</div>
            <h1>Día en el colegio</h1>
            <div className="sub">{progress.name} · {progress.zonesDone.length}/{route.length} zonas</div>
          </div>
          <div className="xpbadge"><b>{progress.xp}</b><span>XP</span></div>
        </div>
        <div className="meters">
          <Meter icon="🌡️" label="Clima" value={progress.climate} />
          <Meter icon="📚" label="Aprendizaje" value={progress.learning} />
          <Meter icon="🧭" label="Gestión" value={progress.management} />
        </div>
      </header>

      <main className="pane">
        <div className="maplegend">
          <span><i className="dot done" /> Completada</span>
          <span><i className="dot now" /> Ahora</span>
          <span><i className="dot locked" /> Bloqueada</span>
        </div>

        <div className="schoolmap">
          <div className="roof" />
          {route.map((z, idx) => {
            const zone = ZONES[z]
            const done = progress.zonesDone.includes(z)
            const isNext = next === z
            const locked = !done && !isNext
            const ans = progress.answers.filter((a) => a.zone === z)
            const best = ans.filter((a) => a.best).length
            return (
              <button
                key={z}
                className={`room ${done ? 'done' : ''} ${isNext ? 'now' : ''} ${locked ? 'locked' : ''}`}
                style={{ ['--zc' as any]: zone.color }}
                onClick={() => !locked && startZone(z)}
                disabled={locked}
              >
                <span className="roomnum">{idx + 1}</span>
                <span className="roomicon">{zone.icon}</span>
                <b>{zone.name}</b>
                <span className="roomdesc">{zone.desc}</span>
                <span className="roomstate">
                  {done ? `✅ ${best}/${ans.length} avanzadas` : isNext ? '▶ Entrar ahora' : '🔒 Bloqueada'}
                </span>
              </button>
            )
          })}
          <div className="yard" />
        </div>

        <div className="quickrow">
          <button className="quick" onClick={() => setScreen('dayend')} disabled={progress.answers.length === 0}><b>📋</b><span>Informe</span></button>
          <button className="quick" onClick={startSim}><b>🏁</b><span>Simulacro</span></button>
          <button
            className="quick"
            onClick={() => {
              if (confirm('¿Borrar el avance y empezar de nuevo?')) {
                resetProgress()
                setProgress(null)
                setScreen('onboard')
              }
            }}
          >
            <b>🔄</b><span>Reiniciar</span>
          </button>
        </div>

        <div className="footnote">
          <b>Cómo se juega:</b> avanzas zona por zona en el orden de tu ruta. Cada situación tiene cuatro actuaciones posibles
          (avanzada, satisfactoria, mínima e inferior). En el concurso de coordinador las opciones <b>no se marcan como
          correctas o incorrectas</b>: se clasifican por nivel de desempeño. Aquí recibes la explicación y el marco normativo.
          <br />
          <span className="tiny">Entrenamiento con casos originales basados en el Decreto 1278 de 2002, el Decreto 1075 de 2015 y los referentes del MEN. No reproduce pruebas oficiales reservadas.</span>
        </div>
      </main>
    </div>
  )
}

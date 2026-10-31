import type { Answer, CaseItem, Progress, Role, ZoneId } from './types'
import { LEVELS, ROUTES, ZONES } from './zones'

const KEY = 'colegio360_progress_v1'

export const EVIDENCE_BY_ZONE: Record<ZoneId, string> = {
  porteria: 'Acta de atención a familia',
  aula: 'Planeación con DUA',
  apoyo: 'PIAR diligenciado',
  psico: 'Ruta de atención activada',
  sala: 'Acta de trabajo colegiado',
  academica: 'Seguimiento académico',
  convivencia: 'Acta del comité de convivencia',
  rectoria: 'Decisión articulada al PMI',
  patio: 'Registro de mediación escolar',
  biblioteca: 'Secuencia de lectura crítica',
}

export function newProgress(name: string, role: Role): Progress {
  return {
    name: (name || '').trim() || 'Participante',
    role,
    day: 1,
    answers: [],
    climate: 60,
    learning: 60,
    management: 60,
    xp: 0,
    evidence: [],
    zonesDone: [],
    simBest: 0,
    simCount: 0,
  }
}

export function loadProgress(): Progress | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (!p || !Array.isArray(p.answers)) return null
    const role: Role = p.role === 'coordinador' ? 'coordinador' : 'docente'
    const route = ROUTES[role]
    const validZones = new Set<string>(route)
    const num = (v: any, fallback: number) => {
      const n = Number(v)
      return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : fallback
    }
    return {
      ...newProgress(typeof p.name === 'string' ? p.name : 'Participante', role),
      xp: Math.max(0, Number(p.xp) || 0),
      climate: num(p.climate, 60),
      learning: num(p.learning, 60),
      management: num(p.management, 60),
      evidence: Array.isArray(p.evidence) ? p.evidence.filter((e: any) => typeof e === 'string') : [],
      zonesDone: Array.isArray(p.zonesDone) ? p.zonesDone.filter((z: any) => validZones.has(z)) : [],
      answers: p.answers
        .filter((a: any) => a && typeof a.caseId === 'string' && validZones.has(a.zone) && a.level >= 0 && a.level <= 3)
        .map((a: any) => ({ ...a, level: Number(a.level), chosen: Number(a.chosen) || 0, best: Number(a.level) === 3 })),
      simBest: Math.max(0, Math.min(100, Number(p.simBest) || 0)),
      simCount: Math.max(0, Number(p.simCount) || 0),
    }
  } catch {
    return null
  }
}

export function saveProgress(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p))
  } catch {
    /* noop */
  }
}

export function resetProgress() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* noop */
  }
}

export function applyAnswer(p: Progress, item: CaseItem, chosen: number): Progress {
  const opt = item.options[chosen]
  if (!opt) return p
  const zone = ZONES[item.zone]
  const score = LEVELS[opt.level]?.score ?? 0
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))

  const contribution = (level: number) => {
    const d = ((LEVELS[level]?.score ?? 0) - 50) / 5
    return {
      climate: zone.primary === 'clima' ? d * 1.4 : d * 0.6,
      learning: zone.primary === 'aprendizaje' ? d * 1.4 : d * 0.6,
      management: zone.primary === 'gestion' ? d * 1.4 : d * 0.6,
    }
  }

  const prev = p.answers.find((a) => a.caseId === item.id)
  const before = contribution(prev ? prev.level : 1)
  const after = contribution(opt.level)
  const zero = { climate: 0, learning: 0, management: 0 }
  const b = prev ? before : zero

  const answer: Answer = {
    caseId: item.id,
    zone: item.zone,
    chosen,
    level: opt.level,
    best: opt.level === 3,
  }
  const answers = [...p.answers.filter((a) => a.caseId !== item.id), answer]
  // La evidencia se recalcula: solo cuenta si hay al menos una respuesta avanzada en la zona.
  const evidenceZones = new Set(answers.filter((a) => a.level === 3).map((a) => a.zone))
  const evidence = Object.values(ZONES)
    .filter((z) => evidenceZones.has(z.id))
    .map((z) => EVIDENCE_BY_ZONE[z.id])

  return {
    ...p,
    answers,
    climate: clamp(p.climate - b.climate + after.climate),
    learning: clamp(p.learning - b.learning + after.learning),
    management: clamp(p.management - b.management + after.management),
    xp: Math.max(0, p.xp - (prev ? LEVELS[prev.level]?.score ?? 0 : 0) + score),
    evidence,
  }
}

export function markZoneDone(p: Progress, zone: ZoneId): Progress {
  return p.zonesDone.includes(zone) ? p : { ...p, zonesDone: [...p.zonesDone, zone] }
}

export function dayScore(p: Progress): number {
  const graded = p.answers.filter((a) => a.level >= 0)
  if (!graded.length) return 0
  const sum = graded.reduce((acc, a) => acc + (LEVELS[a.level]?.score ?? 0), 0)
  return Math.round(sum / graded.length)
}

export function dayMedal(score: number) {
  if (score >= 85) return { icon: '🏆', title: 'Desempeño superior', msg: 'Tus decisiones sostienen el aprendizaje, el clima y la gestión. Ese es el nivel que busca un buen directivo docente.' }
  if (score >= 70) return { icon: '🥇', title: 'Buen desempeño', msg: 'Vas bien encaminado. Revisa los casos donde elegiste mínimo: ahí suele estar el punto de mejora.' }
  if (score >= 50) return { icon: '🥈', title: 'En camino', msg: 'Tienes criterio, pero algunas decisiones evitan el problema en lugar de resolverlo. Vuelve a las rutas y a la norma.' }
  return { icon: '🧭', title: 'Necesitas recalibrar', msg: 'Varias decisiones dejaron cabos sueltos. Repite el día: la diferencia está en actuar con ruta, evidencia y debido proceso.' }
}

export function nextZone(p: Progress): ZoneId | null {
  const route = ROUTES[p.role]
  return route.find((z) => !p.zonesDone.includes(z)) ?? null
}

export function zoneCases(all: CaseItem[], role: Role, zone: ZoneId): CaseItem[] {
  return all.filter((c) => c.zone === zone)
}

export function pickSim(all: CaseItem[], role: Role, n = 30): CaseItem[] {
  const pool = all.filter((c) => (c as any).role === role)
  const a = [...pool]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, Math.min(n, a.length))
}

export function gradeSim(items: CaseItem[], answers: number[]): { score: number; byZone: Record<string, { ok: number; total: number }> } {
  let sum = 0
  const byZone: Record<string, { ok: number; total: number }> = {}
  items.forEach((item, i) => {
    const opt = item.options[answers[i]]
    const score = opt ? LEVELS[opt.level]?.score ?? 0 : 0
    sum += score
    const b = (byZone[item.zone] ??= { ok: 0, total: 0 })
    b.total++
    if (opt?.level === 3) b.ok++
  })
  return { score: Math.round(sum / Math.max(1, items.length)), byZone }
}

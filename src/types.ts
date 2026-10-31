export type Role = 'docente' | 'coordinador'

export type ZoneId =
  | 'porteria'
  | 'aula'
  | 'apoyo'
  | 'psico'
  | 'sala'
  | 'academica'
  | 'convivencia'
  | 'rectoria'
  | 'patio'
  | 'biblioteca'

export interface Option {
  text: string
  level: 0 | 1 | 2 | 3
}

export interface CaseItem {
  id: string
  zone: ZoneId
  moment: string
  scene: string
  prompt: string
  options: Option[]
  why: string
  source: string
}

export interface Zone {
  id: ZoneId
  name: string
  icon: string
  desc: string
  color: string
  primary: 'clima' | 'aprendizaje' | 'gestion'
}

export interface Answer {
  caseId: string
  zone: ZoneId
  chosen: number
  level: number
  best: boolean
}

export interface Progress {
  name: string
  role: Role
  day: number
  answers: Answer[]
  climate: number
  learning: number
  management: number
  xp: number
  evidence: string[]
  zonesDone: ZoneId[]
  completedAt?: number
  simBest: number
  simCount: number
}

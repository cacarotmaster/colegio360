import type { Role, Zone, ZoneId } from './types'

export const ZONES: Record<ZoneId, Zone> = {
  porteria: {
    id: 'porteria', name: 'Portería', icon: '🚪', color: '#f59e0b', primary: 'clima',
    desc: 'La primera cara del colegio: familias, estudiantes y rutinas de entrada.',
  },
  aula: {
    id: 'aula', name: 'Aula de clase', icon: '🏫', color: '#3b82f6', primary: 'aprendizaje',
    desc: 'Planeación, didáctica, evaluación y clima de aula.',
  },
  apoyo: {
    id: 'apoyo', name: 'Aula de apoyo', icon: '🧩', color: '#14b8a6', primary: 'aprendizaje',
    desc: 'Inclusión, PIAR, ajustes razonables y trabajo con familias.',
  },
  psico: {
    id: 'psico', name: 'Psicoorientación', icon: '🧠', color: '#a855f7', primary: 'clima',
    desc: 'Bienestar, riesgos psicosociales, confidencialidad y rutas de atención.',
  },
  sala: {
    id: 'sala', name: 'Sala de profesores', icon: '☕', color: '#f97316', primary: 'gestion',
    desc: 'Trabajo colegiado, clima laboral y desarrollo profesional.',
  },
  academica: {
    id: 'academica', name: 'Coordinación académica', icon: '📚', color: '#6366f1', primary: 'aprendizaje',
    desc: 'Currículo, SIEE, seguimiento académico y articulación del PEI.',
  },
  convivencia: {
    id: 'convivencia', name: 'Coordinación de convivencia', icon: '🤝', color: '#ec4899', primary: 'clima',
    desc: 'Ley 1620, rutas de atención, comité escolar y resolución de conflictos.',
  },
  rectoria: {
    id: 'rectoria', name: 'Rectoría', icon: '🏛️', color: '#eab308', primary: 'gestion',
    desc: 'Gobierno escolar, PMI, articulación institucional y toma de decisiones.',
  },
  patio: {
    id: 'patio', name: 'Patio y recreo', icon: '🏟️', color: '#22c55e', primary: 'clima',
    desc: 'Supervisión, juego, conflictos y convivencia en espacios abiertos.',
  },
  biblioteca: {
    id: 'biblioteca', name: 'Biblioteca', icon: '📖', color: '#0ea5e9', primary: 'aprendizaje',
    desc: 'Lectura crítica, investigación escolar y recursos educativos.',
  },
}

export const ROUTES: Record<Role, ZoneId[]> = {
  docente: ['porteria', 'aula', 'apoyo', 'psico', 'sala', 'academica', 'patio', 'biblioteca'],
  coordinador: ['porteria', 'academica', 'convivencia', 'rectoria', 'aula', 'apoyo', 'psico', 'patio'],
}

export const ROLE_META: Record<Role, { title: string; icon: string; tagline: string; desc: string }> = {
  docente: {
    title: 'Docente de aula',
    icon: '👩‍🏫',
    tagline: 'Enseñar, cuidar y decidir en el día a día',
    desc: 'Tu ruta pasa por el aula, el apoyo, la orientación y la vida institucional. Cada decisión deja huella en el aprendizaje y el clima.',
  },
  coordinador: {
    title: 'Coordinador',
    icon: '🧑‍💼',
    tagline: 'Liderar sin perder el aula de vista',
    desc: 'Tu ruta cruza la gestión académica, la convivencia, la rectoría y el aula. Decides sobre procesos, personas y conflictos.',
  },
}

export const LEVELS = [
  { name: 'Inferior', score: 0, icon: '🔴', color: '#ef4444' },
  { name: 'Mínimo', score: 40, icon: '🟠', color: '#f97316' },
  { name: 'Satisfactorio', score: 75, icon: '🟡', color: '#eab308' },
  { name: 'Avanzado', score: 100, icon: '🟢', color: '#10b981' },
]

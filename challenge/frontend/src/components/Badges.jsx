export function StatusBadge({ status }) {
  const map = {
    available:   ['badge-green',  'Disponible'],
    reserved:    ['badge-yellow', 'Reservado'],
    sold:        ['badge-gray',   'Vendido'],
    active:      ['badge-green',  'Activo'],
    inactive:    ['badge-gray',   'Inactivo'],
    closed:      ['badge-blue',   'Cerrado'],
    interested:  ['badge-blue',   'Interesado'],
    visiting:    ['badge-purple', 'Visita'],
    negotiating: ['badge-yellow', 'Negociando'],
    closed_won:  ['badge-green',  'Ganado'],
    closed_lost: ['badge-red',    'Perdido'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function TypeBadge({ type }) {
  const map = {
    apartment:  'Apartamento',
    house:      'Casa',
    office:     'Oficina',
    land:       'Terreno',
    commercial: 'Local',
    buyer:      'Comprador',
    seller:     'Vendedor',
    both:       'Ambos',
  };
  return <span className="badge badge-gray">{map[type] || type}</span>;
}

export function PriorityBadge({ priority }) {
  const map = {
    high:   ['badge-red',    '↑ Alta'],
    medium: ['badge-yellow', '→ Media'],
    low:    ['badge-gray',   '↓ Baja'],
  };
  const [cls, label] = map[priority] || ['badge-gray', priority];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ScoreBadge({ score }) {
  const cls = score >= 70 ? 'badge-green' : score >= 40 ? 'badge-yellow' : 'badge-gray';
  return <span className={`badge ${cls}`}>{score}%</span>;
}
